import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, PercentPipe, CommonModule } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';

@Component({
  selector: 'app-portability-analyzer',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, PercentPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portability-analyzer.component.html',
})
export class PortabilityAnalyzerComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);

  portabilityForm = this.fb.group({
    // Current
    currentBalance: [250000, [Validators.required, Validators.min(0)]],
    currentRate: [3.5, [Validators.required, Validators.min(0)]],
    // New
    newHomePrice: [700000, [Validators.required, Validators.min(0)]],
    newDownPayment: [140000, [Validators.required, Validators.min(0)]],
    // Rates & Penalties
    breakPenalty: [4500, [Validators.required, Validators.min(0)]],
    lenderRateForNewFunds: [6.0, [Validators.required, Validators.min(0)]],
    newMarketRate: [5.25, [Validators.required, Validators.min(0)]],
    amortizationYears: [25, [Validators.required, Validators.min(1)]],
  });

  private formValues = toSignal(this.portabilityForm.valueChanges, {
    initialValue: this.portabilityForm.getRawValue(),
  });
  
  // --- Porting Scenario ---
  additionalFundsNeeded = computed(() => {
    const { newHomePrice, newDownPayment, currentBalance } = this.formValues();
    if (newHomePrice === null || newDownPayment === null || currentBalance === null) return 0;
    const newLoanRequired = newHomePrice - newDownPayment;
    return newLoanRequired - currentBalance;
  });

  portedLoanAmount = computed(() => (this.formValues().currentBalance ?? 0) + Math.max(0, this.additionalFundsNeeded()));

  blendedRate = computed(() => {
    const { currentBalance, currentRate, lenderRateForNewFunds } = this.formValues();
    const additionalFunds = this.additionalFundsNeeded();
    if (this.portedLoanAmount() === 0 || additionalFunds < 0) { // Only calculate for upsizing
      return currentRate ?? 0;
    }
    const weightedCurrent = (currentBalance ?? 0) * (currentRate ?? 0);
    const weightedNew = additionalFunds * (lenderRateForNewFunds ?? 0);
    return (weightedCurrent + weightedNew) / this.portedLoanAmount();
  });
  
  portedPayment = computed(() => {
    return this.mortgageService.calculateMonthlyPayment(
      this.portedLoanAmount(),
      this.blendedRate() / 100,
      this.formValues().amortizationYears ?? 0
    );
  });

  // --- New Mortgage Scenario ---
  newMortgageLoanAmount = computed(() => (this.formValues().newHomePrice ?? 0) - (this.formValues().newDownPayment ?? 0));
  
  newMortgagePayment = computed(() => {
    return this.mortgageService.calculateMonthlyPayment(
      this.newMortgageLoanAmount(),
      (this.formValues().newMarketRate ?? 0) / 100,
      this.formValues().amortizationYears ?? 0
    );
  });
  
  // --- Comparison ---
  isPortingBetter = computed(() => {
    // Simple comparison: lower payment + lower upfront cost is better.
    const portingTotalCost = this.portedPayment() * 12 * 5; // Over 5 years
    const newMortgageTotalCost = (this.newMortgagePayment() * 12 * 5) + (this.formValues().breakPenalty ?? 0);
    return portingTotalCost < newMortgageTotalCost;
  });
}
