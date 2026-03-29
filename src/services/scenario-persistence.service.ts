
import { Injectable } from '@angular/core';
import { ScenarioState } from '../models/scenario.model';
import { PaymentFrequency } from '../models/mortgage.model';

@Injectable({
  providedIn: 'root',
})
export class ScenarioPersistenceService {
  private readonly STORAGE_KEY = 'mortgage_scenarios';

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(10); // November is month 10 (0-indexed)
    date.setDate(3);
    return date.toISOString().split('T')[0];
  }

  public getDefaultScenario(): ScenarioState {
    // Default: $400,000 purchase price with 20% down payment = $320,000 loan
    const defaultPurchasePrice = 400000;
    const defaultDownPaymentPercentage = 20;
    const defaultDownPayment = defaultPurchasePrice * (defaultDownPaymentPercentage / 100);
    const defaultLoanAmount = defaultPurchasePrice - defaultDownPayment;

    return {
      formValues: {
        purchasePrice: defaultPurchasePrice,
        downPayment: defaultDownPayment,
        downPaymentPercentage: defaultDownPaymentPercentage,
        loanAmount: defaultLoanAmount,
        interestRate: 3.85,
        loanTerm: 25,
        loanTermMonths: 0,
        termInYears: 3,
        startDate: this.getDefaultStartDate(),
        paymentFrequency: 'accelerated-weekly' as PaymentFrequency,
        rateType: 'fixed',
        annualPropertyTax: 0,
        annualHomeInsurance: 0,
        monthlyPMI: 0,
      },
      extraMonthlyPayment: 0,
      extraPaymentFrequency: 'monthly' as PaymentFrequency,
      annualPaymentIncreasePercentage: 0,
      maxAnnualPrepaymentPercentage: 20,
      recurringPayments: [],
      oneTimePayments: [],
      deferments: [],
      adHocPayments: {},
      rateChanges: [],
    };
  }

  saveScenarios(scenarios: ScenarioState[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scenarios));
    } catch (e) {
      console.error('Error saving scenarios to local storage', e);
    }
  }

  loadScenarios(): ScenarioState[] {
    try {
      const savedScenarios = localStorage.getItem(this.STORAGE_KEY);
      if (savedScenarios) {
        const parsed = JSON.parse(savedScenarios);
        // Basic validation to ensure it's an array
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading scenarios from local storage', e);
      // If parsing fails, clear the invalid data
      localStorage.removeItem(this.STORAGE_KEY);
    }
    // Return a default scenario if nothing is loaded
    return [this.getDefaultScenario()];
  }
}
