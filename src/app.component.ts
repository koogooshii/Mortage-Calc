
import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { MortgageCalculatorComponent } from './components/mortgage-calculator/mortgage-calculator.component';
import { RefinanceCalculatorComponent } from './components/refinance-calculator/refinance-calculator.component';
import { LoanHistoryComponent } from './components/loan-history/loan-history.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MortgageCalculatorComponent, RefinanceCalculatorComponent, LoanHistoryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {
  mode = signal<'compare' | 'refinance' | 'history'>('compare');

  scenarios = signal([{}]);
  scenarioColors = ['cyan', 'fuchsia', 'yellow'];

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

  setMode(newMode: 'compare' | 'refinance' | 'history') {
    this.mode.set(newMode);
  }

  addScenario() {
    if (this.scenarios().length < 3) {
      this.scenarios.update(s => [...s, {}]);
    }
  }

  removeScenario(index: number) {
    if (this.scenarios().length > 1) {
      this.scenarios.update(s => s.filter((_, i) => i !== index));
    }
  }
}