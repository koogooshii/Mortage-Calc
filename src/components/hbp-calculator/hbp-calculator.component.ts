import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, CommonModule, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-hbp-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, CommonModule, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hbp-calculator.component.html',
})
export class HbpCalculatorComponent {
  private fb = inject(FormBuilder);
  readonly HBP_LIMIT = 35000;
  readonly REPAYMENT_YEARS = 15;

  hbpForm = this.fb.group({
    withdrawalAmount: [this.HBP_LIMIT, [Validators.required, Validators.min(0), Validators.max(this.HBP_LIMIT)]],
    marginalTaxRate: [35, [Validators.required, Validators.min(0), Validators.max(100)]],
    investmentGrowthRate: [6, [Validators.required, Validators.min(0), Validators.max(100)]],
    yearsToGrow: [25, [Validators.required, Validators.min(1)]],
  });

  private formValues = toSignal(this.hbpForm.valueChanges, {
    initialValue: this.hbpForm.getRawValue(),
  });

  requiredAnnualRepayment = computed(() => {
    const amount = this.formValues().withdrawalAmount ?? 0;
    return amount / this.REPAYMENT_YEARS;
  });

  taxCostOfMissedPayment = computed(() => {
    const taxRate = (this.formValues().marginalTaxRate ?? 0) / 100;
    return this.requiredAnnualRepayment() * taxRate;
  });
  
  futureValueOfWithdrawal = computed(() => {
    const { withdrawalAmount, investmentGrowthRate, yearsToGrow } = this.formValues();
    if (!withdrawalAmount || !investmentGrowthRate || !yearsToGrow) return 0;
    
    const rate = investmentGrowthRate / 100;
    return withdrawalAmount * Math.pow(1 + rate, yearsToGrow);
  });
  
  opportunityCost = computed(() => {
    const fv = this.futureValueOfWithdrawal();
    const initial = this.formValues().withdrawalAmount ?? 0;
    return fv > initial ? fv - initial : 0;
  });

}
