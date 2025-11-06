import { Component, ChangeDetectionStrategy, input, viewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

declare const Chart: any;

@Component({
  selector: 'app-piti-pie-chart',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './piti-pie-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PitiPieChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  firstPaymentPrincipal = input.required<number>();
  firstPaymentInterest = input.required<number>();
  propertyTax = input.required<number>();
  homeInsurance = input.required<number>();
  pmi = input.required<number>();
  extraMonthlyPayment = input.required<number>();
  color = input<string>('cyan');

  canvas = viewChild<ElementRef<HTMLCanvasElement>>('pitiPieChart');
  private chart: any;
  private chartColors: { [key: string]: string[] } = {
    cyan: ['#22d3ee', '#0891b2', '#0e7490', '#164e63', '#083344', '#4ade80'],
    fuchsia: ['#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4ade80'],
    yellow: ['#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#4ade80'],
  };
  
  monthlyTax = computed(() => (this.propertyTax() ?? 0) / 12);
  monthlyInsurance = computed(() => (this.homeInsurance() ?? 0) / 12);
  monthlyPmi = computed(() => this.pmi() ?? 0);

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
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
    const components = [
      { label: 'Principal', value: this.firstPaymentPrincipal() },
      { label: 'Interest', value: this.firstPaymentInterest() },
      { label: 'Property Tax', value: this.monthlyTax() },
      { label: 'Home Insurance', value: this.monthlyInsurance() },
      { label: 'PMI', value: this.monthlyPmi() },
      { label: 'Extra Payment', value: this.extraMonthlyPayment() }
    ];

    const filteredComponents = components.filter(c => c.value > 0);
    
    const data = filteredComponents.map(c => c.value);
    const labels = filteredComponents.map(c => c.label);

    return { data, labels };
  }

  private createChart(): void {
    if (!this.canvas()?.nativeElement) return;
    const ctx = this.canvas()?.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
        this.chart.destroy();
    }

    const { data, labels } = this.prepareChartData();
    const colors = this.chartColors[this.color()] || this.chartColors['cyan'];

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: 'Monthly Payment Breakdown',
          data: data,
          backgroundColor: colors,
          borderColor: '#1f2937', // gray-800
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            display: false,
          },
          legend: {
            position: 'bottom',
            labels: { color: '#d1d5db' } // gray-300
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.raw !== null) {
                  label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw);
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
    
    const { data, labels } = this.prepareChartData();
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = data;
    this.chart.data.datasets[0].backgroundColor = this.chartColors[this.color()] || this.chartColors['cyan'];
    this.chart.update();
  }
}
