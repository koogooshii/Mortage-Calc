import { Component, ChangeDetectionStrategy, inject, signal, effect, computed, input, output, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MortgageService } from '../../services/mortgage.service';
import { AmortizationEntry, MortgageSummary, OneTimePayment, RecurringPayment, PaymentFrequency, RecurringPaymentFrequency, RateChange } from '../../models/mortgage.model';
import { AmortizationTableComponent } from '../amortization-table/amortization-table.component';
import { AiAdvisorComponent } from '../ai-advisor/ai-advisor.component';
import { VisualAnalysisComponent } from '../visual-analysis/visual-analysis.component';
import { PdfExportService, ChartImages } from '../../services/pdf-export.service';
import { AiGoalSeekerComponent } from '../ai-goal-seeker/ai-goal-seeker.component';
import { ScenarioState } from '../../models/scenario.model';
import { GeminiAiService } from '../../services/gemini-ai.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export type { ScenarioState };

@Component({
  selector: 'app-mortgage-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CurrencyPipe, DatePipe, AmortizationTableComponent, AiAdvisorComponent, VisualAnalysisComponent, AiGoalSeekerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mortgage-calculator.component.html',
})
export class MortgageCalculatorComponent {
  private fb = inject(FormBuilder);
  private mortgageService = inject(MortgageService);
  private pdfExportService = inject(PdfExportService);
  private geminiAiService = inject(GeminiAiService);

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
    cyan: '#22d3ee',
    fuchsia: '#d946ef',
    yellow: '#eab308',
  };
  sliderAccentColor = computed(() => this.accentColors[this.color()] || this.accentColors['cyan']);

  // Form Group for core mortgage parameters
  mortgageForm = this.fb.group({
    loanAmount: [0], interestRate: [0], loanTerm: [0], loanTermMonths: [0],
    termInYears: [0], startDate: [''], paymentFrequency: ['monthly' as PaymentFrequency],
    rateType: ['fixed' as 'fixed' | 'variable'], annualPropertyTax: [0],
    annualHomeInsurance: [0], monthlyPMI: [0],
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
      this.annualPaymentIncreasePercentage.set(s.annualPaymentIncreasePercentage);
      this.recurringPayments.set(s.recurringPayments);
      this.oneTimePayments.set(s.oneTimePayments);
      this.deferments.set(s.deferments);
      this.adHocPayments.set(s.adHocPayments);
      this.rateChanges.set(s.rateChanges);
    }, { allowSignalWrites: true });

    // When local state changes, emit it to the parent
    this.mortgageForm.valueChanges.pipe(debounceTime(300), distinctUntilChanged(this.isEqual)).subscribe(formValues => this.emitStateChange());
    
    effect(() => {
      this.extraMonthlyPayment(); this.annualPaymentIncreasePercentage();
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
        allRecurringPayments.push({ amount: state.extraMonthlyPayment, frequency: 'monthly' });
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
      annualPaymentIncreasePercentage: this.annualPaymentIncreasePercentage(),
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
    const headers = ['#','Date','Payment','Scheduled Extra','Ad-Hoc Extra','Principal','Interest','Balance'];
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

  updateInterestRate(event: Event) { this.mortgageForm.controls.interestRate.setValue(parseFloat((event.target as HTMLInputElement).value) || 0); }
  updateExtraMonthlyPayment(event: Event) { this.extraMonthlyPayment.set(parseFloat((event.target as HTMLInputElement).value) || 0); }
  updateAnnualPaymentIncrease(event: Event) { this.annualPaymentIncreasePercentage.set(parseFloat((event.target as HTMLInputElement).value) || 0); }
  
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