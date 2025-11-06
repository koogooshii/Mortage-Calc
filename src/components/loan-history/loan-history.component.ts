import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, AbstractControl } from '@angular/forms';
import { CommonModule, CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { LoanHistoryChartComponent } from '../loan-history-chart/loan-history-chart.component';
import { AmortizationTableComponent } from '../amortization-table/amortization-table.component';
import {
  AmortizationEntry,
  LoanEvent,
  LoanHistorySegment,
  LoanEventType,
  PaymentFrequency,
  RefinanceDetails,
  RenewalDetails,
  LumpSumDetails,
  MissedPaymentDetails
} from '../../models/mortgage.model';

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

  adHocPayments = signal<{ [paymentNumber: number]: number }>({});

  loanSegments = signal<LoanHistorySegment[]>([]);
  summary = signal<{ originalPayoffDate: Date | null; actualPayoffDate: Date | null; originalTotalInterest: number; actualTotalInterest: number; } | null>(null);
  originalSchedule = signal<AmortizationEntry[]>([]);
  actualSchedule = signal<AmortizationEntry[]>([]);
  
  public eventColorMap: { [key in LoanEventType]: string } = {
    refinance: 'blue',
    renewal: 'orange',
    lumpSum: 'green',
    missedPayment: 'yellow',
  };

  constructor() {
    effect(() => {
      this.originalLoanForm.value; // Depend on form changes
      this.events(); // Depend on events list
      this.adHocPayments(); // Depend on ad-hoc changes
      this.recalculateHistory();
    }, { allowSignalWrites: true });

    this.recalculateHistory(); // Initial calculation
  }

  recalculateHistory() {
    if (this.originalLoanForm.invalid) {
      this.loanSegments.set([]);
      this.summary.set(null);
      this.originalSchedule.set([]);
      this.actualSchedule.set([]);
      return;
    }
    
    const formValues = this.originalLoanForm.getRawValue();
    
    // Note: The mortgage service does not currently support ad-hoc payments for historical calculations.
    // This feature is available on the main calculator but not here.
    const { segments, schedule, summary, originalSchedule } = this.mortgageService.calculateLoanHistory(
      formValues as any,
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

    const eventToSave: LoanEvent = {
        id: currentEvent.id || Math.random().toString(36).substring(2, 9),
        date: formValues.date,
        type: currentEvent.type!,
        details: {}
    };

    switch(currentEvent.type) {
      case 'refinance': 
        eventToSave.details = { 
          newInterestRate: formValues.newInterestRate,
          newLoanTerm: formValues.newLoanTerm,
          cashOutAmount: formValues.cashOutAmount,
          closingCosts: formValues.closingCosts,
          newPaymentFrequency: formValues.paymentFrequency
        } as RefinanceDetails;
        break;
      case 'renewal':
        eventToSave.details = {
          newInterestRate: formValues.renewalInterestRate,
          newTerm: formValues.renewalTerm,
          newPaymentFrequency: formValues.paymentFrequency
        } as RenewalDetails;
        break;
      case 'lumpSum':
        eventToSave.details = { amount: formValues.lumpSumAmount } as LumpSumDetails;
        break;
      case 'missedPayment':
        eventToSave.details = {} as MissedPaymentDetails;
        break;
    }

    if (currentEvent.id) {
        this.events.update(events => events.map(e => e.id === currentEvent.id ? eventToSave : e));
    } else {
        this.events.update(events => [...events, eventToSave]);
    }

    this.editingEvent.set(null);
  }

  deleteEvent(id: string) {
      this.events.update(events => events.filter(e => e.id !== id));
  }

  private buildEventForm(event: Partial<LoanEvent>) {
    const controls: { [key: string]: AbstractControl } = {
      date: this.fb.control(event.date || new Date().toISOString().split('T')[0], Validators.required)
    };

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

  onAdHocPaymentChange({ paymentNumber, amount }: { paymentNumber: number; amount: number }) {
    console.warn("Ad-hoc payments on the history page are for viewing only and do not trigger a recalculation due to service limitations.");
    this.adHocPayments.update(payments => {
      const newPayments = { ...payments };
      if (amount > 0) {
        newPayments[paymentNumber] = amount;
      } else {
        delete newPayments[paymentNumber];
      }
      return newPayments;
    });
  }

  public getRefinanceDetails(details: any): RefinanceDetails { return details; }
  public getRenewalDetails(details: any): RenewalDetails { return details; }
  public getLumpSumDetails(details: any): LumpSumDetails { return details; }

  exportAsCsv() {
    const schedule = this.actualSchedule();
    if (schedule.length === 0) return;
    const headers = ['#', 'Date', 'Payment', 'Extra', 'Principal', 'Interest', 'Balance'];
    const csvRows = [headers.join(',')];
    schedule.forEach(entry => {
      const row = [
        entry.paymentNumber,
        entry.paymentDate.toISOString().split('T')[0],
        entry.payment.toFixed(2),
        (entry.scheduledExtraPayment + entry.adHocPayment).toFixed(2),
        entry.principal.toFixed(2),
        entry.interest.toFixed(2),
        entry.remainingBalance.toFixed(2)
      ];
      csvRows.push(row.join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'loan-history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  saveAsPdf() {
    const summary = this.summary();
    const formValues = this.originalLoanForm.getRawValue();
    if (!summary || this.originalLoanForm.invalid) return;

    const chartImage = this.historyChart()?.getBase64Image() ?? null;

    this.pdfExportService.exportLoanHistoryAsPdf(
      formValues,
      summary,
      this.loanSegments(),
      this.actualSchedule(),
      chartImage
    );
  }
}
