
import { OneTimePayment, RecurringPayment, PaymentFrequency, RateChange } from './mortgage.model';

export interface ScenarioState {
  formValues: {
    loanAmount: number;
    interestRate: number;
    loanTerm: number;
    loanTermMonths: number;
    termInYears: number;
    startDate: string;
    paymentFrequency: PaymentFrequency;
    rateType: 'fixed' | 'variable';
    annualPropertyTax: number;
    annualHomeInsurance: number;
    monthlyPMI: number;
  };
  extraMonthlyPayment: number;
  annualPaymentIncreasePercentage: number;
  recurringPayments: RecurringPayment[];
  oneTimePayments: OneTimePayment[];
  deferments: string[];
  adHocPayments: { [paymentNumber: number]: number };
  rateChanges: RateChange[];
}
