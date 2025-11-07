import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, CommonModule, PercentPipe } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';
import { PaymentFrequency } from '../../models/mortgage.model';

type Province = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'ON' | 'PE' | 'QC' | 'SK';
type ViewMode = 'affordability' | 'stressTest' | 'closingCosts' | 'hbp';

interface AffordabilityResult {
  maxHomePrice: number;
  maxLoanAmount: number;
  maxMonthlyPITI: number;
}

@Component({
  selector: 'app-pre-purchase-planner',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pre-purchase-planner.component.html',
})
export class PrePurchasePlannerComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  
  readonly HBP_LIMIT = 35000;
  viewMode = signal<ViewMode>('affordability');

  plannerForm = this.fb.group({
    // Affordability
    annualIncome: [85000, [Validators.required, Validators.min(0)]],
    monthlyDebts: [500, [Validators.required, Validators.min(0)]],
    downPayment: [25000, [Validators.required, Validators.min(0)]],
    interestRate: [5.5, [Validators.required, Validators.min(0)]],
    amortizationPeriod: [25, [Validators.required, Validators.min(1)]],
    paymentFrequency: ['monthly' as PaymentFrequency, Validators.required],
    // Closing Costs
    province: ['ON' as Province, Validators.required],
    isToronto: [false],
    isFirstTimeBuyer: [false],
    // Stress Test
    rateIncrease: [2.0, [Validators.required, Validators.min(0)]],
    benchmarkRate: [5.25, [Validators.required, Validators.min(0)]],
     // HBP
    withdrawalAmount: [this.HBP_LIMIT, [Validators.required, Validators.min(0), Validators.max(this.HBP_LIMIT)]],
    marginalTaxRate: [35, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  private formValues = toSignal(this.plannerForm.valueChanges, {
    initialValue: this.plannerForm.getRawValue(),
  });
  
  // --- Affordability Calculation ---
  affordabilityResult = computed<AffordabilityResult>(() => {
    const { annualIncome, monthlyDebts, downPayment, interestRate, amortizationPeriod } = this.formValues();
    const monthlyIncome = (annualIncome ?? 0) / 12;
    const gdsLimit = 0.39; // Gross Debt Service Ratio
    const tdsLimit = 0.44; // Total Debt Service Ratio

    // Assuming ~1.5% of home value for property tax and heating costs
    const estimatedAnnualTaxesAndHeat = 0.015;
    
    // Iteratively find the max home price
    let maxHomePrice = (annualIncome ?? 0) * 5; // Starting guess
    for (let i = 0; i < 5; i++) {
        const estimatedMonthlyTaxesAndHeat = (maxHomePrice * estimatedAnnualTaxesAndHeat) / 12;
        const loanAmount = maxHomePrice - (downPayment ?? 0);
        if (loanAmount <= 0) { maxHomePrice = 0; continue; }

        const monthlyPI = this.mortgageService.calculateMonthlyPayment(loanAmount, (interestRate ?? 0) / 100, amortizationPeriod ?? 0);
        const gdsPITH = monthlyPI + estimatedMonthlyTaxesAndHeat;
        const maxIncomeForGDS = gdsPITH / (gdsLimit / 12);
        
        const tdsPITH = gdsPITH + (monthlyDebts ?? 0);
        const maxIncomeForTDS = tdsPITH / (tdsLimit / 12);

        const requiredMonthlyIncome = Math.max(maxIncomeForGDS, maxIncomeForTDS);
        const affordabilityRatio = monthlyIncome / requiredMonthlyIncome;
        
        if (Math.abs(1 - affordabilityRatio) < 0.001) break;
        maxHomePrice = maxHomePrice * affordabilityRatio;
    }
    const maxLoanAmount = Math.max(0, maxHomePrice - (downPayment ?? 0));
    const maxMonthlyPI = this.mortgageService.calculateMonthlyPayment(maxLoanAmount, (interestRate ?? 0) / 100, amortizationPeriod ?? 0);
    return { maxHomePrice: Math.max(0, maxHomePrice), maxLoanAmount, maxMonthlyPITI: maxMonthlyPI };
  });

  // --- Stress Test Calculation ---
  qualifyingRate = computed(() => {
    const { interestRate, rateIncrease, benchmarkRate } = this.formValues();
    const ratePlusIncrease = (interestRate ?? 0) + (rateIncrease ?? 0);
    return Math.max(ratePlusIncrease, benchmarkRate ?? 0);
  });
  
  paymentAtQualifyingRate = computed(() => {
      const { downPayment, amortizationPeriod, paymentFrequency } = this.formValues();
      const loanAmount = this.affordabilityResult().maxLoanAmount;
      if (loanAmount <= 0) return 0;
      return this.mortgageService.calculateMonthlyPayment(loanAmount, this.qualifyingRate() / 100, amortizationPeriod ?? 0);
  });

  // --- Closing Costs (LTT + CMHC) ---
  lttResult = computed(() => { /* ... LTT logic ... */ 
      const price = this.affordabilityResult().maxHomePrice;
      // ... (logic from LandTransferTaxCalculatorComponent)
       return { totalTax: 0, rebate: 0 }; // Simplified
  });
  cmhcResult = computed(() => { /* ... CMHC logic ... */ return { totalInsuranceCost: 0, isEligible: false}; });

  // --- HBP Calculation ---
  hbpRepayment = computed(() => (this.formValues().withdrawalAmount ?? 0) / 15);
  taxOnMissedHbpPayment = computed(() => this.hbpRepayment() * ((this.formValues().marginalTaxRate ?? 0) / 100));

  setView(mode: ViewMode) {
    this.viewMode.set(mode);
  }
}