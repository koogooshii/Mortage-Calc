



import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { MortgageCalculatorComponent, ScenarioState } from './components/mortgage-calculator/mortgage-calculator.component';
import { RefinanceCalculatorComponent } from './components/refinance-calculator/refinance-calculator.component';
import { LoanHistoryComponent } from './components/loan-history/loan-history.component';
import { DashboardComponent, CalculatorMode } from './components/dashboard/dashboard.component';
import { FeatureSuggestionsComponent } from './components/feature-suggestions/feature-suggestions.component';
import { RentalInvestmentCalculatorComponent } from './components/rental-investment-calculator/rental-investment-calculator.component';
import { HelocCalculatorComponent } from './components/heloc-calculator/heloc-calculator.component';
import { ScenarioPersistenceService } from './services/scenario-persistence.service';
import { effect } from '@angular/core';
import { PrePurchasePlannerComponent } from './components/pre-purchase-planner/pre-purchase-planner.component';
import { BlendedMortgageCalculatorComponent } from './components/blended-mortgage-calculator/blended-mortgage-calculator.component';
import { PortabilityAnalyzerComponent } from './components/portability-analyzer/portability-analyzer.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    DashboardComponent,
    MortgageCalculatorComponent,
    RefinanceCalculatorComponent,
    LoanHistoryComponent,
    FeatureSuggestionsComponent,
    RentalInvestmentCalculatorComponent,
    HelocCalculatorComponent,
    PrePurchasePlannerComponent,
    BlendedMortgageCalculatorComponent,
    PortabilityAnalyzerComponent,
    
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {
  private scenarioPersistenceService = inject(ScenarioPersistenceService);
  
  mode = signal<CalculatorMode>('compare');

  scenarios = signal<ScenarioState[]>([]);
  scenarioColors = ['cyan', 'fuchsia', 'yellow'];

  pageTitle = computed(() => {
    const currentMode = this.mode();
    if (currentMode === 'toolkit') return 'Mortgage Toolkit';
    if (currentMode === 'compare') return 'Compare Scenarios';
    if (currentMode === 'history') return 'Loan History Tracker';
    if (currentMode === 'refinance') return 'Refinance Analysis';
    if (currentMode === 'features') return 'Roadmap & Changelog';
    if (currentMode === 'planner') return 'Pre-Purchase Planner';
    if (currentMode === 'rental') return 'Rental Investment Analysis';
    if (currentMode === 'heloc') return 'HELOC Calculator';
    if (currentMode === 'blended') return 'Blended Mortgage Calculator';
    if (currentMode === 'portability') return 'Mortgage Portability Analyzer';
    
    return '';
  });

  gridClasses = computed(() => {
    const count = this.scenarios().length;
    switch (count) {
      case 1:
        return 'flex justify-center';
      case 2:
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      default:
        return 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6';
    }
  });

  constructor() {
    this.scenarios.set(this.scenarioPersistenceService.loadScenarios());
    effect(() => {
      this.scenarioPersistenceService.saveScenarios(this.scenarios());
    });
  }

  setMode(newMode: CalculatorMode) {
    this.mode.set(newMode);
  }

  onModeSelected(newMode: CalculatorMode) {
    this.mode.set(newMode);
  }

  addScenario() {
    if (this.scenarios().length < 3) {
      this.scenarios.update(s => [...s, this.scenarioPersistenceService.getDefaultScenario()]);
    }
  }

  removeScenario(index: number) {
    if (this.scenarios().length > 1) {
      this.scenarios.update(s => s.filter((_, i) => i !== index));
    }
  }

  updateScenario(index: number, newState: ScenarioState) {
    this.scenarios.update(currentScenarios => {
      const newScenarios = [...currentScenarios];
      newScenarios[index] = newState;
      return newScenarios;
    });
  }
}