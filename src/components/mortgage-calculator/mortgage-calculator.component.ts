import { Component, ChangeDetectionStrategy, inject, signal, effect, computed, input, output, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';
import { AmortizationEntry, MortgageSummary, OneTimePayment, RecurringPayment, PaymentFrequency, RecurringPaymentFrequency, RateChange } from '../../models/mortgage.model';
import { AmortizationTableComponent } from '../amortization-table/amortization-table.component';
import { AiAdvisorComponent } from '../ai-advisor/ai-advisor.component';
import { VisualAnalysisComponent } from '../visual-analysis/visual-analysis.component';
import { PdfExportService, ChartImages } from '../../services/pdf-export.service';
import { AiGoalSeekerComponent } from '../ai-goal-seeker/ai-goal-seeker.component';

@Component({
  selector: 'app-mortgage-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, AmortizationTableComponent, AiAdvisorComponent, VisualAnalysisComponent, AiGoalSeekerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mortgage-calculator.component.html',
})
export class MortgageCalculatorComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  private pdfExportService = inject(PdfExportService);

  // Inputs for theming and layout
  color = input<string>('cyan');
  scenarioCount = input<number>(1);
  scenarioIndex = input.required<number>();
  hideHeader = input<boolean>(false);
  graphsVisible = input<boolean>(false);

  // Output for refinance mode
  summaryUpdated = output<{ 
    summary: MortgageSummary | null; 
    formValues: any;
    extraMonthlyPayment: number;
    recurringPayments: RecurringPayment[];
  }>();
  
  colorClasses = computed(() => ({
    text: `text-${this.color()}-400`,
    focusRing: `focus:ring-${this.color()}-500`,
    focusBorder: `focus:border-${this.color()}-500`,
  }));
  
  private accentColors: { [key: string]: string } = {
    cyan: '#22d3ee', // cyan-400
    fuchsia: '#d946ef', // fuchsia-500
    yellow: '#eab308', // yellow-500
  };
  sliderAccentColor = computed(() => this.accentColors[this.color()] || this.accentColors['cyan']);

  // Calculate default start date: Nov 3rd of current year
  private getDefaultStartDate(): string {
    const date = new Date();
    date.setMonth(10); // November is month 10 (0-indexed)
    date.setDate(3);
    return date.toISOString().split('T')[0];
  }

  // Form Group for core mortgage parameters
  mortgageForm = this.fb.group({
    loanAmount: [234000],
    interestRate: [3.85],
    loanTerm: [25], // Amortization period in years
    loanTermMonths: [0], // Amortization period in months
    termInYears: [3], // Rate term
    startDate: [this.getDefaultStartDate()],
    paymentFrequency: ['accelerated-weekly' as PaymentFrequency],
    rateType: ['fixed' as 'fixed' | 'variable'],
    // PITI fields
    annualPropertyTax: [0],
    annualHomeInsurance: [0],
    monthlyPMI: [0],
  });

  // Signals for dynamic extra payments and deferments
  extraMonthlyPayment = signal<number>(0);
  annualPaymentIncreasePercentage = signal<number>(0);
  recurringPayments = signal<RecurringPayment[]>([]);
  oneTimePayments = signal<OneTimePayment[]>([]);
  deferments = signal<string[]>([]);
  adHocPayments = signal<{ [paymentNumber: number]: number }>({});
  rateChanges = signal<RateChange[]>([]);

  // Signals for calculation results
  summary = signal<MortgageSummary | null>(null);
  amortizationSchedule = signal<AmortizationEntry[]>([]); // Term schedule
  fullAmortizationSchedule = signal<AmortizationEntry[]>([]); // Full schedule
  baselineSchedule = signal<AmortizationEntry[]>([]);
  
  // UI state for amortization table view
  amortizationScope = signal<'term' | 'full'>('term');
  displaySchedule = computed(() => {
    return this.amortizationScope() === 'term' 
      ? this.amortizationSchedule() 
      : this.fullAmortizationSchedule();
  });

  yearlyExtraPayments = computed(() => {
    const summary = this.summary();
    if (!summary?.totalExtraPayments || !summary.extraPaymentsByYear) {
      return [];
    }
    return Object.entries(summary.extraPaymentsByYear)
      .map(([year, amount]) => ({ year: parseInt(year, 10), amount }))
      .sort((a, b) => a.year - b.year);
  });

  showAdvisor = signal(false);
  showGraphs = signal(false);
  isGraphsVisible = computed(() => this.hideHeader() ? this.graphsVisible() : this.showGraphs());

  visualAnalysisComponent = viewChild(VisualAnalysisComponent);
  aiAdvisorComponent = viewChild(AiAdvisorComponent);
  aiGoalSeekerComponent = viewChild(AiGoalSeekerComponent);

  private formValues = toSignal(this.mortgageForm.valueChanges, {
    initialValue: this.mortgageForm.value
  });

  paymentFrequencyLabel = computed(() => {
    const freq = this.formValues().paymentFrequency;
    switch (freq) {
      case 'weekly':
      case 'accelerated-weekly':
        return 'Weekly';
      case 'bi-weekly':
      case 'accelerated-bi-weekly':
        return 'Bi-Weekly';
      case 'monthly':
      default:
        return 'Monthly';
    }
  });

  totalLoanTermInYears = computed(() => {
    const form = this.formValues();
    return (form.loanTerm ?? 0) + ((form.loanTermMonths ?? 0) / 12);
  });

  baseMonthlyPayment = computed(() => {
    const formValues = this.formValues();
    const loanAmount = formValues.loanAmount ?? 0;
    const interestRate = formValues.interestRate ?? 0;
    const totalLoanTerm = this.totalLoanTermInYears();

    if (loanAmount <= 0 || interestRate < 0 || totalLoanTerm <= 0) {
      return 0;
    }
    
    return this.mortgageService.calculateMonthlyPayment(loanAmount, interestRate / 100, totalLoanTerm);
  });
  
  constructor() {
    // Recalculate whenever form values or extra payment arrays change
    effect(() => {
      const form = this.formValues();
      
      const allRecurringPayments = [...this.recurringPayments()];
      const extraMonthlyFromSlider = this.extraMonthlyPayment();
      if (extraMonthlyFromSlider > 0) {
        allRecurringPayments.push({
          amount: extraMonthlyFromSlider,
          frequency: 'monthly'
        });
      }

      const params = {
        loanAmount: form.loanAmount ?? 0,
        interestRate: form.interestRate ?? 0,
        loanTerm: this.totalLoanTermInYears(),
        termInYears: form.termInYears ?? 0,
        startDate: form.startDate ?? new Date().toISOString().split('T')[0],
        paymentFrequency: form.paymentFrequency as PaymentFrequency ?? 'monthly',
        rateType: form.rateType as 'fixed' | 'variable' ?? 'fixed',
        annualPaymentIncreasePercentage: this.annualPaymentIncreasePercentage(),
        recurringPayments: allRecurringPayments,
        oneTimePayments: this.oneTimePayments(),
        deferments: this.deferments(),
        adHocPayments: this.adHocPayments(),
        rateChanges: this.rateChanges(),
        annualPropertyTax: form.annualPropertyTax ?? 0,
        annualHomeInsurance: form.annualHomeInsurance ?? 0,
        monthlyPMI: form.monthlyPMI ?? 0,
      };

      const { schedule, summary, baselineSchedule, fullSchedule } = this.mortgageService.generateScheduleAndSummary(params);
      this.amortizationSchedule.set(schedule);
      this.fullAmortizationSchedule.set(fullSchedule);
      this.summary.set(summary);
      this.baselineSchedule.set(baselineSchedule);
      this.summaryUpdated.emit({ 
        summary: summary, 
        formValues: this.mortgageForm.getRawValue(),
        extraMonthlyPayment: this.extraMonthlyPayment(),
        recurringPayments: this.recurringPayments()
      });
    }, { allowSignalWrites: true });
  }

  public getChartImages(): ChartImages | null {
    if (this.isGraphsVisible() && this.visualAnalysisComponent()) {
      return this.visualAnalysisComponent()!.getChartImages();
    }
    return null;
  }

  async saveAsPdf() {
    const form = this.mortgageForm.getRawValue();
    const fullParams = {
        ...form,
        loanTerm: this.totalLoanTermInYears(), // Pass combined term
        annualPaymentIncreasePercentage: this.annualPaymentIncreasePercentage(),
        recurringPayments: this.recurringPayments(),
        oneTimePayments: this.oneTimePayments(),
        deferments: this.deferments(),
        adHocPayments: this.adHocPayments(),
        rateChanges: this.rateChanges(),
    };

    const wasHidden = !this.showGraphs();
    if (wasHidden) {
        this.showGraphs.set(true);
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    const chartImages = this.visualAnalysisComponent()
      ? this.visualAnalysisComponent()!.getChartImages()
      : null;

    if (wasHidden) {
        this.showGraphs.set(false);
    }

    const aiStrategyAdvice = this.aiAdvisorComponent()?.advice() ?? null;
    const aiPaymentFrequencyAdvice = this.aiGoalSeekerComponent()?.suggestion() ?? null;

    this.pdfExportService.exportScenarioAsPdf(
      `Scenario ${this.scenarioIndex() + 1}`,
      fullParams,
      this.summary(),
      this.displaySchedule(), // Export the currently viewed schedule
      chartImages,
      aiStrategyAdvice,
      aiPaymentFrequencyAdvice
    );
  }

  exportAsCsv() {
    const schedule = this.displaySchedule();
    if (schedule.length === 0) {
      return;
    }

    const headers = [
      'Payment Number',
      'Payment Date',
      'Payment',
      'Scheduled Extra Payment',
      'Ad-Hoc Payment',
      'Principal',
      'Interest',
      'Remaining Balance'
    ];

    const csvRows = [headers.join(',')];

    schedule.forEach(entry => {
      const row = [
        entry.paymentNumber,
        entry.paymentDate.toISOString().split('T')[0], // YYYY-MM-DD
        entry.payment.toFixed(2),
        entry.scheduledExtraPayment.toFixed(2),
        entry.adHocPayment.toFixed(2),
        entry.principal.toFixed(2),
        entry.interest.toFixed(2),
        entry.remainingBalance.toFixed(2)
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `scenario-${this.scenarioIndex() + 1}-amortization.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Ad-Hoc Payments Management (from Amortization Table) ---
  onAdHocPaymentChange({ paymentNumber, amount }: { paymentNumber: number; amount: number }) {
    this.adHocPayments.update(payments => {
      const newPayments = { ...payments };
      if (amount > 0) {
        newPayments[paymentNumber] = amount;
      } else {
        delete newPayments[paymentNumber];
      }
      return newPayments;
    });
  }

  // --- "What-If" Slider Management ---
  updateInterestRate(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(value)) {
        this.mortgageForm.controls.interestRate.setValue(value);
    }
  }

  updateExtraMonthlyPayment(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.extraMonthlyPayment.set(value >= 0 ? value : 0);
  }

  // --- Annual Payment Increase Management ---
  updateAnnualPaymentIncrease(event: Event) {
    const percentage = parseFloat((event.target as HTMLInputElement).value);
    this.annualPaymentIncreasePercentage.set(percentage > 0 ? percentage : 0);
  }

  // --- Recurring Payments Management ---
  addRecurringPayment() {
    this.recurringPayments.update(payments => [...payments, { amount: 100, frequency: 'monthly' }]);
  }

  removeRecurringPayment(index: number) {
    this.recurringPayments.update(payments => payments.filter((_, i) => i !== index));
  }

  updateRecurringPaymentAmount(index: number, event: Event) {
    const amount = parseFloat((event.target as HTMLInputElement).value);
    this.recurringPayments.update(payments => {
      payments[index].amount = amount > 0 ? amount : 0;
      return [...payments];
    });
  }

  updateRecurringPaymentFrequency(index: number, event: Event) {
    const frequency = (event.target as HTMLSelectElement).value as RecurringPaymentFrequency;
    this.recurringPayments.update(payments => {
      payments[index].frequency = frequency;
      return [...payments];
    });
  }

  updateRecurringPaymentStartDate(index: number, event: Event) {
    const date = (event.target as HTMLInputElement).value;
    this.recurringPayments.update(payments => {
      payments[index].startDate = date ? date : undefined;
      return [...payments];
    });
  }

  updateRecurringPaymentEndDate(index: number, event: Event) {
    const date = (event.target as HTMLInputElement).value;
    this.recurringPayments.update(payments => {
      payments[index].endDate = date ? date : undefined;
      return [...payments];
    });
  }

  // --- One-Time Payments Management ---
  addOneTimePayment() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.oneTimePayments.update(payments => [...payments, { date: nextMonth.toISOString().split('T')[0], amount: 1000 }]);
  }

  removeOneTimePayment(index: number) {
    this.oneTimePayments.update(payments => payments.filter((_, i) => i !== index));
  }

  updateOneTimePaymentDate(index: number, event: Event) {
    const date = (event.target as HTMLInputElement).value;
    this.oneTimePayments.update(payments => {
      payments[index].date = date;
      return [...payments];
    });
  }

  updateOneTimePaymentAmount(index: number, event: Event) {
    const amount = parseFloat((event.target as HTMLInputElement).value);
    this.oneTimePayments.update(payments => {
      payments[index].amount = amount > 0 ? amount : 0;
      return [...payments];
    });
  }

  // --- Deferments Management ---
  addDeferment() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 2); // Default 2 months out
    this.deferments.update(dates => [...dates, nextMonth.toISOString().split('T')[0]]);
  }

  removeDeferment(index: number) {
    this.deferments.update(dates => dates.filter((_, i) => i !== index));
  }

  updateDefermentDate(index: number, event: Event) {
    const date = (event.target as HTMLInputElement).value;
    this.deferments.update(dates => {
      dates[index] = date;
      return [...dates];
    });
  }

  // --- Rate Changes Management ---
  addRateChange() {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    this.rateChanges.update(changes => [...changes, { date: nextYear.toISOString().split('T')[0], rate: this.mortgageForm.value.interestRate ?? 5.0 }]);
  }

  removeRateChange(index: number) {
    this.rateChanges.update(changes => changes.filter((_, i) => i !== index));
  }
  
  updateRateChangeDate(index: number, event: Event) {
    const date = (event.target as HTMLInputElement).value;
    this.rateChanges.update(changes => {
      changes[index].date = date;
      return [...changes];
    });
  }

  updateRateChangeRate(index: number, event: Event) {
    const rate = parseFloat((event.target as HTMLInputElement).value);
    this.rateChanges.update(changes => {
      changes[index].rate = rate > 0 ? rate : 0;
      return [...changes];
    });
  }
}