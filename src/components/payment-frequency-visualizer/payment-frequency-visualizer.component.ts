import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PaymentScenario {
    frequency: string;
    payment: number;
    interestPaid: number;
    amortizationYears: number;
    savings: number;
}

@Component({
    selector: 'app-payment-frequency-visualizer',
    standalone: true,
    imports: [CommonModule, FormsModule, CurrencyPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './payment-frequency-visualizer.component.html',
})
export class PaymentFrequencyVisualizerComponent {
    // Inputs
    mortgageAmount = signal<number>(500000);
    interestRate = signal<number>(5.0);
    amortization = signal<number>(25);

    // Computed Results
    results = computed(() => {
        const principal = this.mortgageAmount();
        const rate = this.interestRate() / 100;
        const years = this.amortization();

        const monthlyPayment = this.calculatePayment(principal, rate, years, 12);
        const totalInterestMonthly = (monthlyPayment * years * 12) - principal;

        return [
            this.calculateScenario('Monthly', principal, rate, years, 12, monthlyPayment, totalInterestMonthly),
            this.calculateScenario('Semi-Monthly', principal, rate, years, 24, monthlyPayment / 2, totalInterestMonthly),
            this.calculateScenario('Bi-Weekly', principal, rate, years, 26, (monthlyPayment * 12) / 26, totalInterestMonthly),
            this.calculateScenario('Accelerated Bi-Weekly', principal, rate, years, 26, monthlyPayment / 2, totalInterestMonthly),
            this.calculateScenario('Weekly', principal, rate, years, 52, (monthlyPayment * 12) / 52, totalInterestMonthly),
            this.calculateScenario('Accelerated Weekly', principal, rate, years, 52, monthlyPayment / 4, totalInterestMonthly),
        ];
    });

    // Determine the scenario with the greatest savings
    bestScenario = computed(() => {
        const all = this.results();
        if (!all.length) return null;
        return all.reduce((best, cur) => (cur.savings > best.savings ? cur : best), all[0]);
    });

    private calculatePayment(p: number, r: number, y: number, n: number): number {
        const i = r / n; // Periodic interest rate
        const totalPayments = y * n;
        if (i === 0) return p / totalPayments;
        return (p * i * Math.pow(1 + i, totalPayments)) / (Math.pow(1 + i, totalPayments) - 1);
    }

    private calculateScenario(
        name: string,
        principal: number,
        annualRate: number,
        originalYears: number,
        paymentsPerYear: number,
        paymentAmount: number,
        baselineInterest: number
    ): PaymentScenario {
        let balance = principal;
        let interestPaid = 0;
        let paymentsMade = 0;
        const periodicRate = annualRate / paymentsPerYear;

        while (balance > 0 && paymentsMade < originalYears * paymentsPerYear * 1.5) { // Safety break
            const interest = balance * periodicRate;
            let principalPaid = paymentAmount - interest;

            if (balance < principalPaid) {
                principalPaid = balance;
                // Last payment might be smaller
            }

            balance -= principalPaid;
            interestPaid += interest;
            paymentsMade++;
        }

        const actualYears = paymentsMade / paymentsPerYear;

        return {
            frequency: name,
            payment: paymentAmount,
            interestPaid: interestPaid,
            amortizationYears: actualYears,
            savings: Math.max(0, baselineInterest - interestPaid)
        };
    }

    // Helper to update signals from template
    updateAmount(value: number | string) { this.mortgageAmount.set(Number(value)); }
    updateRate(value: number | string) { this.interestRate.set(Number(value)); }
    updateAmortization(value: number | string) { this.amortization.set(Number(value)); }
}
