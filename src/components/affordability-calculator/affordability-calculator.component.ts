import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

interface AffordabilityResult {
  maxHomePrice: number;
  maxLoanAmount: number;
  maxMonthlyPITI: number;
  monthlyPrincipalAndInterest: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyPMI: number;
}

@Component({
  selector: 'app-affordability-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './affordability-calculator.component.html',
})
export class AffordabilityCalculatorComponent {
  private fb = inject(FormBuilder);

  taxInputType = signal<'percent' | 'value'>('percent');
  insuranceInputType = signal<'percent' | 'value'>('percent');

  affordabilityForm = this.fb.group({
    annualIncome: [85000, [Validators.required, Validators.min(0)]],
    monthlyDebts: [500, [Validators.required, Validators.min(0)]],
    downPayment: [20000, [Validators.required, Validators.min(0)]],
    interestRate: [6.5, [Validators.required, Validators.min(0)]],
    loanTerm: [30, [Validators.required, Validators.min(1)]],
    propertyTax: [1.2, [Validators.required, Validators.min(0)]],
    homeInsurance: [0.75, [Validators.required, Validators.min(0)]],
    monthlyPMI: [75, [Validators.required, Validators.min(0)]],
    frontEndDTI: [28, [Validators.required, Validators.min(1), Validators.max(100)]],
    backEndDTI: [36, [Validators.required, Validators.min(1), Validators.max(100)]],
  });
  
  private formValues = toSignal(this.affordabilityForm.valueChanges, {
    initialValue: this.affordabilityForm.getRawValue(),
  });

  result28 = signal<AffordabilityResult | null>(null);
  result36 = signal<AffordabilityResult | null>(null);

  constructor() {
    effect(() => {
      if (this.affordabilityForm.valid) {
        const values = this.formValues();
        this.result28.set(this.calculateAffordability(values.frontEndDTI ?? 28, true));
        this.result36.set(this.calculateAffordability(values.backEndDTI ?? 36, false));
      } else {
        this.result28.set(null);
        this.result36.set(null);
      }
    }, { allowSignalWrites: true });
  }

  private calculateAffordability(dtiRatio: number, isFrontEnd: boolean): AffordabilityResult {
    const values = this.affordabilityForm.getRawValue();
    const monthlyIncome = (values.annualIncome ?? 0) / 12;
    const monthlyDebts = values.monthlyDebts ?? 0;

    let maxMonthlyPITI: number;
    if (isFrontEnd) {
      maxMonthlyPITI = monthlyIncome * (dtiRatio / 100);
    } else {
      maxMonthlyPITI = (monthlyIncome * (dtiRatio / 100)) - monthlyDebts;
    }
    
    if (maxMonthlyPITI <= 0) return { maxHomePrice: 0, maxLoanAmount: 0, maxMonthlyPITI: 0, monthlyPrincipalAndInterest: 0, monthlyTaxes: 0, monthlyInsurance: 0, monthlyPMI: 0 };

    const monthlyPMI = values.monthlyPMI ?? 0;
    
    let maxLoanAmount = this.reverseMortgageCalculation(maxMonthlyPITI, values.interestRate ?? 0, values.loanTerm ?? 0);
    let maxHomePrice = maxLoanAmount + (values.downPayment ?? 0);
    let monthlyTaxes = 0;
    let monthlyInsurance = 0;

    for (let i = 0; i < 5; i++) { // Iterate for stability
      monthlyTaxes = this.taxInputType() === 'percent'
        ? (maxHomePrice * ((values.propertyTax ?? 0) / 100)) / 12
        : (values.propertyTax ?? 0) / 12;
      monthlyInsurance = this.insuranceInputType() === 'percent'
        ? (maxHomePrice * ((values.homeInsurance ?? 0) / 100)) / 12
        : (values.homeInsurance ?? 0) / 12;
      
      const affordablePI = maxMonthlyPITI - monthlyTaxes - monthlyInsurance - monthlyPMI;
      if (affordablePI <= 0) { maxLoanAmount = 0; maxHomePrice = 0; break; }

      maxLoanAmount = this.reverseMortgageCalculation(affordablePI, values.interestRate ?? 0, values.loanTerm ?? 0);
      maxHomePrice = maxLoanAmount + (values.downPayment ?? 0);
    }
    
    const monthlyPrincipalAndInterest = maxMonthlyPITI - monthlyTaxes - monthlyInsurance - monthlyPMI;

    return {
      maxHomePrice: Math.max(0, maxHomePrice), maxLoanAmount: Math.max(0, maxLoanAmount),
      maxMonthlyPITI: Math.max(0, maxMonthlyPITI), monthlyPrincipalAndInterest: Math.max(0, monthlyPrincipalAndInterest),
      monthlyTaxes: Math.max(0, monthlyTaxes), monthlyInsurance: Math.max(0, monthlyInsurance), monthlyPMI: Math.max(0, monthlyPMI)
    };
  }

  private reverseMortgageCalculation(monthlyPayment: number, annualRate: number, termYears: number): number {
    if (monthlyPayment <= 0 || annualRate <= 0 || termYears <= 0) return 0;
    const monthlyRate = (annualRate / 100) / 12;
    const numberOfPayments = termYears * 12;
    if (monthlyRate === 0) return monthlyPayment * numberOfPayments;
    const factor = Math.pow(1 + monthlyRate, numberOfPayments);
    return monthlyPayment * (factor - 1) / (monthlyRate * factor);
  }
}