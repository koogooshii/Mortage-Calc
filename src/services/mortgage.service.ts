import { Injectable } from '@angular/core';
import {
  AmortizationEntry,
  MortgageParams,
  MortgageSummary,
  PaymentFrequency,
  RecurringPaymentFrequency,
  LoanEvent,
  LoanHistorySegment,
  RefinanceDetails,
  RenewalDetails,
  LumpSumDetails,
  OneTimePayment,
  RateChange
} from '../models/mortgage.model';

@Injectable({
  providedIn: 'root',
})
export class MortgageService {
  
  public generateScheduleAndSummary(params: MortgageParams): {
    schedule: AmortizationEntry[];
    summary: MortgageSummary;
    baselineSchedule: AmortizationEntry[];
    fullSchedule: AmortizationEntry[];
  } {
    if (params.loanAmount <= 0 || params.interestRate < 0 || params.loanTerm <= 0 || !params.startDate) {
      return { schedule: [], summary: this.getEmptySummary(), baselineSchedule: [], fullSchedule: [] };
    }

    // 1. Calculate baseline for comparison (no extra payments, fixed rate)
    const baselineParams: MortgageParams = { 
        ...params, 
        recurringPayments: [], 
        oneTimePayments: [], 
        adHocPayments: {},
        rateType: 'fixed',
        rateChanges: [],
        annualPaymentIncreasePercentage: 0,
        termInYears: params.loanTerm // Calculate baseline over full amortization
    };
    const { schedule: baselineSchedule, summary: baselineSummary } = this._performCalculation(baselineParams, false);
    const originalPayoffDate = baselineSummary.payoffDate;
    const originalTotalInterest = baselineSummary.totalInterest;

    // 2. Perform the main calculation with all user inputs, run to completion
    const { schedule: fullSchedule, summary: fullSummary } = this._performCalculation(params, false);

    // 3. Derive final values from the full calculation
    const interestSavedLifetime = originalTotalInterest - fullSummary.totalInterest;
    const timeSaved = this._calculateTimeDifference(originalPayoffDate, fullSummary.payoffDate);
    const paymentsPerYear = this.getPaymentsPerYear(params.paymentFrequency);
    const maxPaymentsInTerm = params.termInYears * paymentsPerYear;
    
    const scheduleForTerm = fullSchedule.slice(0, maxPaymentsInTerm);
    const balanceAtEndOfTerm = scheduleForTerm.length > 0 && scheduleForTerm.length >= maxPaymentsInTerm
        ? scheduleForTerm[scheduleForTerm.length - 1].remainingBalance
        : (fullSummary.balanceAtEndOfTerm > 0 ? fullSummary.balanceAtEndOfTerm : 0);

    // Calculate interest over the term
    const totalInterestOverTerm = scheduleForTerm.reduce((sum, entry) => sum + entry.interest, 0);
    const totalExtraPaymentsOverTerm = scheduleForTerm.reduce((sum, entry) => sum + entry.scheduledExtraPayment + entry.adHocPayment, 0);
    const baselineTotalInterestOverTerm = baselineSchedule
        .slice(0, scheduleForTerm.length)
        .reduce((sum, entry) => sum + entry.interest, 0);
    const interestSavedOverTerm = baselineTotalInterestOverTerm - totalInterestOverTerm;

    // Calculate PITI and all costs based on payment frequency
    const periodicTax = (params.annualPropertyTax ?? 0) / paymentsPerYear;
    const periodicInsurance = (params.annualHomeInsurance ?? 0) / paymentsPerYear;
    const periodicPMI = (params.monthlyPMI ?? 0) * 12 / paymentsPerYear;
    const totalPeriodicPITI = fullSummary.periodicPayment + periodicTax + periodicInsurance + periodicPMI;

    // Calculate monthly equivalent for refinance comparison
    let totalMonthlyPITIEquivalent = 0;
    switch (params.paymentFrequency) {
      case 'weekly':
      case 'accelerated-weekly':
        totalMonthlyPITIEquivalent = totalPeriodicPITI * 52 / 12;
        break;
      case 'bi-weekly':
      case 'accelerated-bi-weekly':
        totalMonthlyPITIEquivalent = totalPeriodicPITI * 26 / 12;
        break;
      case 'monthly':
      default:
        totalMonthlyPITIEquivalent = totalPeriodicPITI;
        break;
    }

    // Lifetime costs
    const totalTaxesPaid = (params.annualPropertyTax ?? 0) * (fullSummary.loanTermMonths / 12);
    const totalInsurancePaid = (params.annualHomeInsurance ?? 0) * (fullSummary.loanTermMonths / 12);
    const totalPMIPaid = (params.monthlyPMI ?? 0) * fullSummary.loanTermMonths;
    const totalTaxesAndInsurance = totalTaxesPaid + totalInsurancePaid + totalPMIPaid;
    const totalLifetimeCost = fullSummary.totalPaid + totalTaxesAndInsurance;

    // Term costs
    const totalPaidOverTerm = scheduleForTerm.reduce((sum, entry) => sum + entry.totalPayment, 0);
    const numberOfMonthsInTerm = params.termInYears * 12;
    const monthlyTax = (params.annualPropertyTax ?? 0) / 12;
    const monthlyInsurance = (params.annualHomeInsurance ?? 0) / 12;
    const monthlyPMI = params.monthlyPMI ?? 0;
    const totalTaxesAndInsuranceOverTerm = (monthlyTax + monthlyInsurance + monthlyPMI) * numberOfMonthsInTerm;

    // Baseline cost calculations
    const baselineTotalPaidOverTerm = baselineSchedule
      .slice(0, scheduleForTerm.length)
      .reduce((sum, entry) => sum + entry.payment, 0);
    const baselineTotalCostOverTerm = baselineTotalPaidOverTerm + totalTaxesAndInsuranceOverTerm;

    const baselineLoanTermMonths = baselineSummary.loanTermMonths;
    const baselineTotalTaxesPaid = (params.annualPropertyTax ?? 0) * (baselineLoanTermMonths / 12);
    const baselineTotalInsurancePaid = (params.annualHomeInsurance ?? 0) * (baselineLoanTermMonths / 12);
    const baselineTotalPMIPaid = (params.monthlyPMI ?? 0) * baselineLoanTermMonths;
    const baselineTotalTaxesAndInsurance = baselineTotalTaxesPaid + baselineTotalInsurancePaid + baselineTotalPMIPaid;
    const baselineTotalLifetimeCost = baselineSummary.totalPaid + baselineTotalTaxesAndInsurance;

    // 4. Assemble the final summary object
    const finalSummary: MortgageSummary = {
        periodicPayment: fullSummary.periodicPayment,
        totalPeriodicPITI,
        totalMonthlyPITIEquivalent,
        totalPaid: fullSummary.totalPaid, // Use full projection
        totalInterest: fullSummary.totalInterest, // Use full projection
        totalLifetimeCost,
        totalTaxesAndInsurance,
        totalPaidOverTerm,
        totalTaxesAndInsuranceOverTerm,
        totalInterestOverTerm,
        totalExtraPayments: fullSummary.totalExtraPayments,
        totalExtraPaymentsOverTerm,
        payoffDate: fullSummary.payoffDate,
        originalPayoffDate: originalPayoffDate,
        loanTermMonths: fullSummary.loanTermMonths,
        balanceAtEndOfTerm,
        interestSavedLifetime: interestSavedLifetime > 0 ? interestSavedLifetime : 0,
        interestSavedOverTerm: interestSavedOverTerm > 0 ? interestSavedOverTerm : 0,
        timeSaved: timeSaved,
        extraPaymentsByYear: fullSummary.extraPaymentsByYear,
        // Baseline comparison fields
        baselineTotalInterest: originalTotalInterest,
        baselineTotalInterestOverTerm: baselineTotalInterestOverTerm,
        baselineTotalLifetimeCost: baselineTotalLifetimeCost,
        baselineTotalCostOverTerm: baselineTotalCostOverTerm,
    };
    
    return { schedule: scheduleForTerm, summary: finalSummary, baselineSchedule, fullSchedule };
  }
  
