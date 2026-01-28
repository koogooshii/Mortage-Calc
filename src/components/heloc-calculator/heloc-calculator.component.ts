import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';

@Component({
  selector: 'app-heloc-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './heloc-calculator.component.html',
})
export class HelocCalculatorComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);

  helocForm = this.fb.group({
    homeValue: [500000, [Validators.required, Validators.min(0)]],
    mortgageBalance: [250000, [Validators.required, Validators.min(0)]],
    ltvRatio: [85, [Validators.required, Validators.min(1), Validators.max(100)]],
    amountToDraw: [50000, [Validators.required, Validators.min(0)]],
    interestRate: [8.5, [Validators.required, Validators.min(0)]],
    drawPeriod: [10, [Validators.required, Validators.min(0)]],
    repaymentPeriod: [20, [Validators.required, Validators.min(1)]],
  });

  private formValues = toSignal(this.helocForm.valueChanges, {
    initialValue: this.helocForm.getRawValue(),
  });

  maxHelocAmount = computed(() => {
    const { homeValue, mortgageBalance, ltvRatio } = this.formValues();
    if (homeValue === null || mortgageBalance === null || ltvRatio === null) return 0;
    const maxCredit = (homeValue * (ltvRatio / 100)) - mortgageBalance;
    return maxCredit > 0 ? maxCredit : 0;
  });

  interestOnlyPayment = computed(() => {
    const { amountToDraw, interestRate } = this.formValues();
    if (!amountToDraw || !interestRate || interestRate <= 0) return 0;
    return (amountToDraw * (interestRate / 100)) / 12;
  });

  repaymentPayment = computed(() => {
    const { amountToDraw, interestRate, repaymentPeriod } = this.formValues();
    if (!amountToDraw || !interestRate || !repaymentPeriod) return 0;
    return this.mortgageService.calculateMonthlyPayment(amountToDraw, interestRate / 100, repaymentPeriod);
  });

  totalInterestInDrawPeriod = computed(() => {
    const { drawPeriod } = this.formValues();
    return this.interestOnlyPayment() * (drawPeriod ?? 0) * 12;
  });

  totalInterestInRepaymentPeriod = computed(() => {
    const { amountToDraw, repaymentPeriod } = this.formValues();
    if(amountToDraw === null || repaymentPeriod === null) return 0;
    const totalPayments = this.repaymentPayment() * repaymentPeriod * 12;
    return totalPayments - amountToDraw;
  });
  
  totalLifetimeInterest = computed(() => {
      const drawInterest = this.totalInterestInDrawPeriod();
      const repaymentInterest = this.totalInterestInRepaymentPeriod();
      if (isNaN(drawInterest) || isNaN(repaymentInterest)) return 0;
      return drawInterest + repaymentInterest;
  });

  constructor() {
      // Add a dynamic validator to ensure the amount to draw does not exceed the maximum available credit.
      this.helocForm.get('amountToDraw')?.addValidators(
          (control) => {
              if (control.value > this.maxHelocAmount()) {
                  return { max: { maxValue: this.maxHelocAmount() } };
              }
              return null;
          }
      );
  }
}