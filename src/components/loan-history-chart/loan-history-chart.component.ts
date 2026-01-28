

import { Component, ChangeDetectionStrategy, input, viewChild, ElementRef, AfterViewInit, OnChanges, OnDestroy } from '@angular/core';
import { AmortizationEntry, LoanEvent } from '../../models/mortgage.model';

declare const Chart: any;

@Component({
  selector: 'app-loan-history-chart',
  standalone: true,
  templateUrl: './loan-history-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanHistoryChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  originalSchedule = input.required<AmortizationEntry[]>();
  actualSchedule = input.required<AmortizationEntry[]>();
  events = input.required<LoanEvent[]>();

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('historyChart');
  private chart: any;

  private eventColors: { [key: string]: string } = {
    refinance: 'rgba(96, 165, 250, 1)', // blue-400
    renewal: 'rgba(251, 146, 60, 1)',   // orange-400
    lumpSum: 'rgba(74, 222, 128, 1)',   // green-400
    missedPayment: 'rgba(250, 204, 21, 1)', // yellow-400
  };

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
    const original = this.originalSchedule();
    const actual = this.actualSchedule();

    const allDates = [...original.map(p => p.paymentDate), ...actual.map(p => p.paymentDate)];
    const uniqueDates = [...new Set(allDates.map(d => d.getTime()))].sort((a,b) => a - b);
    const labels = uniqueDates.map(ts => new Date(ts).toLocaleDateString('en-CA'));
    
    const originalData = original.map(p => ({ x: p.paymentDate.getTime(), y: p.remainingBalance }));
    const actualData = actual.map(p => ({ x: p.paymentDate.getTime(), y: p.remainingBalance }));
    
    const eventPoints = this.events().map(event => {
        const eventTime = new Date(event.date).getTime();
        
        if (actual.length === 0) {
            return { x: eventTime, y: 0, type: event.type };
        }

        const closestPoint = actual.reduce((prev, curr) => 
            Math.abs(curr.paymentDate.getTime() - eventTime) < Math.abs(prev.paymentDate.getTime() - eventTime) ? curr : prev
        );
        return {
            x: eventTime,
            y: closestPoint.remainingBalance,
            type: event.type
        };
    });

    return { labels, originalData, actualData, eventPoints };
  }

  private createChart(): void {
    if (!this.canvas()?.nativeElement) return;
    const ctx = this.canvas().nativeElement.getContext('2d');
    if (!ctx) return;

    const { originalData, actualData, eventPoints } = this.prepareChartData();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Actual Loan Balance',
            data: actualData,
            borderColor: 'rgba(217, 70, 239, 0.8)', // fuchsia-500
            backgroundColor: 'rgba(217, 70, 239, 0.2)',
            fill: true,
            tension: 0.1,
            pointRadius: 0,
          },
          {
            label: 'Original Loan Schedule',
            data: originalData,
            borderColor: 'rgba(34, 211, 238, 0.7)', // cyan-400
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
            pointRadius: 0,
          },
          {
            type: 'scatter',
            label: 'Loan Events',
            data: eventPoints,
            pointRadius: 8,
            pointHoverRadius: 10,
            pointBackgroundColor: (context: any) => {
                const raw = context.raw;
                if (raw && typeof raw.type === 'string') {
                    return this.eventColors[raw.type] || '#ffffff';
                }
                return '#ffffff';
            },
            borderColor: 'rgba(255, 255, 255, 0.5)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'year' },
            title: { display: true, text: 'Date', color: '#9ca3af' },
            ticks: { color: '#9ca3af' },
            grid: { color: 'rgba(156, 163, 175, 0.1)' }
          },
          y: {
            title: { display: true, text: 'Loan Balance ($)', color: '#9ca3af' },
            ticks: { color: '#9ca3af', callback: (value: any) => `$${(Number(value) / 1000)}k` },
            grid: { color: 'rgba(156, 163, 175, 0.1)' }
          }
        },
        plugins: {
          legend: { labels: { color: '#d1d5db' } },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                if (context.dataset.type === 'scatter' && context.raw && typeof context.raw.type === 'string') {
                    const eventType = context.raw.type
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str: string) => str.toUpperCase());
                    return `${eventType} Event`;
                }
                
                let label = context.dataset.label || '';
                if (label) { label += ': '; }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) return;
    const { originalData, actualData, eventPoints } = this.prepareChartData();
    
    this.chart.data.datasets[0].data = actualData;
    this.chart.data.datasets[1].data = originalData;
    this.chart.data.datasets[2].data = eventPoints;
    
    this.chart.update();
  }
}