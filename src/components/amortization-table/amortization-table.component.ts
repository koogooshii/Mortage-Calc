
import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AmortizationEntry } from '../../models/mortgage.model';

interface AggregatedEntry {
  period: string | number;
  principal: number;
  interest: number;
  extraPayment: number;
  totalPayment: number;
  endBalance: number;
}

@Component({
  selector: 'app-amortization-table',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './amortization-table.component.html',
})
export class AmortizationTableComponent {
  schedule = input.required<AmortizationEntry[]>();
  adHocPaymentChange = output<{ paymentNumber: number, amount: number }>();

  viewMode = signal<'detailed' | 'monthly' | 'yearly'>('detailed');

  yearlySchedule = computed<AggregatedEntry[]>(() => {
    const schedule = this.schedule();
    if (!schedule || schedule.length === 0) return [];

    const yearlyData = schedule.reduce((acc, entry) => {
      const year = entry.paymentDate.getFullYear();
      if (!acc[year]) {
        acc[year] = {
          period: year,
          principal: 0,
          interest: 0,
          extraPayment: 0,
          totalPayment: 0,
          endBalance: entry.remainingBalance
        };
      }
      acc[year].principal += entry.principal;
      acc[year].interest += entry.interest;
      acc[year].extraPayment += entry.scheduledExtraPayment + entry.adHocPayment;
      acc[year].totalPayment += entry.totalPayment;
      acc[year].endBalance = entry.remainingBalance;
      return acc;
    }, {} as { [key: number]: AggregatedEntry });

    return Object.values(yearlyData);
  });

  monthlySchedule = computed<AggregatedEntry[]>(() => {
    const schedule = this.schedule();
    if (!schedule || schedule.length === 0) return [];
  
    const monthlyData = schedule.reduce((acc, entry) => {
      const monthKey = `${entry.paymentDate.getFullYear()}-${entry.paymentDate.toLocaleString('default', { month: 'short' })}`;
      if (!acc[monthKey]) {
        acc[monthKey] = {
          period: monthKey,
          principal: 0,
          interest: 0,
          extraPayment: 0,
          totalPayment: 0,
          endBalance: entry.remainingBalance,
        };
      }
      acc[monthKey].principal += entry.principal;
      acc[monthKey].interest += entry.interest;
      acc[monthKey].extraPayment += entry.scheduledExtraPayment + entry.adHocPayment;
      acc[monthKey].totalPayment += entry.totalPayment;
      acc[monthKey].endBalance = entry.remainingBalance;
      return acc;
    }, {} as { [key: string]: AggregatedEntry });
  
    return Object.values(monthlyData);
  });


  onAdHocPaymentChange(paymentNumber: number, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const amount = parseFloat(inputElement.value) || 0;
    this.adHocPaymentChange.emit({ paymentNumber, amount });
  }
}