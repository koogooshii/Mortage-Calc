import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, CommonModule, PercentPipe } from '@angular/common';

@Component({
  selector: 'app-cmhc-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, CommonModule, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cmhc-calculator.component.html',
})
export class CmhcCalculatorComponent {
  private fb = inject(FormBuilder);

  cmhcForm = this.fb.group({
    purchasePrice: [500000, [Validators.required, Validators.min(0)]],
    downPayment: [25000, [Validators.required, Validators.min(0)]],
    amortizationPeriod: [25, Validators.required],
    province: ['ON', Validators.required],
  });

  private formValues = toSignal(this.cmhcForm.valueChanges, {
    initialValue: this.cmhcForm.getRawValue(),
  });

  loanAmount = computed(() => (this.formValues().purchasePrice ?? 0) - (this.formValues().downPayment ?? 0));
  
  ltv = computed(() => {
    const price = this.formValues().purchasePrice ?? 0;
    if (price === 0) return 0;
    return (this.loanAmount() / price) * 100;
  });

  premiumRate = computed(() => {
    const ltv = this.ltv();
    const amortization = this.formValues().amortizationPeriod ?? 25;
    let rate = 0;

    if (ltv > 95) rate = 0; // Not eligible
    else if (ltv > 90) rate = 4.00;
    else if (ltv > 85) rate = 3.10;
    else if (ltv > 80) rate = 2.80;
    else if (ltv > 65) rate = 1.70;
    else if (ltv > 0) rate = 0.60;
    
    // Surcharge for amortization > 25 years
    if (amortization > 25) {
        rate += 0.20;
    }
    
    return rate / 100; // Return as decimal
  });

  premiumAmount = computed(() => this.loanAmount() * this.premiumRate());
  
  pstRate = computed(() => {
    switch (this.formValues().province) {
      case 'ON': return 0.08;
      case 'QC': return 0.09;
      // SK has PST but it varies if it applies to CMHC. Assume not for simplicity.
      default: return 0;
    }
  });

  pstOnPremium = computed(() => this.premiumAmount() * this.pstRate());

  totalInsuranceCost = computed(() => this.premiumAmount() + this.pstOnPremium());

  totalMortgage = computed(() => this.loanAmount() + this.premiumAmount());

  isEligible = computed(() => {
    const price = this.formValues().purchasePrice ?? 0;
    const ltv = this.ltv();
    return price < 1000000 && ltv > 80 && ltv <= 95;
  });

}
