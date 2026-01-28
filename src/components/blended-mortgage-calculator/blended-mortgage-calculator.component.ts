import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, PercentPipe, CommonModule } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';

@Component({
  selector: 'app-blended-mortgage-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, PercentPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './blended-mortgage-calculator.component.html',
})
export class BlendedMortgageCalculatorComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);

  blendedForm = this.fb.group({
    // Current Mortgage
    currentBalance: [250000, [Validators.required, Validators.min(0)]],
    currentRate: [3.5, [Validators.required, Validators.min(0)]],
    amortizationRemainingYears: [22, [Validators.required, Validators.min(0)]],
    // New Funds
    additionalFunds: [50000, [Validators.required, Validators.min(0)]],
    lenderRateForNewFunds: [6.0, [Validators.required, Validators.min(0)]],
    newAmortizationYears: [25, [Validators.required, Validators.min(1)]],
    // Refinance Comparison
    breakPenalty: [4500, [Validators.required, Validators.min(0)]],
    newMarketRate: [5.25, [Validators.required, Validators.min(0)]],
  });

  private formValues = toSignal(this.blendedForm.valueChanges, {
    initialValue: this.blendedForm.getRawValue(),
  });

  // --- Blended Scenario Calculations ---
  newBlendedLoanAmount = computed(() => (this.formValues().currentBalance ?? 0) + (this.formValues().additionalFunds ?? 0));

  blendedRate = computed(() => {
    const { currentBalance, currentRate, additionalFunds, lenderRateForNewFunds } = this.formValues();
    if (!currentBalance || !additionalFunds || this.newBlendedLoanAmount() === 0) {
      return 0;
    }
    const weightedCurrent = currentBalance * (currentRate ?? 0);
    const weightedNew = additionalFunds * (lenderRateForNewFunds ?? 0);
    return (weightedCurrent + weightedNew) / this.newBlendedLoanAmount();
  });

  blendedPayment = computed(() => {
    const { newAmortizationYears } = this.formValues();
    return this.mortgageService.calculateMonthlyPayment(
      this.newBlendedLoanAmount(),
      this.blendedRate() / 100,
      newAmortizationYears ?? 0
    );
  });
  
  // --- Refinance Scenario Calculations ---
  newRefinanceLoanAmount = computed(() => this.newBlendedLoanAmount());
  
  refinancePayment = computed(() => {
    const { newAmortizationYears, newMarketRate } = this.formValues();
    return this.mortgageService.calculateMonthlyPayment(
      this.newRefinanceLoanAmount(),
      (newMarketRate ?? 0) / 100,
      newAmortizationYears ?? 0
    );
  });

  // --- Comparison ---
  monthlyDifference = computed(() => this.refinancePayment() - this.blendedPayment());
  
  isBlendBetter = computed(() => {
    // A simple check: if the blended payment is lower, it's generally better short-term.
    // A more complex analysis would involve total interest over the term.
    // We also consider the upfront penalty cost for refinancing.
    const upfrontCostDifference = this.formValues().breakPenalty ?? 0;
    // If blended payment is lower, it saves money monthly.
    // If refinance payment is lower, how long to recoup penalty?
    if (this.monthlyDifference() > 0) { // Refinance payment is higher
        return true;
    } else { // Blended payment is higher
        const monthsToRecoup = upfrontCostDifference / (-this.monthlyDifference());
        // If it takes more than 5 years (60 months) to recoup, blending is likely better for the term.
        return monthsToRecoup > 60;
    }
  });
}
