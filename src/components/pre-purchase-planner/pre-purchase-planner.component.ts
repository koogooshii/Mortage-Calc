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

interface LttResult {
  provincialTax: number;
  municipalTax: number;
  totalTax: number;
  rebate: number;
}

interface CmhcResult {
  premiumAmount: number;
  pstOnPremium: number;
  totalInsuranceCost: number;
  totalMortgage: number;
  isEligible: boolean;
}

@Component({
  selector: 'app-pre-purchase-planner',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, CommonModule, PercentPipe],
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
  
  // --- Affordability Calculation (Canadian GDS/TDS rules) ---
  affordabilityResult = computed<AffordabilityResult>(() => {
    const { annualIncome, monthlyDebts, downPayment, interestRate, amortizationPeriod } = this.formValues();
    if (!annualIncome || !downPayment || !interestRate || !amortizationPeriod) {
      return { maxHomePrice: 0, maxLoanAmount: 0, maxMonthlyPITI: 0 };
    }
    const monthlyIncome = annualIncome / 12;
    const gdsLimit = 0.39; // Gross Debt Service Ratio
    const tdsLimit = 0.44; // Total Debt Service Ratio
    const estimatedAnnualTaxesAndHeat = 0.015;
    
    let maxHomePrice = annualIncome * 5; // Starting guess
    for (let i = 0; i < 5; i++) {
        const loanAmount = maxHomePrice - (downPayment ?? 0);
        if (loanAmount <= 0) { maxHomePrice = 0; continue; }

        const monthlyPI = this.mortgageService.calculateMonthlyPayment(loanAmount, interestRate / 100, amortizationPeriod);
        const estimatedMonthlyTaxesAndHeat = (maxHomePrice * estimatedAnnualTaxesAndHeat) / 12;
        
        const gdsPITH = monthlyPI + estimatedMonthlyTaxesAndHeat;
        const maxIncomeForGDS = gdsPITH / gdsLimit;
        
        const tdsPITH = gdsPITH + (monthlyDebts ?? 0);
        const maxIncomeForTDS = tdsPITH / tdsLimit;

        const requiredMonthlyIncome = Math.max(maxIncomeForGDS, maxIncomeForTDS);
        if(requiredMonthlyIncome === 0) { maxHomePrice = 0; continue; }

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
      const { amortizationPeriod } = this.formValues();
      const loanAmount = this.affordabilityResult().maxLoanAmount;
      if (loanAmount <= 0) return 0;
      return this.mortgageService.calculateMonthlyPayment(loanAmount, this.qualifyingRate() / 100, amortizationPeriod ?? 0);
  });

  // --- Closing Costs (LTT + CMHC) ---
  lttResult = computed<LttResult>(() => {
    const { province, isToronto, isFirstTimeBuyer } = this.formValues();
    const purchasePrice = this.affordabilityResult().maxHomePrice;
    if (!purchasePrice || !province) {
      return { provincialTax: 0, municipalTax: 0, totalTax: 0, rebate: 0 };
    }
    let provincialTax = 0, municipalTax = 0, rebate = 0;
    switch (province) {
      case 'ON':
        provincialTax = this.calculateBrackets(purchasePrice, [{ threshold: 55000, rate: 0.005 }, { threshold: 250000, rate: 0.01 }, { threshold: 400000, rate: 0.015 }, { threshold: 2000000, rate: 0.02 }, { threshold: Infinity, rate: 0.025 }]);
        if (isFirstTimeBuyer) rebate = Math.min(provincialTax, 4000);
        if (isToronto) {
          municipalTax = this.calculateBrackets(purchasePrice, [{ threshold: 55000, rate: 0.005 }, { threshold: 250000, rate: 0.01 }, { threshold: 400000, rate: 0.015 }, { threshold: 2000000, rate: 0.02 }, { threshold: Infinity, rate: 0.025 }]);
          if (isFirstTimeBuyer) rebate += Math.min(municipalTax, 4475);
        }
        break;
      case 'BC':
        provincialTax = this.calculateBrackets(purchasePrice, [{ threshold: 200000, rate: 0.01 }, { threshold: 2000000, rate: 0.02 }, { threshold: 3000000, rate: 0.03 }, { threshold: Infinity, rate: 0.05 }]);
        if (isFirstTimeBuyer && purchasePrice <= 500000) rebate = provincialTax;
        break;
      // Other provinces would have their logic here.
    }
    provincialTax = Math.max(0, provincialTax);
    municipalTax = Math.max(0, municipalTax);
    const totalTax = provincialTax + municipalTax - rebate;
    return { provincialTax, municipalTax, totalTax: Math.max(0, totalTax), rebate };
  });

  cmhcResult = computed<CmhcResult>(() => {
    const { downPayment, amortizationPeriod, province } = this.formValues();
    const purchasePrice = this.affordabilityResult().maxHomePrice;
    const loanAmount = purchasePrice - (downPayment ?? 0);
    const ltv = purchasePrice > 0 ? (loanAmount / purchasePrice) * 100 : 0;
    
    let isEligible = purchasePrice < 1000000 && ltv > 80 && ltv <= 95;
    if (!isEligible) return { premiumAmount: 0, pstOnPremium: 0, totalInsuranceCost: 0, totalMortgage: loanAmount, isEligible: false };

    let rate = 0;
    if (ltv > 90) rate = 4.00;
    else if (ltv > 85) rate = 3.10;
    else rate = 2.80;
    if ((amortizationPeriod ?? 25) > 25) rate += 0.20;
    
    const premiumRate = rate / 100;
    const premiumAmount = loanAmount * premiumRate;
    
    const pstRate = province === 'ON' ? 0.08 : (province === 'QC' ? 0.09 : 0);
    const pstOnPremium = premiumAmount * pstRate;
    const totalInsuranceCost = premiumAmount + pstOnPremium;
    const totalMortgage = loanAmount + premiumAmount;

    return { premiumAmount, pstOnPremium, totalInsuranceCost, totalMortgage, isEligible: true };
  });

  totalClosingCosts = computed(() => this.lttResult().totalTax + (this.cmhcResult().isEligible ? this.cmhcResult().pstOnPremium : 0));
  totalUpfrontCash = computed(() => (this.formValues().downPayment ?? 0) + this.totalClosingCosts());

  // --- HBP Calculation ---
  hbpRepayment = computed(() => (this.formValues().withdrawalAmount ?? 0) / 15);
  taxOnMissedHbpPayment = computed(() => this.hbpRepayment() * ((this.formValues().marginalTaxRate ?? 0) / 100));

  setView(mode: ViewMode) {
    this.viewMode.set(mode);
  }

  private calculateBrackets(value: number, brackets: { threshold: number; rate: number }[]): number {
    let tax = 0;
    let previousThreshold = 0;
    for (const bracket of brackets) {
      if (value > previousThreshold) {
        const taxableAmount = Math.min(value, bracket.threshold) - previousThreshold;
        tax += taxableAmount * bracket.rate;
      }
      previousThreshold = bracket.threshold;
    }
    return tax;
  }
}
