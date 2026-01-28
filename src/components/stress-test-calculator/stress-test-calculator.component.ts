import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MortgageService } from '../../services/mortgage.service';
import { PaymentFrequency } from '../../models/mortgage.model';

@Component({
  selector: 'app-stress-test-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stress-test-calculator.component.html',
})
export class StressTestCalculatorComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);

  stressTestForm = this.fb.group({
    loanAmount: [400000, [Validators.required, Validators.min(0)]],
    interestRate: [4.5, [Validators.required, Validators.min(0)]],
    amortizationPeriod: [25, [Validators.required, Validators.min(1)]],
    paymentFrequency: ['monthly' as PaymentFrequency, Validators.required],
    rateIncrease: [2.0, [Validators.required, Validators.min(0)]],
    benchmarkRate: [5.25, [Validators.required, Validators.min(0)]],
  });

  private formValues = toSignal(this.stressTestForm.valueChanges, {
    initialValue: this.stressTestForm.getRawValue(),
  });

  qualifyingRate = computed(() => {
    const { interestRate, rateIncrease, benchmarkRate } = this.formValues();
    const ratePlusIncrease = (interestRate ?? 0) + (rateIncrease ?? 0);
    return Math.max(ratePlusIncrease, benchmarkRate ?? 0);
  });

  paymentAtContractRate = computed(() => {
    const { loanAmount, interestRate, amortizationPeriod, paymentFrequency } = this.formValues();
    if (!loanAmount || !interestRate || !amortizationPeriod || !paymentFrequency) return 0;

    const monthlyPayment = this.mortgageService.calculateMonthlyPayment(
      loanAmount,
      interestRate / 100,
      amortizationPeriod
    );

    return this.calculatePeriodicPayment(monthlyPayment, paymentFrequency as PaymentFrequency);
  });
  
  paymentAtQualifyingRate = computed(() => {
    const { loanAmount, amortizationPeriod, paymentFrequency } = this.formValues();
    const qualifyingRate = this.qualifyingRate();
    if (!loanAmount || !qualifyingRate || !amortizationPeriod || !paymentFrequency) return 0;
    
    const monthlyPayment = this.mortgageService.calculateMonthlyPayment(
      loanAmount,
      qualifyingRate / 100,
      amortizationPeriod
    );

    return this.calculatePeriodicPayment(monthlyPayment, paymentFrequency as PaymentFrequency);
  });

  paymentDifference = computed(() => {
    return this.paymentAtQualifyingRate() - this.paymentAtContractRate();
  });

  requiredIncome = computed(() => {
    // A simplified estimation. Assuming a 40% GDS ratio for qualification.
    // Gross Debt Service ratio = (PITH / Gross Income) <= GDS Limit
    // Gross Income >= PITH / GDS Limit
    const annualQualifyingPayments = this.paymentAtQualifyingRate() * this.getPaymentsPerYear(this.formValues().paymentFrequency as PaymentFrequency);
    // Assuming 1.5% of loan amount for annual Taxes & Heat for GDS calc
    const estimatedTaxesAndHeat = (this.formValues().loanAmount ?? 0) * 0.015;
    const pith = annualQualifyingPayments + estimatedTaxesAndHeat;
    const gdsRatio = 0.40;
    return pith / gdsRatio;
  });

  private calculatePeriodicPayment(monthlyPayment: number, frequency: PaymentFrequency): number {
    switch (frequency) {
      case 'accelerated-weekly': return monthlyPayment / 4;
      case 'weekly': return (monthlyPayment * 12) / 52;
      case 'accelerated-bi-weekly': return monthlyPayment / 2;
      case 'bi-weekly': return (monthlyPayment * 12) / 26;
      case 'monthly':
      default: return monthlyPayment;
    }
  }

  private getPaymentsPerYear(frequency: PaymentFrequency): number {
    switch (frequency) {
      case 'weekly':
      case 'accelerated-weekly': return 52;
      case 'bi-weekly':
      case 'accelerated-bi-weekly': return 26;
      case 'monthly':
      default: return 12;
    }
  }
}
