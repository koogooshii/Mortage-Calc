

import { Component, ChangeDetectionStrategy, signal, computed, inject, viewChild, effect } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, CommonModule } from '@angular/common';

import { MortgageCalculatorComponent, ScenarioState } from '../mortgage-calculator/mortgage-calculator.component';
import { MortgageSummary, RecurringPayment } from '../../models/mortgage.model';
import { PdfExportService } from '../../services/pdf-export.service';
import { ScenarioPersistenceService } from '../../services/scenario-persistence.service';

@Component({
  selector: 'app-refinance-calculator',
  standalone: true,
  imports: [MortgageCalculatorComponent, ReactiveFormsModule, CurrencyPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './refinance-calculator.component.html',
})
export class RefinanceCalculatorComponent {
  private pdfExportService = inject(PdfExportService);
  private scenarioService = inject(ScenarioPersistenceService);
  private fb = inject(FormBuilder);

  currentLoanCalculator = viewChild.required<MortgageCalculatorComponent>('currentLoanCalculator');
  newLoanCalculator = viewChild.required<MortgageCalculatorComponent>('newLoanCalculator');
  
  // State management for child components
  currentLoanState = signal<ScenarioState>(this.scenarioService.getDefaultScenario());
  newLoanState = signal<ScenarioState>(this.scenarioService.getDefaultScenario());
  
  currentLoanSummary = signal<MortgageSummary | null>(null);
  newLoanSummary = signal<MortgageSummary | null>(null);

  closingCostsControl = new FormControl(5000);
  private initialClosingCosts = signal(5000); // User-entered value

  showVisuals = signal(false);
  showPenaltyCalc = signal(false);

  // --- Penalty Calculation ---
  penaltyForm = this.fb.group({
    currentBalance: [0, [Validators.required, Validators.min(0)]],
    currentRate: [0, [Validators.required, Validators.min(0)]],
    remainingMonths: [0, [Validators.required, Validators.min(1)]],
    postedRate: [0, [Validators.required, Validators.min(0)]],
  });

  private penaltyFormValues = toSignal(this.penaltyForm.valueChanges, {
    initialValue: this.penaltyForm.getRawValue(),
  });

  threeMonthPenalty = computed(() => {
    const { currentBalance, currentRate } = this.penaltyFormValues();
    if (!currentBalance || !currentRate || currentRate <= 0) return 0;
    return (currentBalance * (currentRate / 100)) / 4;
  });

  irdPenalty = computed(() => {
    const { currentBalance, currentRate, remainingMonths, postedRate } = this.penaltyFormValues();
    if (!currentBalance || !currentRate || !remainingMonths || !postedRate) return 0;
    const rateDifference = (currentRate - postedRate) / 100;
    if (rateDifference <= 0) return 0;
    const remainingYears = (remainingMonths ?? 0) / 12;
    return (currentBalance ?? 0) * rateDifference * remainingYears;
  });

  finalPenalty = computed(() => {
    if (!this.penaltyForm.valid || !this.showPenaltyCalc()) return 0;
    return Math.max(this.threeMonthPenalty(), this.irdPenalty());
  });
  // --- End Penalty Calculation ---
  
  constructor() {
     // When user types in closing costs, save it as the initial value
    this.closingCostsControl.valueChanges.subscribe(value => {
      this.initialClosingCosts.set(value ?? 0);
    });

    // Automatically add calculated penalty to the closing costs
    effect(() => {
      const penalty = this.finalPenalty();
      const initialCosts = this.initialClosingCosts();
      this.closingCostsControl.setValue(initialCosts + penalty, { emitEvent: false });
    }, { allowSignalWrites: true });
    
     // Sync current loan balance to penalty calculator
    effect(() => {
      const currentLoanAmount = this.currentLoanState().formValues.loanAmount;
      const currentRate = this.currentLoanState().formValues.interestRate;
      this.penaltyForm.patchValue({
          currentBalance: currentLoanAmount,
          currentRate: currentRate
      }, { emitEvent: false });
    });
  }

  monthlySavings = computed(() => {
    const currentPITI = this.currentLoanSummary()?.totalMonthlyPITIEquivalent ?? 0;
    const newPITI = this.newLoanSummary()?.totalMonthlyPITIEquivalent ?? 0;
    if (currentPITI <= 0 || newPITI <= 0) return 0;
    return currentPITI - newPITI;
  });

  breakevenMonths = computed(() => {
    const costs = this.closingCostsControl.value ?? 0;
    const savings = this.monthlySavings();
    if (costs <= 0 || savings <= 0) return 0;
    return costs / savings;
  });

  totalInterestSavings = computed(() => {
    const currentInterest = this.currentLoanSummary()?.totalInterest ?? 0;
    const newInterest = this.newLoanSummary()?.totalInterest ?? 0;
    const penalty = this.finalPenalty();
    if (currentInterest <= 0 || newInterest <= 0) return 0;
    // Net savings is interest saved minus the penalty cost
    return currentInterest - (newInterest + penalty);
  });

  private formatAmortization(formValues: any): string {
    if (!formValues) return '--';
    const years = formValues.loanTerm ?? 0;
    const months = formValues.loanTermMonths ?? 0;
    if (years === 0 && months === 0) return '--';
    let result = '';
    if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
    if (months > 0) { if (result) result += ', '; result += `${months} month${months > 1 ? 's' : ''}`; }
    return result;
  }

  private getPaymentFrequencyLabel(freq: string | undefined): string {
    if (!freq) return '--';
    switch (freq) {
      case 'weekly': return 'Weekly';
      case 'accelerated-weekly': return 'Accelerated Weekly';
      case 'bi-weekly': return 'Bi-Weekly';
      case 'accelerated-bi-weekly': return 'Accelerated Bi-Weekly';
      default: return 'Monthly';
    }
  };

  currentLoanAmortization = computed(() => this.formatAmortization(this.currentLoanState().formValues));
  newLoanAmortization = computed(() => this.formatAmortization(this.newLoanState().formValues));
  currentLoanTerm = computed(() => `${this.currentLoanState().formValues.termInYears} years`);
  newLoanTerm = computed(() => `${this.newLoanState().formValues.termInYears} years`);

  currentPeriodicPayment = computed(() => this.currentLoanSummary()?.totalPeriodicPITI ?? 0);
  newPeriodicPayment = computed(() => this.newLoanSummary()?.totalPeriodicPITI ?? 0);

  currentPaymentFrequencyLabel = computed(() => this.getPaymentFrequencyLabel(this.currentLoanState().formValues.paymentFrequency));
  newPaymentFrequencyLabel = computed(() => this.getPaymentFrequencyLabel(this.newLoanState().formValues.paymentFrequency));

  updateCurrentLoanSummary(data: { summary: MortgageSummary | null; }): void {
    this.currentLoanSummary.set(data.summary);
  }

  updateNewLoanSummary(data: { summary: MortgageSummary | null; }): void {
    this.newLoanSummary.set(data.summary);
  }

  async saveAsPdf(): Promise<void> {
    const currentSummary = this.currentLoanSummary();
    const newSummary = this.newLoanSummary();
    if (!currentSummary || !newSummary) return;

    const wereVisualsHidden = !this.showVisuals();
    if (wereVisualsHidden) { this.showVisuals.set(true); await new Promise(r => setTimeout(r, 50)); }
    const currentCharts = this.currentLoanCalculator().getChartImages();
    const newCharts = this.newLoanCalculator().getChartImages();
    if (wereVisualsHidden) { this.showVisuals.set(false); }

    this.pdfExportService.exportRefinanceAsPdf(
      { params: this.currentLoanState().formValues, summary: currentSummary, schedule: this.currentLoanCalculator().displaySchedule(), charts: currentCharts },
      { params: this.newLoanState().formValues, summary: newSummary, schedule: this.newLoanCalculator().displaySchedule(), charts: newCharts },
      { monthlySavings: this.monthlySavings(), breakevenMonths: this.breakevenMonths(), totalInterestSavings: this.totalInterestSavings(), closingCosts: this.closingCostsControl.value ?? 0 }
    );
  }
}
