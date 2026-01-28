import { Component, ChangeDetectionStrategy, inject, signal, computed, viewChild, ElementRef, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, PercentPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MortgageService } from '../../services/mortgage.service';

declare const Chart: any;

@Component({
  selector: 'app-rental-investment-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rental-investment-calculator.component.html',
})
export class RentalInvestmentCalculatorComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  
  canvas = viewChild<ElementRef<HTMLCanvasElement>>('summaryChart');
  private chart: any;

  investmentForm = this.fb.group({
    // Property
    purchasePrice: [300000, [Validators.required, Validators.min(0)]],
    downPayment: [60000, [Validators.required, Validators.min(0)]],
    interestRate: [7.0, [Validators.required, Validators.min(0)]],
    loanTerm: [30, [Validators.required, Validators.min(1)]],
    closingCosts: [9000, [Validators.required, Validators.min(0)]],
    initialRepairs: [5000, [Validators.required, Validators.min(0)]],
    // Income
    monthlyRent: [2200, [Validators.required, Validators.min(0)]],
    otherMonthlyIncome: [50, [Validators.required, Validators.min(0)]],
    // Expenses
    propertyTax: [3600, [Validators.required, Validators.min(0)]],
    homeInsurance: [1200, [Validators.required, Validators.min(0)]],
    monthlyHOA: [0, [Validators.required, Validators.min(0)]],
    vacancyRate: [5, [Validators.required, Validators.min(0)]],
    maintenanceRate: [8, [Validators.required, Validators.min(0)]],
    managementRate: [10, [Validators.required, Validators.min(0)]],
    otherMonthlyExpenses: [100, [Validators.required, Validators.min(0)]],
  });

  private formValues = toSignal(this.investmentForm.valueChanges, {
    initialValue: this.investmentForm.getRawValue(),
  });
  
  // Accordion State
  isPropertyOpen = signal(true);
  isIncomeOpen = signal(false);
  isExpensesOpen = signal(false);

  // --- Core Calculations ---
  loanAmount = computed(() => (this.formValues().purchasePrice ?? 0) - (this.formValues().downPayment ?? 0));
  totalInvestment = computed(() => (this.formValues().downPayment ?? 0) + (this.formValues().closingCosts ?? 0) + (this.formValues().initialRepairs ?? 0));

  monthlyPI = computed(() => {
    return this.mortgageService.calculateMonthlyPayment(this.loanAmount(), (this.formValues().interestRate ?? 0) / 100, this.formValues().loanTerm ?? 0);
  });
  annualDebtService = computed(() => this.monthlyPI() * 12);
  
  // --- Income Calculations ---
  annualGrossIncome = computed(() => ((this.formValues().monthlyRent ?? 0) + (this.formValues().otherMonthlyIncome ?? 0)) * 12);
  vacancyLoss = computed(() => this.annualGrossIncome() * ((this.formValues().vacancyRate ?? 0) / 100));
  effectiveGrossIncome = computed(() => this.annualGrossIncome() - this.vacancyLoss());

  // --- Expense Calculations ---
  maintenanceCosts = computed(() => this.annualGrossIncome() * ((this.formValues().maintenanceRate ?? 0) / 100));
  managementCosts = computed(() => this.effectiveGrossIncome() * ((this.formValues().managementRate ?? 0) / 100));
  totalOperatingExpenses = computed(() => 
    (this.formValues().propertyTax ?? 0) +
    (this.formValues().homeInsurance ?? 0) +
    ((this.formValues().monthlyHOA ?? 0) * 12) +
    this.maintenanceCosts() +
    this.managementCosts() +
    ((this.formValues().otherMonthlyExpenses ?? 0) * 12)
  );

  // --- Key Metrics ---
  netOperatingIncome = computed(() => this.effectiveGrossIncome() - this.totalOperatingExpenses());
  annualCashFlow = computed(() => this.netOperatingIncome() - this.annualDebtService());
  monthlyCashFlow = computed(() => this.annualCashFlow() / 12);

  capRate = computed(() => {
    const price = this.formValues().purchasePrice ?? 0;
    return price > 0 ? this.netOperatingIncome() / price : 0;
  });

  cashOnCashReturn = computed(() => {
    const investment = this.totalInvestment();
    return investment > 0 ? this.annualCashFlow() / investment : 0;
  });

  constructor() {
    effect(() => {
      this.updateChart();
    });
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
  
  private createChart(): void {
    if (!this.canvas()?.nativeElement) return;
    const ctx = this.canvas().nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: this.getChartData(),
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw as number);
                return label;
              }
            }
          }
        },
        scales: {
          x: { stacked: true, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
          y: { stacked: true, ticks: { color: '#d1d5db', font: { size: 14, weight: 'bold' } }, grid: { display: false } }
        }
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) return;
    this.chart.data = this.getChartData();
    this.chart.update();
  }

  private getChartData() {
    return {
      labels: ['Analysis'],
      datasets: [
        { label: 'Mortgage', data: [this.monthlyPI()], backgroundColor: '#8b5cf6' }, // P&I
        { label: 'Taxes', data: [(this.formValues().propertyTax ?? 0) / 12], backgroundColor: '#ef4444' },
        { label: 'Insurance', data: [(this.formValues().homeInsurance ?? 0) / 12], backgroundColor: '#f97316' },
        { label: 'Other Expenses', data: [((this.totalOperatingExpenses() - (this.formValues().propertyTax ?? 0) - (this.formValues().homeInsurance ?? 0)) / 12)], backgroundColor: '#eab308' },
        { label: 'Cash Flow', data: [this.monthlyCashFlow()], backgroundColor: this.monthlyCashFlow() > 0 ? '#22c55e' : '#f87171' },
      ]
    };
  }
}
