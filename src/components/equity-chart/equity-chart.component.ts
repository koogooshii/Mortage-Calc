import { Component, ChangeDetectionStrategy, input, viewChild, ElementRef, AfterViewInit, OnChanges, OnDestroy, computed } from '@angular/core';
import { AmortizationEntry } from '../../models/mortgage.model';
import { CurrencyPipe } from '@angular/common';

declare const Chart: any;

@Component({
  selector: 'app-equity-chart',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './equity-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquityChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  fullSchedule = input.required<AmortizationEntry[]>();
  loanAmount = input.required<number>();
  color = input<string>('cyan');

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('equityChart');
  private chart: any;

  private chartColors: { [key: string]: { balance: string, equity: string } } = {
    cyan: { balance: 'rgba(107, 114, 128, 0.5)', equity: 'rgba(34, 211, 238, 0.5)' },
    fuchsia: { balance: 'rgba(107, 114, 128, 0.5)', equity: 'rgba(217, 70, 239, 0.5)' },
    yellow: { balance: 'rgba(107, 114, 128, 0.5)', equity: 'rgba(234, 179, 8, 0.5)' },
  };

  finalEquity = computed(() => {
    const schedule = this.fullSchedule();
    if (!schedule || schedule.length === 0) {
      return 0;
    }
    const finalBalance = schedule[schedule.length - 1].remainingBalance;
    // Final equity is the original loan amount minus the final balance (which should be 0)
    return this.loanAmount() - finalBalance;
  });

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  public getBase64Image(): string | null {
    if (!this.chart) return null;
    const canvas = this.chart.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Store original data
    const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Set background
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const url = canvas.toDataURL('image/png');

    // Restore original
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(originalData, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    return url;
  }

  private prepareChartData() {
    const schedule = this.fullSchedule();
    const loanAmount = this.loanAmount();
    const labels = schedule.map(e => e.paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
    const balanceData = schedule.map(e => e.remainingBalance);
    const equityData = schedule.map(e => loanAmount - e.remainingBalance);

    return { labels, balanceData, equityData };
  }

  private createChart(): void {
    if (!this.canvas()?.nativeElement) return;
    const ctx = this.canvas().nativeElement.getContext('2d');
    if (!ctx) return;

    const { labels, balanceData, equityData } = this.prepareChartData();
    const colors = this.chartColors[this.color()] || this.chartColors['cyan'];

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Home Equity',
            data: equityData,
            borderColor: colors.equity,
            backgroundColor: colors.equity,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
          {
            label: 'Loan Balance',
            data: balanceData,
            borderColor: colors.balance,
            backgroundColor: colors.balance,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            display: false // Disabled data labels
          },
          legend: { labels: { color: '#d1d5db' } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time (Payment Date)',
              color: '#9ca3af'
            },
            ticks: { 
              color: '#9ca3af',
              maxTicksLimit: 10,
            },
            grid: { color: 'rgba(156, 163, 175, 0.1)' }
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: 'Amount ($)',
              color: '#9ca3af'
            },
            ticks: { color: '#9ca3af', callback: (value: any) => `$${(value / 1000)}k` },
            grid: { color: 'rgba(156, 163, 175, 0.1)' }
          }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) return;
    const { labels, balanceData, equityData } = this.prepareChartData();
    const colors = this.chartColors[this.color()] || this.chartColors['cyan'];

    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = equityData;
    this.chart.data.datasets[0].borderColor = colors.equity;
    this.chart.data.datasets[0].backgroundColor = colors.equity;
    this.chart.data.datasets[1].data = balanceData;
    this.chart.data.datasets[1].borderColor = colors.balance;
    this.chart.data.datasets[1].backgroundColor = colors.balance;
    
    this.chart.update();
  }
}
