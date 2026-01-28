
import { Component, ChangeDetectionStrategy, input, viewChild, computed } from '@angular/core';
import { AmortizationEntry, MortgageSummary } from '../../models/mortgage.model';

import { LoanBalanceChartComponent } from '../graph/graph.component';
import { PitiPieChartComponent } from '../piti-pie-chart/piti-pie-chart.component';
import { EquityChartComponent } from '../equity-chart/equity-chart.component';

@Component({
  selector: 'app-visual-analysis',
  standalone: true,
  imports: [LoanBalanceChartComponent, PitiPieChartComponent, EquityChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visual-analysis.component.html',
})
export class VisualAnalysisComponent {
  schedule = input.required<AmortizationEntry[]>();
  baselineSchedule = input.required<AmortizationEntry[]>();
  fullSchedule = input.required<AmortizationEntry[]>();
  summary = input.required<MortgageSummary | null>();
  loanAmount = input.required<number>();
  annualPropertyTax = input.required<number>();
  annualHomeInsurance = input.required<number>();
  monthlyPMI = input.required<number>();
  extraMonthlyPayment = input.required<number>();
  color = input<string>('cyan');

  balanceChart = viewChild.required(LoanBalanceChartComponent);
  pitiChart = viewChild(PitiPieChartComponent);
  equityChart = viewChild(EquityChartComponent);

  firstPaymentPrincipal = computed(() => this.schedule()?.[0]?.principal ?? 0);
  firstPaymentInterest = computed(() => this.schedule()?.[0]?.interest ?? 0);

  public getChartImages(): { balance: string | null; piti: string | null; equity: string | null } {
    return {
      balance: this.balanceChart().getBase64Image(),
      piti: this.pitiChart()?.getBase64Image() ?? null,
      equity: this.equityChart()?.getBase64Image() ?? null,
    };
  }
}