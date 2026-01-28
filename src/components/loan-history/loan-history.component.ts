
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, AbstractControl } from '@angular/forms';
import { CommonModule, CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { LoanHistoryChartComponent } from '../loan-history-chart/loan-history-chart.component';
import { AmortizationTableComponent } from '../amortization-table/amortization-table.component';
import { LoanHistoryPersistenceService } from '../../services/loan-history-persistence.service';
import {
  AmortizationEntry, LoanEvent, LoanHistorySegment, LoanEventType, PaymentFrequency,
  RefinanceDetails, RenewalDetails, LumpSumDetails, MissedPaymentDetails
} from '../../models/mortgage.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-loan-history',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, CurrencyPipe, DatePipe, TitleCasePipe, LoanHistoryChartComponent, AmortizationTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loan-history.component.html',
})
export class LoanHistoryComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  private pdfExportService = inject(PdfExportService);
  private persistenceService = inject(LoanHistoryPersistenceService);

  historyChart = viewChild(LoanHistoryChartComponent);
  
  originalLoanForm = this.fb.group({
    purchasePrice: [350000, Validators.required],
    downPayment: [70000, Validators.required],
    interestRate: [3.5, Validators.required],
    amortizationPeriod: [25, Validators.required],
    term: [5, Validators.required],
    paymentFrequency: ['monthly' as PaymentFrequency, Validators.required],
    startDate: ['2018-06-01', Validators.required],
  });

  events = signal<LoanEvent[]>([]);
  editingEvent = signal<Partial<LoanEvent> | null>(null);
  eventForm!: FormGroup;

  loanSegments = signal<LoanHistorySegment[]>([]);
  summary = signal<{ originalPayoffDate: Date | null; actualPayoffDate: Date | null; originalTotalInterest: number; actualTotalInterest: number; } | null>(null);
  originalSchedule = signal<AmortizationEntry[]>([]);
  actualSchedule = signal<AmortizationEntry[]>([]);
  
  public eventColorMap: { [key in LoanEventType]: string } = {
    refinance: 'blue', renewal: 'orange', lumpSum: 'green', missedPayment: 'yellow',
  };

  constructor() {
    this.loadState();
    
    // Recalculate on any data change
    effect(() => {
      this.events(); // depend on events
      this.recalculateHistory();
    });

    // Save state on any data change
    this.originalLoanForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      this.recalculateHistory();
      this.saveState();
    });

    effect(() => {
        this.events();
        this.saveState();
    });
  }

  private loadState() {
    const state = this.persistenceService.loadState();
    if (state) {
      this.originalLoanForm.patchValue(state.form, { emitEvent: false });
      this.events.set(state.events);
    }
    this.recalculateHistory(); // Always run initial calculation
  }

  private saveState() {
    if (this.originalLoanForm.valid) {
      this.persistenceService.saveState({
        form: this.originalLoanForm.getRawValue() as any,
        events: this.events()
      });
    }
  }

  recalculateHistory() {
    if (this.originalLoanForm.invalid) {
      this.loanSegments.set([]);
      this.summary.set(null);
      this.originalSchedule.set([]);
      this.actualSchedule.set([]);
      return;
    }
    const { segments, schedule, summary, originalSchedule } = this.mortgageService.calculateLoanHistory(
      this.originalLoanForm.getRawValue() as any,
      this.events()
    );
    this.loanSegments.set(segments);
    this.summary.set(summary);
    this.originalSchedule.set(originalSchedule);
    this.actualSchedule.set(schedule);
  }

  openEventModal(type: LoanEventType) {
    const newEvent: Partial<LoanEvent> = { type };
    this.buildEventForm(newEvent);
    this.editingEvent.set(newEvent);
  }

  editEvent(event: LoanEvent) {
    this.buildEventForm(event);
    this.editingEvent.set(event);
  }
  
  saveEvent() {
    if (!this.eventForm.valid || !this.editingEvent()) return;
    const currentEvent = this.editingEvent()!;
    const formValues = this.eventForm.getRawValue();

    const eventToSave: LoanEvent = { id: currentEvent.id || Math.random().toString(36).substring(2, 9), date: formValues.date, type: currentEvent.type!, details: {} };

    switch(currentEvent.type) {
      case 'refinance': eventToSave.details = { newInterestRate: formValues.newInterestRate, newLoanTerm: formValues.newLoanTerm, cashOutAmount: formValues.cashOutAmount, closingCosts: formValues.closingCosts, newPaymentFrequency: formValues.paymentFrequency } as RefinanceDetails; break;
      case 'renewal': eventToSave.details = { newInterestRate: formValues.renewalInterestRate, newTerm: formValues.renewalTerm, newPaymentFrequency: formValues.paymentFrequency } as RenewalDetails; break;
      case 'lumpSum': eventToSave.details = { amount: formValues.lumpSumAmount } as LumpSumDetails; break;
      case 'missedPayment': eventToSave.details = {} as MissedPaymentDetails; break;
    }

    if (currentEvent.id) {
        this.events.update(e => e.map(ev => ev.id === currentEvent.id ? eventToSave : ev));
    } else {
        this.events.update(e => [...e, eventToSave]);
    }
    this.editingEvent.set(null);
  }

  deleteEvent(id: string) { this.events.update(e => e.filter(ev => ev.id !== id)); }

  private buildEventForm(event: Partial<LoanEvent>) {
    const controls: { [key: string]: AbstractControl } = { date: this.fb.control(event.date || new Date().toISOString().split('T')[0], Validators.required) };
    const details = event.details as any;
    switch (event.type) {
      case 'refinance':
        controls['newInterestRate'] = this.fb.control(details?.newInterestRate ?? 3.0, Validators.required);
        controls['newLoanTerm'] = this.fb.control(details?.newLoanTerm ?? 25, Validators.required);
        controls['cashOutAmount'] = this.fb.control(details?.cashOutAmount ?? 0);
        controls['closingCosts'] = this.fb.control(details?.closingCosts ?? 0);
        controls['paymentFrequency'] = this.fb.control(details?.newPaymentFrequency ?? this.originalLoanForm.value.paymentFrequency);
        break;
      case 'renewal':
        controls['renewalInterestRate'] = this.fb.control(details?.newInterestRate ?? 3.2, Validators.required);
        controls['renewalTerm'] = this.fb.control(details?.newTerm ?? 5, Validators.required);
        controls['paymentFrequency'] = this.fb.control(details?.newPaymentFrequency ?? this.originalLoanForm.value.paymentFrequency);
        break;
      case 'lumpSum':
        controls['lumpSumAmount'] = this.fb.control(details?.amount ?? 5000, [Validators.required, Validators.min(0.01)]);
        break;
    }
    this.eventForm = this.fb.group(controls);
  }

  onAdHocPaymentChange({ paymentNumber, amount }: { paymentNumber: number; amount: number }) { console.warn("Ad-hoc payments on the history page are not persisted or used in calculations."); }
  public getRefinanceDetails(details: any): RefinanceDetails { return details; }
  public getRenewalDetails(details: any): RenewalDetails { return details; }
  public getLumpSumDetails(details: any): LumpSumDetails { return details; }

  exportAsCsv() { /* ... existing implementation ... */ }
  saveAsPdf() {
    const summary = this.summary();
    if (!summary || this.originalLoanForm.invalid) return;
    this.pdfExportService.exportLoanHistoryAsPdf(
      this.originalLoanForm.getRawValue(), summary, this.loanSegments(), this.actualSchedule(), this.historyChart()?.getBase64Image() ?? null
    );
  }
}