  private _performCalculation(params: MortgageParams, limitToTerm: boolean): {
    schedule: AmortizationEntry[];
    summary: MortgageSummary;
  } {
    let {
      loanAmount,
      interestRate,
      loanTerm,
      termInYears,
      startDate,
      paymentFrequency,
      recurringPayments,
      oneTimePayments,
      deferments,
      adHocPayments,
      rateType,
      rateChanges,
      annualPaymentIncreasePercentage,
    } = params;
    
    const sortedRateChanges = [...rateChanges].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let rateChangeIndex = 0;

    const sortedOneTimePayments = [...oneTimePayments]
      .filter(p => p.date && p.amount > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let oneTimePaymentIndex = 0;

    let annualInterestRate = interestRate / 100;
    const paymentsPerYear = this.getPaymentsPerYear(paymentFrequency);

    let monthlyPayment = this.calculateMonthlyPayment(
      loanAmount,
      annualInterestRate,
      loanTerm
    );
    let periodicPayment = this.calculatePeriodicPayment(
      monthlyPayment,
      paymentFrequency
    );

    const schedule: AmortizationEntry[] = [];
    let remainingBalance = loanAmount;
    let paymentNumber = 0;

    const initialDate = new Date(startDate);
    const validStartDate = new Date(
      initialDate.valueOf() + initialDate.getTimezoneOffset() * 60 * 1000
    );

    let totalPaid = 0;
    let totalInterest = 0;
    let totalExtraPayments = 0;

    const defermentDates = new Set(
      deferments.map((d) => {
        const deferDate = new Date(d);
        return new Date(
          deferDate.valueOf() + deferDate.getTimezoneOffset() * 60 * 1000
        ).toDateString();
      })
    );
    
    const nextRecurringPaymentDates = recurringPayments.map(p => {
        const d = p.startDate ? new Date(p.startDate) : new Date(validStartDate.getTime());
        return new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
    });
    const recurringPaymentEndDates = recurringPayments.map(p => {
        if (!p.endDate) return null;
        const d = new Date(p.endDate);
        return new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
    });

    const maxPayments = limitToTerm ? termInYears * paymentsPerYear : loanTerm * paymentsPerYear * 2; // Allow running long for payoffs

    const increasePercentage = (annualPaymentIncreasePercentage ?? 0) / 100;
    let nextAnniversary = new Date(validStartDate);
    if (increasePercentage > 0) {
      nextAnniversary.setFullYear(validStartDate.getFullYear() + 1);
    }

    while (remainingBalance > 0 && paymentNumber < maxPayments) {
      paymentNumber++;
      const currentDate = this.getNextPaymentDate(
        validStartDate,
        paymentNumber,
        paymentFrequency
      );
      const previousDate = this.getNextPaymentDate(
        validStartDate,
        paymentNumber - 1,
        paymentFrequency
      );

      // Handle annual payment increase
      if (increasePercentage > 0 && currentDate >= nextAnniversary) {
        periodicPayment *= (1 + increasePercentage);
        nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
      }

      // Handle variable rate changes
      if (rateType === 'variable' && rateChangeIndex < sortedRateChanges.length) {
          const nextChange = sortedRateChanges[rateChangeIndex];
          const changeDate = new Date(nextChange.date);
          const validChangeDate = new Date(changeDate.valueOf() + changeDate.getTimezoneOffset() * 60 * 1000);

          if (currentDate >= validChangeDate) {
              annualInterestRate = nextChange.rate / 100;
              
              const paymentsMade = paymentNumber - 1;
              const yearsElapsed = paymentsMade / paymentsPerYear;
              const remainingAmortizationYears = loanTerm - yearsElapsed;

              if (remainingBalance > 0 && remainingAmortizationYears > 0) {
                monthlyPayment = this.calculateMonthlyPayment(remainingBalance, annualInterestRate, remainingAmortizationYears);
                periodicPayment = this.calculatePeriodicPayment(monthlyPayment, paymentFrequency);
              }
              rateChangeIndex++;
          }
      }

      const interestForPeriod =
        remainingBalance * (annualInterestRate / paymentsPerYear);

      const isDeferred = defermentDates.has(currentDate.toDateString());

      if (isDeferred) {
        remainingBalance += interestForPeriod;
        schedule.push({
          paymentNumber,
          paymentDate: currentDate,
          payment: 0,
          principal: 0,
          interest: interestForPeriod,
          scheduledExtraPayment: 0,
          adHocPayment: 0,
          totalPayment: 0,
          remainingBalance,
          isDeferred: true,
        });
        totalInterest += interestForPeriod;
        continue;
      }

      let principalFromPayment = periodicPayment - interestForPeriod;
      if (principalFromPayment < 0) {
        principalFromPayment = 0;
      }

      let scheduledExtraPayment = 0;

      // Calculate recurring extra payments
      recurringPayments.forEach((p, index) => {
        if (p.amount <= 0) return;
        const endDate = recurringPaymentEndDates[index];
        let nextDate = nextRecurringPaymentDates[index];
        if (endDate && nextDate > endDate) return;
        while(nextDate <= currentDate) {
          if (endDate && nextDate > endDate) break;
          if (nextDate > previousDate) scheduledExtraPayment += p.amount;
          this.advanceDateByFrequency(nextDate, p.frequency, validStartDate);
        }
        nextRecurringPaymentDates[index] = nextDate;
      });

      // Calculate one-time extra payments (optimized)
      while (
        oneTimePaymentIndex < sortedOneTimePayments.length &&
        new Date(new Date(sortedOneTimePayments[oneTimePaymentIndex].date).valueOf() + new Date(sortedOneTimePayments[oneTimePaymentIndex].date).getTimezoneOffset() * 60 * 1000) <= currentDate
      ) {
          const p = sortedOneTimePayments[oneTimePaymentIndex];
          const oneTimeDate = new Date(p.date);
          const paymentDate = new Date(oneTimeDate.valueOf() + oneTimeDate.getTimezoneOffset() * 60 * 1000);
          if (paymentDate > previousDate) {
              scheduledExtraPayment += p.amount;
          }
          oneTimePaymentIndex++;
      }
      
      const adHocPayment = adHocPayments[paymentNumber] || 0;
      const extraPrincipalPaid = scheduledExtraPayment + adHocPayment;

      if (remainingBalance <= principalFromPayment + extraPrincipalPaid) {
        // Final payment
        const finalInterest = interestForPeriod;
        const principalToPay = remainingBalance;
        const payment = Math.min(periodicPayment, principalToPay + finalInterest);
        const totalPayment = principalToPay + finalInterest + extraPrincipalPaid;
        totalExtraPayments += extraPrincipalPaid;

        schedule.push({
          paymentNumber,
          paymentDate: currentDate,
          payment,
          principal: principalToPay,
          interest: finalInterest,
          scheduledExtraPayment,
          adHocPayment,
          totalPayment,
          remainingBalance: 0,
          isDeferred: false,
        });
        totalPaid += totalPayment;
        totalInterest += finalInterest;
        remainingBalance = 0;
      } else {
        remainingBalance -= principalFromPayment + extraPrincipalPaid;
        const totalPayment = periodicPayment + extraPrincipalPaid;
        totalExtraPayments += extraPrincipalPaid;

        schedule.push({
          paymentNumber,
          paymentDate: currentDate,
          payment: periodicPayment,
          principal: principalFromPayment,
          interest: interestForPeriod,
          scheduledExtraPayment,
          adHocPayment,
          totalPayment,
          remainingBalance,
          isDeferred: false,
        });
        totalPaid += totalPayment;
        totalInterest += interestForPeriod;
      }
    }
    
    const extraPaymentsByYear: { [year: number]: number } = {};
    schedule.forEach(entry => {
        const year = entry.paymentDate.getFullYear();
        const extra = entry.scheduledExtraPayment + entry.adHocPayment;
        if (extra > 0) {
            extraPaymentsByYear[year] = (extraPaymentsByYear[year] || 0) + extra;
        }
    });

    const payoffDate =
      remainingBalance <= 0 && schedule.length > 0
        ? schedule[schedule.length - 1].paymentDate
        : null;

    const summary: MortgageSummary = {
      periodicPayment,
      totalPaid,
      totalInterest,
      totalExtraPayments,
      payoffDate,
      loanTermMonths: payoffDate
        ? this.getMonthDifference(validStartDate, payoffDate)
        : loanTerm * 12,
      balanceAtEndOfTerm: remainingBalance,
      extraPaymentsByYear,
      // The following will be overwritten by the orchestrator method
      totalPeriodicPITI: 0,
      totalMonthlyPITIEquivalent: 0,
      totalLifetimeCost: 0,
      totalTaxesAndInsurance: 0,
      totalPaidOverTerm: 0,
      totalTaxesAndInsuranceOverTerm: 0,
      totalInterestOverTerm: 0,
      totalExtraPaymentsOverTerm: 0,
      originalPayoffDate: null,
      interestSavedLifetime: 0,
      interestSavedOverTerm: 0,
      timeSaved: '',
      baselineTotalInterest: 0,
      baselineTotalInterestOverTerm: 0,
      baselineTotalLifetimeCost: 0,
      baselineTotalCostOverTerm: 0,
    };

    return { schedule, summary };
  }

  // FIX: Add new method to calculate loan history by processing events in segments.
  public calculateLoanHistory(
    initialParams: {
        purchasePrice: number;
        downPayment: number;
        interestRate: number;
        amortizationPeriod: number;
        term: number;
        paymentFrequency: PaymentFrequency;
        startDate: string;
    },
    events: LoanEvent[]
): {
    segments: LoanHistorySegment[];
    schedule: AmortizationEntry[];
    summary: {
        originalPayoffDate: Date | null;
        actualPayoffDate: Date | null;
        originalTotalInterest: number;
        actualTotalInterest: number;
    };
    originalSchedule: AmortizationEntry[];
} {
    const loanAmount = initialParams.purchasePrice - initialParams.downPayment;

    // 1. Baseline calculation for "original" projection
    const baselineMortgageParams: MortgageParams = {
        loanAmount,
        interestRate: initialParams.interestRate,
        loanTerm: initialParams.amortizationPeriod,
        termInYears: initialParams.amortizationPeriod,
        startDate: initialParams.startDate,
        paymentFrequency: initialParams.paymentFrequency,
        recurringPayments: [], oneTimePayments: [], deferments: [], adHocPayments: {},
        rateType: 'fixed', rateChanges: [],
    };
    const { schedule: originalSchedule, summary: originalSummary } = this._performCalculation(baselineMortgageParams, false);

    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const timelinePoints = [{ date: initialParams.startDate, event: null as LoanEvent | null }, ...sortedEvents.map(e => ({ date: e.date, event: e }))]
        .filter((item, index, self) => index === self.findIndex(t => t.date === item.date));


    let fullSchedule: AmortizationEntry[] = [];
    const segments: LoanHistorySegment[] = [];
    let state = {
        balance: loanAmount,
        rate: initialParams.interestRate,
        amortizationYears: initialParams.amortizationPeriod,
        paymentFrequency: initialParams.paymentFrequency,
        startDate: initialParams.startDate,
    };

    for (let i = 0; i < timelinePoints.length; i++) {
        if (state.balance <= 0) break;

        const startPoint = timelinePoints[i];
        const endPoint = i + 1 < timelinePoints.length ? timelinePoints[i + 1] : null;
        
        const eventsAtStart = sortedEvents.filter(e => e.date === startPoint.date);
        let segmentTriggerEvent = eventsAtStart.length > 0 ? eventsAtStart[0] : null;

        const segmentStartDate = new Date(startPoint.date);
        const segmentStartingBalance = state.balance;
        const segmentRate = state.rate;
        const segmentPaymentFrequency = state.paymentFrequency;

        // Apply events at the start of the segment
        eventsAtStart.forEach(event => {
            switch (event.type) {
                case 'refinance':
                    const refi = event.details as RefinanceDetails;
                    state.balance += refi.cashOutAmount;
                    state.rate = refi.newInterestRate;
                    state.amortizationYears = refi.newLoanTerm; // Amortization clock resets
                    state.startDate = event.date; // New start date for amortization calc
                    if (refi.newPaymentFrequency) state.paymentFrequency = refi.newPaymentFrequency;
                    break;
                case 'renewal':
                    const renewal = event.details as RenewalDetails;
                    state.rate = renewal.newInterestRate;
                    if (renewal.newPaymentFrequency) state.paymentFrequency = renewal.newPaymentFrequency;
                    break;
            }
        });

        const yearsElapsed = fullSchedule.length > 0
            ? this.getMonthDifference(new Date(state.startDate), fullSchedule[fullSchedule.length-1].paymentDate) / 12
            : 0;

        const remainingAmortization = state.amortizationYears - yearsElapsed;
        if (remainingAmortization <= 0) continue;

        const params: MortgageParams = {
            loanAmount: state.balance,
            interestRate: state.rate,
            loanTerm: remainingAmortization,
            termInYears: 50, // Run long
            startDate: startPoint.date,
            paymentFrequency: state.paymentFrequency,
            rateType: 'fixed', rateChanges: [], recurringPayments: [], adHocPayments: {},
            oneTimePayments: sortedEvents
                .filter(e => e.type === 'lumpSum' && new Date(e.date) >= segmentStartDate && (!endPoint || new Date(e.date) < new Date(endPoint.date)))
                .map(e => ({ date: e.date, amount: (e.details as LumpSumDetails).amount })),
            deferments: sortedEvents
                .filter(e => e.type === 'missedPayment' && new Date(e.date) >= segmentStartDate && (!endPoint || new Date(e.date) < new Date(endPoint.date)))
                .map(e => e.date),
        };

        const { schedule, summary } = this._performCalculation(params, false);
        const segmentSchedule = endPoint ? schedule.filter(p => p.paymentDate < new Date(endPoint.date)) : schedule;
        
        if (segmentSchedule.length > 0) {
            segmentSchedule.forEach(p => p.paymentNumber += fullSchedule.length);
            fullSchedule.push(...segmentSchedule);
            state.balance = segmentSchedule[segmentSchedule.length - 1].remainingBalance;
        }

        segments.push({
            startDate: startPoint.date,
            endDate: segmentSchedule.length > 0 ? segmentSchedule[segmentSchedule.length - 1].paymentDate.toISOString().split('T')[0] : startPoint.date,
            startingBalance: segmentStartingBalance,
            endingBalance: state.balance,
            interestRate: segmentRate,
            periodicPayment: summary.periodicPayment,
            paymentFrequency: segmentPaymentFrequency,
            event: segmentTriggerEvent,
        });
    }

    const actualPayoffDate = fullSchedule.length > 0 && fullSchedule[fullSchedule.length - 1].remainingBalance <= 0
        ? fullSchedule[fullSchedule.length-1].paymentDate : null;
    const actualTotalInterest = fullSchedule.reduce((sum, entry) => sum + entry.interest, 0);

    return {
        segments,
        schedule: fullSchedule,
        summary: {
            originalPayoffDate: originalSummary.payoffDate,
            actualPayoffDate,
            originalTotalInterest: originalSummary.totalInterest,
            actualTotalInterest,
        },
        originalSchedule,
    };
  }

  private _calculateTimeDifference(d1: Date | null, d2: Date | null): string {
    if (!d1 || !d2 || d2 >= d1) return '0 years, 0 months';
    let months = (d1.getFullYear() - d2.getFullYear()) * 12;
    months -= d2.getMonth();
    months += d1.getMonth();
    if (d1.getDate() < d2.getDate()) {
        months--;
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years} years, ${remainingMonths} months`;
  }

  private getMonthDifference(d1: Date, d2: Date): number {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months + 1;
  }

  private getEmptySummary(): MortgageSummary {
    return {
      periodicPayment: 0,
      totalPeriodicPITI: 0,
      totalMonthlyPITIEquivalent: 0,
      totalPaid: 0,
      totalInterest: 0,
      totalLifetimeCost: 0,
      totalTaxesAndInsurance: 0,
      totalPaidOverTerm: 0,
      totalTaxesAndInsuranceOverTerm: 0,
      totalInterestOverTerm: 0,
      totalExtraPayments: 0,
      totalExtraPaymentsOverTerm: 0,
      payoffDate: null,
      loanTermMonths: 0,
      balanceAtEndOfTerm: 0,
      originalPayoffDate: null,
      interestSavedLifetime: 0,
      interestSavedOverTerm: 0,
      timeSaved: '0 years, 0 months',
      extraPaymentsByYear: {},
      baselineTotalInterest: 0,
      baselineTotalInterestOverTerm: 0,
      baselineTotalLifetimeCost: 0,
      baselineTotalCostOverTerm: 0,
    };
  }

  private getPaymentsPerYear(frequency: PaymentFrequency): number {
    switch (frequency) {
      case 'weekly':
      case 'accelerated-weekly':
        return 52;
      case 'bi-weekly':
      case 'accelerated-bi-weekly':
        return 26;
      case 'monthly':
      default:
        return 12;
    }
  }

  public calculateMonthlyPayment(
    principal: number,
    annualInterestRate: number,
    loanTermYears: number
  ): number {
    if (principal <= 0 || loanTermYears <= 0) return 0;
    const monthlyRate = annualInterestRate / 12;
    const numberOfPayments = loanTermYears * 12;
    if (monthlyRate === 0) {
      return principal / numberOfPayments;
    }
    const factor = Math.pow(1 + monthlyRate, numberOfPayments);
    return (principal * (monthlyRate * factor)) / (factor - 1);
  }

  private calculatePeriodicPayment(
    monthlyPayment: number,
    frequency: PaymentFrequency
  ): number {
    switch (frequency) {
      case 'accelerated-weekly':
        return monthlyPayment / 4;
      case 'weekly':
        return (monthlyPayment * 12) / 52;
      case 'accelerated-bi-weekly':
        return monthlyPayment / 2;
      case 'bi-weekly':
        return (monthlyPayment * 12) / 26;
      case 'monthly':
      default:
        return monthlyPayment;
    }
  }

  private getNextPaymentDate(
    startDate: Date,
    paymentNumber: number,
    frequency: PaymentFrequency
  ): Date {
    const d = new Date(startDate.getTime());
    if (paymentNumber <= 0) return d;
    switch (frequency) {
      case 'weekly':
      case 'accelerated-weekly':
        d.setDate(d.getDate() + paymentNumber * 7);
        break;
      case 'bi-weekly':
      case 'accelerated-bi-weekly':
        d.setDate(d.getDate() + paymentNumber * 14);
        break;
      case 'monthly':
      default:
        d.setMonth(d.getMonth() + paymentNumber);
        break;
    }
    return d;
  }

  private advanceDateByFrequency(date: Date, frequency: RecurringPaymentFrequency, startDate: Date) {
    switch (frequency) {
        case 'weekly':
        case 'accelerated-weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'bi-weekly':
        case 'accelerated-bi-weekly':
            date.setDate(date.getDate() + 14);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'semi-annually':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'annually':
            date.setFullYear(date.getFullYear() + 1);
            break;
    }
  }
}