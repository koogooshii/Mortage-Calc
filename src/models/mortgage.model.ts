export type PaymentFrequency =
  | 'monthly'
  | 'bi-weekly'
  | 'accelerated-bi-weekly'
  | 'weekly'
  | 'accelerated-weekly';

export type RecurringPaymentFrequency =
  | 'weekly'
  | 'accelerated-weekly'
  | 'bi-weekly'
  | 'accelerated-bi-weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi-annually'
  | 'annually';

export interface RecurringPayment {
  amount: number;
  frequency: RecurringPaymentFrequency;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface OneTimePayment {
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface RateChange {
  date: string; // YYYY-MM-DD
  rate: number;
}

export interface MortgageParams {
  loanAmount: number;
  interestRate: number;
  loanTerm: number; // in years (full amortization)
  termInYears: number; // rate term
  startDate: string; // YYYY-MM-DD
  paymentFrequency: PaymentFrequency;
  recurringPayments: RecurringPayment[];
  oneTimePayments: OneTimePayment[];
  deferments: string[]; // array of YYYY-MM-DD dates
  adHocPayments: { [paymentNumber: number]: number };
  rateType: 'fixed' | 'variable';
  rateChanges: RateChange[];
  annualPaymentIncreasePercentage?: number;
  // New PITI fields
  annualPropertyTax?: number;
  annualHomeInsurance?: number;
  monthlyPMI?: number;
}

export interface MortgageSummary {
  periodicPayment: number;
  totalPeriodicPITI: number;
  totalMonthlyPITIEquivalent: number;
  totalPaid: number; // Projected total P+I over life of loan
  totalInterest: number; // Projected total interest over life of loan
  totalLifetimeCost: number; // Total P+I+T+I over loan life
  totalTaxesAndInsurance: number; // Total T+I+PMI over loan life
  totalPaidOverTerm: number;
  totalTaxesAndInsuranceOverTerm: number;
  totalInterestOverTerm: number;
  totalExtraPayments: number; // total until payoff
  totalExtraPaymentsOverTerm: number;
  payoffDate: Date | null; // projected with extra payments
  loanTermMonths: number;
  balanceAtEndOfTerm: number;
  // New fields for savings analysis
  originalPayoffDate: Date | null;
  interestSavedLifetime: number;
  interestSavedOverTerm: number;
  timeSaved: string;
  extraPaymentsByYear: { [year: number]: number };
  // New fields for baseline comparison
  baselineTotalInterest: number;
  baselineTotalInterestOverTerm: number;
  baselineTotalLifetimeCost: number;
  baselineTotalCostOverTerm: number;
}

export interface AmortizationEntry {
  paymentNumber: number;
  paymentDate: Date;
  payment: number;

  principal: number;
  interest: number;
  scheduledExtraPayment: number;
  adHocPayment: number;
  totalPayment: number;
  remainingBalance: number;
  isDeferred: boolean;
}

// --- Loan History Models ---
export type LoanEventType = 'refinance' | 'lumpSum' | 'missedPayment' | 'renewal';

export interface RefinanceDetails {
  newInterestRate: number;
  newLoanTerm: number; // years
  cashOutAmount: number;
  closingCosts: number;
  newPaymentFrequency?: PaymentFrequency;
}

export interface RenewalDetails {
  newInterestRate: number;
  newTerm: number; // years
  newPaymentFrequency?: PaymentFrequency;
}

export interface LumpSumDetails {
  amount: number;
}

export interface MissedPaymentDetails {} // The date is the key info

export interface LoanEvent {
  id: string;
  date: string; // YYYY-MM-DD
  type: LoanEventType;
  details: RefinanceDetails | LumpSumDetails | MissedPaymentDetails | RenewalDetails;
}

export interface LoanHistorySegment {
    startDate: string;
    endDate: string | null;
    startingBalance: number;
    endingBalance: number;
    interestRate: number;
    periodicPayment: number;
    paymentFrequency: string;
    event?: LoanEvent;
}