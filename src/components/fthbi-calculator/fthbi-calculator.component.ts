import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, PercentPipe, CommonModule } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';

@Component({
  selector: 'app-fthbi-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, PercentPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fthbi-calculator.component.html',
})
export class FthbiCalculatorComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);

  fthbiForm = this.fb.group({
    purchasePrice: [400000, [Validators.required, Validators.min(0)]],
    downPayment: [20000, [Validators.required, Validators.min(0)]],
    incentivePercent: [5, [Validators.required]],
    mortgageRate: [5.0, [Validators.required, Validators.min(0)]],
    amortizationPeriod: [25, [Validators.required, Validators.min(1)]],
    // Projections
    appreciationRate: [3, [Validators.required, Validators.min(0)]],
    yearsUntilSale: [10, [Validators.required, Validators.min(1)]],
  });

  private formValues = toSignal(this.fthbiForm.valueChanges, {
    initialValue: this.fthbiForm.getRawValue(),
  });

  // --- Incentive Scenario ---
  incentiveAmount = computed(() => (this.formValues().purchasePrice ?? 0) * ((this.formValues().incentivePercent ?? 0) / 100));
  
  mortgageWithIncentive = computed(() => {
    return (this.formValues().purchasePrice ?? 0) - (this.formValues().downPayment ?? 0) - this.incentiveAmount();
  });
  
  paymentWithIncentive = computed(() => {
    return this.mortgageService.calculateMonthlyPayment(
      this.mortgageWithIncentive(),
      (this.formValues().mortgageRate ?? 0) / 100,
      this.formValues().amortizationPeriod ?? 0
    );
  });
  
  futureSalePrice = computed(() => {
    const { purchasePrice, appreciationRate, yearsUntilSale } = this.formValues();
    if (purchasePrice === null || appreciationRate === null || yearsUntilSale === null) return 0;
    return purchasePrice * Math.pow(1 + (appreciationRate / 100), yearsUntilSale);
  });

  incentiveRepayment = computed(() => this.futureSalePrice() * ((this.formValues().incentivePercent ?? 0) / 100));

  // --- No Incentive Scenario ---
  mortgageWithoutIncentive = computed(() => (this.formValues().purchasePrice ?? 0) - (this.formValues().downPayment ?? 0));
  
  paymentWithoutIncentive = computed(() => {
    return this.mortgageService.calculateMonthlyPayment(
      this.mortgageWithoutIncentive(),
      (this.formValues().mortgageRate ?? 0) / 100,
      this.formValues().amortizationPeriod ?? 0
    );
  });
  
  // --- Comparison ---
  monthlySavings = computed(() => this.paymentWithoutIncentive() - this.paymentWithIncentive());

  // Note: For simplicity, we are not calculating remaining balance at time of sale.
  // A full implementation would require amortization schedules.
  // We will compare (Sale Price - Repayments) vs (Sale Price - Original Loan) as a proxy for equity gain.
  
  netGainWithIncentive = computed(() => {
    return this.futureSalePrice() - this.mortgageWithIncentive() - this.incentiveRepayment() - (this.formValues().downPayment ?? 0);
  });
  
  netGainWithoutIncentive = computed(() => {
    return this.futureSalePrice() - this.mortgageWithoutIncentive() - (this.formValues().downPayment ?? 0);
  });

}
