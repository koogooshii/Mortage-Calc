

import { LoanEvent, PaymentFrequency } from './mortgage.model';

export interface OriginalLoanFormState {
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  amortizationPeriod: number;
  term: number;
  paymentFrequency: PaymentFrequency;
  startDate: string;
}

export interface LoanHistoryState {
  form: OriginalLoanFormState;
  events: LoanEvent[];
}