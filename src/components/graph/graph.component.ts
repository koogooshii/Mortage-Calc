import { Component, ChangeDetectionStrategy, input, viewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, computed } from '@angular/core';
import { AmortizationEntry } from '../../models/mortgage.model';
import { CurrencyPipe } from '@angular/common';

// Declare the Chart object from the Chart.js CDN script
declare const Chart: any;

@Component({
  selector: 'app-loan-balance-chart',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './graph.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanBalanceChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  schedule = input.required<AmortizationEntry[]>();
  baselineSchedule = input.required<AmortizationEntry[]>();
  fullSchedule = input.required<AmortizationEntry[]>();
  loanAmount = input.required<number>();
  color = input<string>('cyan');

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('amortizationChart');

  private chart: any;
  private chartColors: { [key: string]: string } = {
    cyan: 'rgba(34, 211, 238, 0.7)',
    fuchsia: 'rgba(217, 70, 239, 0.7)',
    yellow: 'rgba(234, 179, 8, 0.7)',
  };

  startBalance = computed(() => this.loanAmount());
  endOfTermBalance = computed(() => {
    const termSchedule = this.schedule();
    if (!termSchedule || termSchedule.length === 0) {
      return 0;
    }
    return termSchedule[termSchedule.length - 1].remainingBalance;
  });

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chart && (changes['schedule'] || changes['baselineSchedule'] || changes['fullSchedule'] || changes['color'])) {
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

  private createChart(): void {
    if (!this.canvas()?.nativeElement) return;
    const ctx = this.canvas().nativeElement.getContext('2d');
    if (!ctx) return;

    const { labels, data, baselineData, fullData } = this.prepareChartData();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Loan Balance (Term)',
            data: data,
            borderColor: this.chartColors[this.color()] || this.chartColors['cyan'],
            backgroundColor: (this.chartColors[this.color()] || this.chartColors['cyan']).replace('0.7', '0.2'),
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Projected Full Payoff',
            data: fullData,
            borderColor: (this.chartColors[this.color()] || this.chartColors['cyan']),
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            borderDash: [2, 2],
          },
          {
            label: 'Original Balance',
            data: baselineData,
            borderColor: 'rgba(107, 114, 128, 0.7)', // gray-500
            backgroundColor: 'rgba(74, 222, 128, 0.2)', // green-300 transparent
            fill: 0, // Fill the area between this dataset (1) and the one at index 0
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            borderDash: [5, 5],
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          datalabels: {
            display: false // Disabled data labels on the chart
          },
          legend: {
            labels: { color: '#d1d5db' } // gray-300
          },
          tooltip: {
            callbacks: {
                label: function(context: any) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                    }
                    return label;
                }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time (Payment Date)',
              color: '#9ca3af'
            },
            ticks: { 
              color: '#9ca3af', // gray-400
              maxTicksLimit: 10,
            },
            grid: { color: 'rgba(156, 163, 175, 0.1)' } // gray-400
          },
          y: {
            title: {
              display: true,
              text: 'Remaining Loan Balance',
              color: '#9ca3af'
            },
            ticks: { 
              color: '#9ca3af', // gray-400
              callback: (value: any) => `$${(value / 1000)}k`
            },
            grid: { color: 'rgba(156, 163, 175, 0.1)' } // gray-400
          }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) return;

    const { labels, data, baselineData, fullData } = this.prepareChartData();
    
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;
    this.chart.data.datasets[0].borderColor = this.chartColors[this.color()] || this.chartColors['cyan'];
    this.chart.data.datasets[0].backgroundColor = (this.chartColors[this.color()] || this.chartColors['cyan']).replace('0.7', '0.2');
    this.chart.data.datasets[1].data = fullData;
    this.chart.data.datasets[1].borderColor = this.chartColors[this.color()] || this.chartColors['cyan'];
    this.chart.data.datasets[2].data = baselineData;
    
    this.chart.update();
  }
  
  private prepareChartData() {
    const currentSchedule = this.schedule();
    const originalSchedule = this.baselineSchedule();
    const fullSchedule = this.fullSchedule();
    
    const longestSchedule = [originalSchedule, currentSchedule, fullSchedule].sort((a,b) => b.length - a.length)[0];
    const labels = longestSchedule.map(e => e.paymentDate.toLocaleString('en-US', { year: 'numeric', month: 'short'}));

    const data = currentSchedule.map(e => e.remainingBalance);
    const baselineData = originalSchedule.map(e => e.remainingBalance);
    const fullData = fullSchedule.map(e => e.remainingBalance);

    return { labels, data, baselineData, fullData };
  }
}
