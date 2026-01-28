
import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-penalty-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './penalty-calculator.component.html',
})
export class PenaltyCalculatorComponent {
  private fb = inject(FormBuilder);

  penaltyForm = this.fb.group({
    currentBalance: [250000, [Validators.required, Validators.min(0)]],
    currentRate: [5.5, [Validators.required, Validators.min(0)]],
    remainingMonths: [36, [Validators.required, Validators.min(1)]],
    postedRate: [4.25, [Validators.required, Validators.min(0)]],
  });

  private formValues = toSignal(this.penaltyForm.valueChanges, {
    initialValue: this.penaltyForm.getRawValue(),
  });

  threeMonthPenalty = computed(() => {
    const { currentBalance, currentRate } = this.formValues();
    if (!currentBalance || !currentRate || currentRate <= 0) {
      return 0;
    }
    // (Balance * Rate) / 12 months * 3 months = (Balance * Rate) / 4
    return (currentBalance * (currentRate / 100)) / 4;
  });

  irdPenalty = computed(() => {
    const { currentBalance, currentRate, remainingMonths, postedRate } = this.formValues();
    if (!currentBalance || !currentRate || !remainingMonths || !postedRate) {
      return 0;
    }
    
    const rateDifference = (currentRate - postedRate) / 100;
    if (rateDifference <= 0) {
        return 0;
    }
    
    const remainingYears = (remainingMonths ?? 0) / 12;
    return (currentBalance ?? 0) * rateDifference * remainingYears;
  });

  finalPenalty = computed(() => {
    if (!this.penaltyForm.valid) return 0;
    return Math.max(this.threeMonthPenalty(), this.irdPenalty());
  });
}
