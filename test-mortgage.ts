
import { MortgageService } from './src/services/mortgage.service';
import { MortgageParams } from './src/models/mortgage.model';

const service = new MortgageService();

const params: MortgageParams = {
    loanAmount: 233869.29,
    interestRate: 3.85,
    loanTerm: 25,
    termInYears: 5,
    startDate: '2026-11-03',
    paymentFrequency: 'weekly',
    rateType: 'fixed',
    rateChanges: [],
    recurringPayments: [],
    oneTimePayments: [
        { date: '2026-11-17', amount: 1000 }
    ],
    adHocPayments: {},
    annualPaymentIncreasePercentage: 0,
    annualPropertyTax: 0,
    annualHomeInsurance: 0,
    monthlyPMI: 0
};

const result = service.generateScheduleAndSummary(params);
const row2 = result.schedule[1]; // Payment 2 on 2026-11-17
const row1 = result.schedule[0];

console.log('Row 1 Balance:', row1.remainingBalance);
console.log('Row 2 Date:', row2.paymentDate.toISOString().split('T')[0]);
console.log('Row 2 Principal:', row2.principal);
console.log('Row 2 Scheduled Extra:', row2.scheduledExtraPayment);
console.log('Row 2 Balance:', row2.remainingBalance);

const expectedBalance = row1.remainingBalance - row2.principal - row2.scheduledExtraPayment;
console.log('Expected Balance:', expectedBalance);
console.log('Difference:', row2.remainingBalance - expectedBalance);
