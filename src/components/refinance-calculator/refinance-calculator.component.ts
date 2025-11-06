import { Component, ChangeDetectionStrategy, signal, computed, inject, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, CommonModule } from '@angular/common';

import { MortgageCalculatorComponent } from '../mortgage-calculator/mortgage-calculator.component';
import { MortgageSummary, RecurringPayment } from '../../models/mortgage.model';
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-refinance-calculator',
  standalone: true,
  imports: [MortgageCalculatorComponent, ReactiveFormsModule, CurrencyPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './refinance-calculator.component.html',
})
export class RefinanceCalculatorComponent {
  private pdfExportService = inject(PdfExportService);

  currentLoanCalculator = viewChild.required<MortgageCalculatorComponent>('currentLoanCalculator');
  newLoanCalculator = viewChild.required<MortgageCalculatorComponent>('newLoanCalculator');
  
  currentLoanSummary = signal<MortgageSummary | null>(null);
  newLoanSummary = signal<MortgageSummary | null>(null);
  currentLoanFormValues = signal<any | null>(null);
  newLoanFormValues = signal<any | null>(null);
  currentLoanExtraPayments = signal<{ extraMonthly: number, recurring: RecurringPayment[] }>({ extraMonthly: 0, recurring: [] });
  newLoanExtraPayments = signal<{ extraMonthly: number, recurring: RecurringPayment[] }>({ extraMonthly: 0, recurring: [] });

  closingCostsControl = new FormControl(5000);
  closingCosts = toSignal(this.closingCostsControl.valueChanges, { initialValue: 5000 });

  showVisuals = signal(false);

  monthlySavings = computed(() => {
    const currentPITI = this.currentLoanSummary()?.totalMonthlyPITIEquivalent ?? 0;
    const newPITI = this.newLoanSummary()?.totalMonthlyPITIEquivalent ?? 0;
    if (currentPITI <= 0 || newPITI <= 0) return 0;
    return currentPITI - newPITI;
  });

  breakevenMonths = computed(() => {
    const costs = this.closingCosts() ?? 0;
    const savings = this.monthlySavings();
    if (costs <= 0 || savings <= 0) return 0;
    return costs / savings;
  });

  totalInterestSavings = computed(() => {
    const currentInterest = this.currentLoanSummary()?.totalInterest ?? 0;
    const newInterest = this.newLoanSummary()?.totalInterest ?? 0;
    if (currentInterest <= 0 || newInterest <= 0) return 0;
    return currentInterest - newInterest;
  });

  private formatAmortization(formValues: any): string {
    if (!formValues) return '--';
    const years = formValues.loanTerm ?? 0;
    const months = formValues.loanTermMonths ?? 0;
    if (years === 0 && months === 0) return '--';
    
    let result = '';
    if (years > 0) {
      result += `${years} year${years > 1 ? 's' : ''}`;
    }
    if (months > 0) {
      if (result) result += ', ';
      result += `${months} month${months > 1 ? 's' : ''}`;
    }
    return result;
  }

  private getPaymentFrequencyLabel(freq: string | undefined): string {
    if (!freq) return '--';
    switch (freq) {
      case 'weekly': return 'Weekly';
      case 'accelerated-weekly': return 'Accelerated Weekly';
      case 'bi-weekly': return 'Bi-Weekly';
      case 'accelerated-bi-weekly': return 'Accelerated Bi-Weekly';
      case 'monthly':
      default:
        return 'Monthly';
    }
  };

  private calculatePeriodicExtraPayment(
    extraMonthly: number,
    recurring: RecurringPayment[],
    paymentFrequency: string
  ): number {
    if (!paymentFrequency) return 0;
    
    let totalAnnualExtra = extraMonthly * 12;

    recurring.forEach(p => {
      switch (p.frequency) {
        case 'weekly':
        case 'accelerated-weekly':
          totalAnnualExtra += p.amount * 52;
          break;
        case 'bi-weekly':
        case 'accelerated-bi-weekly':
          totalAnnualExtra += p.amount * 26;
          break;
        case 'monthly':
          totalAnnualExtra += p.amount * 12;
          break;
        case 'quarterly':
          totalAnnualExtra += p.amount * 4;
          break;
        case 'semi-annually':
          totalAnnualExtra += p.amount * 2;
          break;
        case 'annually':
          totalAnnualExtra += p.amount;
          break;
      }
    });

    if (totalAnnualExtra === 0) return 0;

    switch (paymentFrequency) {
      case 'weekly':
      case 'accelerated-weekly':
        return totalAnnualExtra / 52;
      case 'bi-weekly':
      case 'accelerated-bi-weekly':
        return totalAnnualExtra / 26;
      case 'monthly':
      default:
        return totalAnnualExtra / 12;
    }
  }

