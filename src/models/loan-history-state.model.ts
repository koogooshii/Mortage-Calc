
import { LoanEvent } from './mortgage.model';

export interface OriginalLoanFormState {
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  amortizationPeriod: number;
  term: number;
  paymentFrequency: string;
  startDate: string;
}

export interface LoanHistoryState {
  form: OriginalLoanFormState;
  events: LoanEvent[];
}
