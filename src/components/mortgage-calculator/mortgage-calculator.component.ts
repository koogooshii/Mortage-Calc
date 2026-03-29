import { Component, ChangeDetectionStrategy, inject, signal, effect, computed, input, output, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';
import { AmortizationEntry, MortgageSummary, OneTimePayment, RecurringPayment, PaymentFrequency, RecurringPaymentFrequency, RateChange } from '../../models/mortgage.model';
import { AmortizationTableComponent } from '../amortization-table/amortization-table.component';
import { AiAdvisorComponent } from '../ai-advisor/ai-advisor.component';
import { VisualAnalysisComponent } from '../visual-analysis/visual-analysis.component';
import { PdfExportService, ChartImages } from '../../services/pdf-export.service';
import { AiGoalSeekerComponent } from '../ai-goal-seeker/ai-goal-seeker.component';
import { ScenarioState } from '../../models/scenario.model';
import { ScenarioPersistenceService } from '../../services/scenario-persistence.service';
import { GeminiAiService } from '../../services/gemini-ai.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export type { ScenarioState };

@Component({
  selector: 'app-mortgage-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe, DatePipe, DecimalPipe, AmortizationTableComponent, AiAdvisorComponent, VisualAnalysisComponent, AiGoalSeekerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mortgage-calculator.component.html',
})
export class MortgageCalculatorComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  private pdfExportService = inject(PdfExportService);
  private geminiAiService = inject(GeminiAiService);
  private persistenceService = inject(ScenarioPersistenceService);

  // --- Inputs / Outputs for State Management ---
  state = input.required<ScenarioState>();
  stateChange = output<ScenarioState>();

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
    indigo: '#6366f1',
    rose: '#f43f5e',
    amber: '#f59e0b',
    cyan: '#22d3ee',
    fuchsia: '#d946ef',
    yellow: '#eab308',
  };
  sliderAccentColor = computed(() => this.accentColors[this.color()] || this.accentColors['cyan']);

  // Form Group for core mortgage parameters
  mortgageForm = this.fb.group({
    purchasePrice: [0], downPayment: [0], downPaymentPercentage: [0],
    loanAmount: [0], interestRate: [0], loanTerm: [0], loanTermMonths: [0],
    termInYears: [0], startDate: [''], paymentFrequency: ['monthly' as PaymentFrequency],
    rateType: ['fixed' as 'fixed' | 'variable'], annualPropertyTax: [0],
    annualHomeInsurance: [0], monthlyPMI: [0],
  });

  // Computed signal for CMHC insurance
  cmhcInsurance = computed(() => {
    const form = this.state().formValues;
    return this.mortgageService.calculateCmhcInsurance(form.purchasePrice ?? 0, form.downPayment ?? 0);
  });

  // Computed signal for down payment percentage
  calculatedDownPaymentPercentage = computed(() => {
    const form = this.state().formValues;
    const purchasePrice = form.purchasePrice ?? 0;
    const downPayment = form.downPayment ?? 0;
    if (purchasePrice <= 0) return 0;
    return (downPayment / purchasePrice) * 100;
  });

  // Computed signal for loan amount with CMHC
  loanAmountWithCmhc = computed(() => {
    const form = this.state().formValues;
    return (form.loanAmount ?? 0) + this.cmhcInsurance();
  });

  // Signals for dynamic extra payments and deferments
  extraMonthlyPayment = signal<number>(0);
  annualPaymentIncreasePercentage = signal<number>(0);
  maxAnnualPrepaymentPercentage = signal<number>(20); // Default 20% of original loan
  recurringPayments = signal<RecurringPayment[]>([]);
  oneTimePayments = signal<OneTimePayment[]>([]);
  deferments = signal<string[]>([]);
  adHocPayments = signal<{ [paymentNumber: number]: number }>({});
  rateChanges = signal<RateChange[]>([]);

  // Extra payment frequency (separate from main payment frequency)
  extraPaymentFrequency = signal<PaymentFrequency>('monthly');

  // Insurance & Tax collapsible state (default collapsed)
  insuranceTaxCollapsed = signal<boolean>(true);

  // Year selection for prepayments
  selectedYears = signal<number[]>([]);

  // Signals for calculation results
  summary = signal<MortgageSummary | null>(null);
  amortizationSchedule = signal<AmortizationEntry[]>([]);
  fullAmortizationSchedule = signal<AmortizationEntry[]>([]);
  baselineSchedule = signal<AmortizationEntry[]>([]);

  amortizationScope = signal<'term' | 'full'>('term');
  displaySchedule = computed(() => this.amortizationScope() === 'term'
    ? this.amortizationSchedule()
    : this.fullAmortizationSchedule());

  yearlyExtraPayments = computed(() => {
    const summary = this.summary();
    if (!summary?.totalExtraPayments || !summary.extraPaymentsByYear) return [];
    return Object.entries(summary.extraPaymentsByYear)
      .map(([year, amount]) => ({ year: parseInt(year, 10), amount }))
      .sort((a, b) => a.year - b.year);
  });

  showAdvisor = signal(false);
  showGraphs = signal(false);
  activeTab = signal<'basic' | 'extra' | 'costs'>('basic');
  isGraphsVisible = computed(() => this.hideHeader() ? this.graphsVisible() : this.showGraphs());

  visualAnalysisComponent = viewChild(VisualAnalysisComponent);
  aiAdvisorComponent = viewChild(AiAdvisorComponent);
  aiGoalSeekerComponent = viewChild(AiGoalSeekerComponent);

  totalLoanTermInYears = computed(() => {
    const form = this.state().formValues;
    return (form.loanTerm ?? 0) + ((form.loanTermMonths ?? 0) / 12);
  });

  baseMonthlyPayment = computed(() => {
    const { loanAmount, interestRate } = this.state().formValues;
    const totalLoanTerm = this.totalLoanTermInYears();
    if (!loanAmount || !interestRate || !totalLoanTerm) return 0;
    return this.mortgageService.calculateMonthlyPayment(loanAmount, interestRate / 100, totalLoanTerm);
  });

  constructor() {
    // Sync state from parent input to local form/signals
    effect(() => {
      const s = this.state();
      this.mortgageForm.patchValue(s.formValues, { emitEvent: false });
      this.extraMonthlyPayment.set(s.extraMonthlyPayment);
      this.extraPaymentFrequency.set(s.extraPaymentFrequency);
      this.annualPaymentIncreasePercentage.set(s.annualPaymentIncreasePercentage);
      this.maxAnnualPrepaymentPercentage.set(s.maxAnnualPrepaymentPercentage ?? 20);
      this.recurringPayments.set(s.recurringPayments);
      this.oneTimePayments.set(s.oneTimePayments);
      this.deferments.set(s.deferments);
      this.adHocPayments.set(s.adHocPayments);
      this.rateChanges.set(s.rateChanges);
    }, { allowSignalWrites: true });

    // When local state changes, emit it to the parent
    this.mortgageForm.valueChanges.pipe(debounceTime(300), distinctUntilChanged(this.isEqual)).subscribe(formValues => this.emitStateChange());

    effect(() => {
      this.extraMonthlyPayment(); this.extraPaymentFrequency(); this.annualPaymentIncreasePercentage();
      this.recurringPayments(); this.oneTimePayments(); this.deferments();
      this.adHocPayments(); this.rateChanges();
      this.emitStateChange();
    });

    // Perform calculation when any relevant state changes
    effect(() => {
      const state = this.state();
      const form = state.formValues;
      const allRecurringPayments = [...state.recurringPayments];
      if (state.extraMonthlyPayment > 0) {
        // Use the extra payment frequency, converting to RecurringPaymentFrequency
        const extraFreq = state.extraPaymentFrequency as RecurringPaymentFrequency;
        allRecurringPayments.push({ amount: state.extraMonthlyPayment, frequency: extraFreq });
      }

      const params = {
        ...form,
        loanTerm: this.totalLoanTermInYears(),
        annualPaymentIncreasePercentage: state.annualPaymentIncreasePercentage,
        recurringPayments: allRecurringPayments,
        oneTimePayments: state.oneTimePayments,
        deferments: state.deferments,
        adHocPayments: state.adHocPayments,
        rateChanges: state.rateChanges,
      };

      const { schedule, summary, baselineSchedule, fullSchedule } = this.mortgageService.generateScheduleAndSummary(params as any);
      this.amortizationSchedule.set(schedule);
      this.fullAmortizationSchedule.set(fullSchedule);
      this.summary.set(summary);
      this.baselineSchedule.set(baselineSchedule);

      this.summaryUpdated.emit({
        summary,
        formValues: form,
        extraMonthlyPayment: state.extraMonthlyPayment,
        recurringPayments: state.recurringPayments
      });
    }, { allowSignalWrites: true });
  }

  private isEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private emitStateChange() {
    if (!this.mortgageForm) return;
    const currentState: ScenarioState = {
      formValues: this.mortgageForm.getRawValue(),
      extraMonthlyPayment: this.extraMonthlyPayment(),
      extraPaymentFrequency: this.extraPaymentFrequency(),
      annualPaymentIncreasePercentage: this.annualPaymentIncreasePercentage(),
      maxAnnualPrepaymentPercentage: this.maxAnnualPrepaymentPercentage(),
      recurringPayments: this.recurringPayments(),
      oneTimePayments: this.oneTimePayments(),
      deferments: this.deferments(),
      adHocPayments: this.adHocPayments(),
      rateChanges: this.rateChanges(),
    };
    // Only emit if there's an actual change from the input to prevent loops
    if (!this.isEqual(this.state(), currentState)) {
      this.stateChange.emit(currentState);
    }
  }

  public getChartImages(): ChartImages | null {
    if (this.isGraphsVisible() && this.visualAnalysisComponent()) {
      return this.visualAnalysisComponent()!.getChartImages();
    }
    return null;
  }

  async saveAsPdf() {
    const fullParams = { ...this.state().formValues, loanTerm: this.totalLoanTermInYears(), ...this.state() };
    const wasHidden = !this.showGraphs();
    if (wasHidden) { this.showGraphs.set(true); await new Promise(r => setTimeout(r, 50)); }
    const chartImages = this.visualAnalysisComponent()?.getChartImages() ?? null;
    if (wasHidden) { this.showGraphs.set(false); }
    const aiStrategyAdvice = this.aiAdvisorComponent()?.advice() ?? null;
    const aiPaymentFrequencyAdvice = this.aiGoalSeekerComponent()?.suggestion() ?? null;
    this.pdfExportService.exportScenarioAsPdf(`Scenario ${this.scenarioIndex() + 1}`, fullParams, this.summary(), this.displaySchedule(), chartImages, aiStrategyAdvice, aiPaymentFrequencyAdvice);
  }

  exportAsCsv() {
    const schedule = this.displaySchedule();
    if (schedule.length === 0) return;
    const headers = ['#', 'Date', 'Payment', 'Scheduled Extra', 'Ad-Hoc Extra', 'Principal', 'Interest', 'Balance'];
    const csvRows = [headers.join(',')];
    schedule.forEach(e => csvRows.push([e.paymentNumber, e.paymentDate.toISOString().split('T')[0], e.payment.toFixed(2), e.scheduledExtraPayment.toFixed(2), e.adHocPayment.toFixed(2), e.principal.toFixed(2), e.interest.toFixed(2), e.remainingBalance.toFixed(2)].join(',')));
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scenario-${this.scenarioIndex() + 1}-amortization.csv`;
    link.click();
  }

  onAdHocPaymentChange({ paymentNumber, amount }: { paymentNumber: number; amount: number }) {
    this.adHocPayments.update(p => ({ ...p, [paymentNumber]: amount > 0 ? amount : undefined }));
  }

  // Purchase price and down payment handlers
  updatePurchasePrice(event: Event) {
    const purchasePrice = parseFloat((event.target as HTMLInputElement).value) || 0;
    const form = this.mortgageForm;
    const currentDownPayment = form.value.downPayment || 0;
    const currentDownPaymentPercentage = form.value.downPaymentPercentage || 0;

    // If user changes purchase price, recalculate loan amount based on down payment
    // Or if down payment percentage is set, use that
    if (currentDownPaymentPercentage > 0) {
      const newDownPayment = purchasePrice * (currentDownPaymentPercentage / 100);
      const newLoanAmount = purchasePrice - newDownPayment;
      form.patchValue({
        purchasePrice,
        downPayment: newDownPayment,
        loanAmount: newLoanAmount
      }, { emitEvent: false });
    } else {
      // Keep current down payment, recalculate loan amount
      const newLoanAmount = purchasePrice - currentDownPayment;
      form.patchValue({
        purchasePrice,
        loanAmount: Math.max(0, newLoanAmount)
      }, { emitEvent: false });
    }
    this.emitStateChange();
  }

  updateDownPayment(event: Event) {
    const downPayment = parseFloat((event.target as HTMLInputElement).value) || 0;
    const purchasePrice = this.mortgageForm.value.purchasePrice || 0;
    const downPaymentPercentage = purchasePrice > 0 ? (downPayment / purchasePrice) * 100 : 0;
    const loanAmount = Math.max(0, purchasePrice - downPayment);

    this.mortgageForm.patchValue({
      downPayment,
      downPaymentPercentage,
      loanAmount
    }, { emitEvent: false });
    this.emitStateChange();
  }

  updateDownPaymentPercentage(event: Event) {
    const downPaymentPercentage = parseFloat((event.target as HTMLInputElement).value) || 0;
    const purchasePrice = this.mortgageForm.value.purchasePrice || 0;
    const downPayment = purchasePrice * (downPaymentPercentage / 100);
    const loanAmount = Math.max(0, purchasePrice - downPayment);

    this.mortgageForm.patchValue({
      downPaymentPercentage,
      downPayment,
      loanAmount
    }, { emitEvent: false });
    this.emitStateChange();
  }

  updateInterestRate(event: Event) { this.mortgageForm.controls.interestRate.setValue(parseFloat((event.target as HTMLInputElement).value) || 0); }
  updateExtraMonthlyPayment(event: Event) { this.extraMonthlyPayment.set(parseFloat((event.target as HTMLInputElement).value) || 0); }
  updateExtraMonthlyPaymentDirect(amount: number) { this.extraMonthlyPayment.set(amount); }
  updateAnnualPaymentIncrease(event: Event) { this.annualPaymentIncreasePercentage.set(parseFloat((event.target as HTMLInputElement).value) || 0); }
  updateMaxAnnualPrepayment(event: Event) { this.maxAnnualPrepaymentPercentage.set(parseFloat((event.target as HTMLInputElement).value) || 0); }
  updateExtraPaymentFrequency(event: Event) {
    this.extraPaymentFrequency.set((event.target as HTMLSelectElement).value as PaymentFrequency);
  }

  // Tooltip display state
  activeTooltip = signal<string | null>(null);

  // Tooltip messages
  private tooltipMessages: { [key: string]: string } = {
    loanAmount: 'The total amount you are borrowing. This is typically the purchase price minus your down payment.',
    interestRate: 'The annual interest rate charged by your lender. For variable rates, this may change over time.',
    amortization: 'The total time to pay off your mortgage completely. Common terms are 15, 20, or 25 years.',
    frequency: 'How often you make payments. Accelerated bi-weekly means you make 26 payments per year (half your monthly payment every 2 weeks), paying off faster.',
    pmi: 'Private Mortgage Insurance. Required if your down payment is less than 20% of the home value.',
    propertyTax: 'Annual property taxes assessed by your local government, typically paid monthly into an escrow account.',
  };

  showTooltip(key: string) {
    if (this.activeTooltip() === key) {
      this.activeTooltip.set(null);
    } else {
      this.activeTooltip.set(key);
    }
  }

  getTooltipMessage(key: string): string {
    return this.tooltipMessages[key] || '';
  }

  // Input validation
  getValidationError(field: string): string | null {
    const value = this.mortgageForm.get(field)?.value;
    switch (field) {
      case 'loanAmount':
        if (value === 0 || value === null || value === undefined) return null; // Allow zero initially
        if (value < 0) return 'Loan amount cannot be negative';
        if (value > 100000000) return 'Loan amount seems too high';
        return null;
      case 'interestRate':
        if (value === 0 || value === null || value === undefined) return null;
        if (value < 0) return 'Interest rate cannot be negative';
        if (value > 30) return 'Interest rate seems too high';
        return null;
      default:
        return null;
    }
  }

  // Reset to defaults
  resetToDefaults() {
    const defaults = this.persistenceService.getDefaultScenario();
    this.mortgageForm.patchValue(defaults.formValues, { emitEvent: true });
    this.extraMonthlyPayment.set(defaults.extraMonthlyPayment);
    this.extraPaymentFrequency.set(defaults.extraPaymentFrequency);
    this.annualPaymentIncreasePercentage.set(defaults.annualPaymentIncreasePercentage);
    this.maxAnnualPrepaymentPercentage.set(defaults.maxAnnualPrepaymentPercentage);
    this.recurringPayments.set([]);
    this.oneTimePayments.set([]);
    this.deferments.set([]);
    this.adHocPayments.set({});
    this.rateChanges.set([]);
  }

  // Max annual prepayment helpers - returns mortgage year (1, 2, 3, etc. starting from loan start)
  getMortgageYear(): number {
    const form = this.state().formValues;
    const startDate = form.startDate ? new Date(form.startDate) : new Date();
    const now = new Date();

    // Calculate the difference in days from start date to now
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / msPerDay);

    // Mortgage year is 1-indexed, each year is 52 weeks (364 days)
    const mortgageYear = Math.floor(daysDiff / 364) + 1;
    return Math.max(1, mortgageYear);
  }

  // Get the max annual prepayment amount (percentage of original loan)
  getMaxAnnualPrepaymentAmount(): number {
    const form = this.state().formValues;
    const loanAmount = form.loanAmount ?? 0;
    return loanAmount * (this.maxAnnualPrepaymentPercentage() / 100);
  }

  // Calculate remaining prepayment allowance for the current mortgage year
  getCurrentYearPrepaymentRemaining(): number {
    const summary = this.summary();
    const currentMortgageYear = this.getMortgageYear();

    if (!summary) return this.getMaxAnnualPrepaymentAmount();

    // Get extra payments by year from the schedule
    const extraPaymentsByYear = summary.extraPaymentsByYear || {};

    // Calculate the mortgage year date range (364 days = 52 weeks)
    const startDate = this.state().formValues.startDate ? new Date(this.state().formValues.startDate) : new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const msPerYear = 364 * msPerDay;

    // Current mortgage year starts at startDate + (currentYear - 1) * 364 days
    const currentMortgageYearStart = new Date(startDate.getTime() + (currentMortgageYear - 1) * msPerYear);
    const currentMortgageYearEnd = new Date(currentMortgageYearStart.getTime() + msPerYear);

    // Sum all extra payments that fall within the current mortgage year date range
    let usedThisYear = 0;
    Object.entries(extraPaymentsByYear).forEach(([yearStr, amount]) => {
      const year = parseInt(yearStr, 10);
      // Create a date for January 1 of this year
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year + 1, 0, 1);

      // Check if this calendar year overlaps with our mortgage year range
      if (yearStart < currentMortgageYearEnd && yearEnd > currentMortgageYearStart) {
        usedThisYear += amount;
      }
    });

    const maxAllowed = this.getMaxAnnualPrepaymentAmount();
    return Math.max(0, maxAllowed - usedThisYear);
  }

  yearlyPrepaymentRemaining = computed(() => {
    // This is used to show/hide the remaining allowance display
    const summary = this.summary();
    if (!summary) return null;
    return this.getCurrentYearPrepaymentRemaining();
  });

  toggleInsuranceTaxExpanded() {
    this.insuranceTaxCollapsed.update(v => !v);
  }

  // Year selection helpers for prepayments
  getYearRange(): number[] {
    const years = this.totalLoanTermInYears();
    const maxYears = Math.ceil(years) || 30;
    return Array.from({ length: Math.min(maxYears, 30) }, (_, i) => i + 1);
  }

  isYearSelected(year: number): boolean {
    return this.selectedYears().includes(year);
  }

  toggleYear(year: number) {
    this.selectedYears.update(years => {
      if (years.includes(year)) {
        return years.filter(y => y !== year);
      } else {
        return [...years, year].sort((a, b) => a - b);
      }
    });
  }

  selectAllYears() {
    this.selectedYears.set(this.getYearRange());
  }

  clearAllYears() {
    this.selectedYears.set([]);
  }

  getSelectedYears(): number[] {
    return this.selectedYears();
  }

  addRecurringPayment() { this.recurringPayments.update(p => [...p, { amount: 100, frequency: 'monthly' }]); }
  removeRecurringPayment(i: number) { this.recurringPayments.update(p => p.filter((_, idx) => i !== idx)); }
  updateRecurringPayment<K extends keyof RecurringPayment>(i: number, field: K, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.recurringPayments.update(p => {
      const newP = [...p];
      newP[i] = { ...newP[i], [field]: field === 'amount' ? parseFloat(value) || 0 : value };
      return newP;
    });
  }

  addOneTimePayment() { const d = new Date(); d.setMonth(d.getMonth() + 1); this.oneTimePayments.update(p => [...p, { date: d.toISOString().split('T')[0], amount: 1000 }]); }
  removeOneTimePayment(i: number) { this.oneTimePayments.update(p => p.filter((_, idx) => i !== idx)); }
  updateOneTimePayment(i: number, field: 'date' | 'amount', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.oneTimePayments.update(p => {
      const newP = [...p];
      newP[i] = { ...newP[i], [field]: field === 'amount' ? parseFloat(value) || 0 : value };
      return newP;
    });
  }

  addDeferment() { const d = new Date(); d.setMonth(d.getMonth() + 2); this.deferments.update(dts => [...dts, d.toISOString().split('T')[0]]); }
  removeDeferment(i: number) { this.deferments.update(dts => dts.filter((_, idx) => i !== idx)); }
  updateDefermentDate(i: number, event: Event) { this.deferments.update(dts => { const n = [...dts]; n[i] = (event.target as HTMLInputElement).value; return n; }); }

  addRateChange() { const d = new Date(); d.setFullYear(d.getFullYear() + 1); this.rateChanges.update(c => [...c, { date: d.toISOString().split('T')[0], rate: this.mortgageForm.value.interestRate ?? 5.0 }]); }
  removeRateChange(i: number) { this.rateChanges.update(c => c.filter((_, idx) => i !== idx)); }
  updateRateChange(i: number, field: 'date' | 'rate', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.rateChanges.update(c => {
      const newC = [...c];
      newC[i] = { ...newC[i], [field]: field === 'rate' ? parseFloat(value) || 0 : value };
      return newC;
    });
  }
}