  currentLoanAmortization = computed(() => this.formatAmortization(this.currentLoanFormValues()));
  newLoanAmortization = computed(() => this.formatAmortization(this.newLoanFormValues()));
  
  currentLoanTerm = computed(() => {
      const term = this.currentLoanFormValues()?.termInYears;
      return term ? `${term} year${term > 1 ? 's' : ''}` : '--';
  });

  newLoanTerm = computed(() => {
      const term = this.newLoanFormValues()?.termInYears;
      return term ? `${term} year${term > 1 ? 's' : ''}` : '--';
  });
  
  currentPeriodicPayment = computed(() => {
    const basePayment = this.currentLoanSummary()?.totalPeriodicPITI ?? 0;
    const extraPayments = this.calculatePeriodicExtraPayment(
      this.currentLoanExtraPayments().extraMonthly,
      this.currentLoanExtraPayments().recurring,
      this.currentLoanFormValues()?.paymentFrequency
    );
    return basePayment + extraPayments;
  });

  newPeriodicPayment = computed(() => {
    const basePayment = this.newLoanSummary()?.totalPeriodicPITI ?? 0;
    const extraPayments = this.calculatePeriodicExtraPayment(
      this.newLoanExtraPayments().extraMonthly,
      this.newLoanExtraPayments().recurring,
      this.newLoanFormValues()?.paymentFrequency
    );
    return basePayment + extraPayments;
  });

  currentPaymentFrequencyLabel = computed(() => this.getPaymentFrequencyLabel(this.currentLoanFormValues()?.paymentFrequency));
  newPaymentFrequencyLabel = computed(() => this.getPaymentFrequencyLabel(this.newLoanFormValues()?.paymentFrequency));

  updateCurrentLoan(data: { 
    summary: MortgageSummary | null; 
    formValues: any; 
    extraMonthlyPayment: number; 
    recurringPayments: RecurringPayment[] 
  }): void {
    this.currentLoanSummary.set(data.summary);
    this.currentLoanFormValues.set(data.formValues);
    this.currentLoanExtraPayments.set({ extraMonthly: data.extraMonthlyPayment, recurring: data.recurringPayments });
  }

  updateNewLoan(data: { 
    summary: MortgageSummary | null; 
    formValues: any;
    extraMonthlyPayment: number;
    recurringPayments: RecurringPayment[];
  }): void {
    this.newLoanSummary.set(data.summary);
    this.newLoanFormValues.set(data.formValues);
    this.newLoanExtraPayments.set({ extraMonthly: data.extraMonthlyPayment, recurring: data.recurringPayments });
  }

  async saveAsPdf(): Promise<void> {
    const currentCalc = this.currentLoanCalculator();
    const newCalc = this.newLoanCalculator();
    const currentSummary = this.currentLoanSummary();
    const newSummary = this.newLoanSummary();

    if (!currentSummary || !newSummary || !this.currentLoanFormValues() || !this.newLoanFormValues()) {
      console.error("Missing data for PDF export");
      return;
    }

    const refinanceAnalysis = {
      monthlySavings: this.monthlySavings(),
      breakevenMonths: this.breakevenMonths(),
      totalInterestSavings: this.totalInterestSavings(),
      closingCosts: this.closingCosts() ?? 0,
    };

    const wereVisualsHidden = !this.showVisuals();
    if (wereVisualsHidden) {
      this.showVisuals.set(true);
      // Wait for change detection and rendering of child components
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const currentCharts = currentCalc.getChartImages();
    const newCharts = newCalc.getChartImages();
    
    // Revert UI state if we changed it
    if (wereVisualsHidden) {
      this.showVisuals.set(false);
    }

    this.pdfExportService.exportRefinanceAsPdf(
      {
        params: this.currentLoanFormValues(),
        summary: currentSummary,
        schedule: currentCalc.displaySchedule(),
        charts: currentCharts
      },
      {
        params: this.newLoanFormValues(),
        summary: newSummary,
        schedule: newCalc.displaySchedule(),
        charts: newCharts
      },
      refinanceAnalysis
    );
  }
}