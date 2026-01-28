import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

interface RentVsBuyResult {
    mortgagePayment: number;
    totalMonthlyCost: number;
    rent: number;
    cheaperOption: 'rent' | 'buy' | 'equal';
    equityBuilt5Years: number; // New field
    netCostBuy5Years: number; // New field
    netCostRent5Years: number; // New field
}

@Component({
    selector: 'app-rent-vs-buy-analyzer',
    standalone: true,
    imports: [ReactiveFormsModule, CurrencyPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './rent-vs-buy-analyzer.component.html',
})
export class RentVsBuyAnalyzerComponent {
    private fb = inject(FormBuilder);

    // Form for inputs
    rentBuyForm = this.fb.group({
        monthlyRent: [1500, [Validators.required, Validators.min(0)]],
        propertyPrice: [500000, [Validators.required, Validators.min(0)]],
        downPayment: [100000, [Validators.required, Validators.min(0)]],
        interestRate: [5.0, [Validators.required, Validators.min(0)]],
        loanTerm: [25, [Validators.required, Validators.min(1)]], // Changed default to 25
        propertyTaxPercent: [1.2, [Validators.required, Validators.min(0)]],
        insurancePercent: [0.75, [Validators.required, Validators.min(0)]],
    });

    private formValues = toSignal(this.rentBuyForm.valueChanges, {
        initialValue: this.rentBuyForm.getRawValue(),
    });

    result = signal<RentVsBuyResult | null>(null);

    protected Math = Math;

    constructor() {
        effect(() => {
            if (this.rentBuyForm.valid) {
                const v = this.formValues();
                const loanAmount = (v.propertyPrice ?? 0) - (v.downPayment ?? 0);
                const mortgagePayment = this.calculateMortgagePayment(
                    loanAmount,
                    v.interestRate ?? 0,
                    v.loanTerm ?? 0
                );
                const monthlyTaxes = (v.propertyPrice ?? 0) * ((v.propertyTaxPercent ?? 0) / 100) / 12;
                const monthlyInsurance = (v.propertyPrice ?? 0) * ((v.insurancePercent ?? 0) / 100) / 12;
                const totalMonthlyCost = mortgagePayment + monthlyTaxes + monthlyInsurance;
                const rent = v.monthlyRent ?? 0;

                // 5-Year Equity Calculation
                const equityBuilt5Years = this.calculateEquityBuilt(
                    loanAmount,
                    v.interestRate ?? 0,
                    v.loanTerm ?? 0,
                    5
                );

                // Net Cost Analysis (5 Years)
                const totalRentCost5Years = rent * 12 * 5;
                const totalBuyOutflow5Years = totalMonthlyCost * 12 * 5;
                const netCostBuy5Years = totalBuyOutflow5Years - equityBuilt5Years; // Subtract equity from cost

                let cheaperOption: 'rent' | 'buy' | 'equal' = 'equal';
                // Compare Net Costs over 5 years instead of just monthly cashflow
                if (totalRentCost5Years < netCostBuy5Years) cheaperOption = 'rent';
                else if (totalRentCost5Years > netCostBuy5Years) cheaperOption = 'buy';

                this.result.set({
                    mortgagePayment,
                    totalMonthlyCost,
                    rent,
                    cheaperOption,
                    equityBuilt5Years,
                    netCostBuy5Years,
                    netCostRent5Years: totalRentCost5Years
                });
            } else {
                this.result.set(null);
            }
        }, { allowSignalWrites: true });
    }

    private calculateMortgagePayment(principal: number, annualRate: number, termYears: number): number {
        if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
        const monthlyRate = (annualRate / 100) / 12;
        const n = termYears * 12;
        const factor = Math.pow(1 + monthlyRate, n);
        return principal * (monthlyRate * factor) / (factor - 1);
    }

    private calculateEquityBuilt(principal: number, annualRate: number, termYears: number, yearsElapsed: number): number {
        if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
        const monthlyRate = (annualRate / 100) / 12;
        const totalPayments = termYears * 12;
        const paymentsElapsed = yearsElapsed * 12;

        // Balance formula: P * ((1+r)^n - (1+r)^p) / ((1+r)^n - 1)
        const numerator = Math.pow(1 + monthlyRate, totalPayments) - Math.pow(1 + monthlyRate, paymentsElapsed);
        const denominator = Math.pow(1 + monthlyRate, totalPayments) - 1;
        const balance = principal * (numerator / denominator);

        return principal - balance;
    }
}
