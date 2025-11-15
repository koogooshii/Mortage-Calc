



import { Component, ChangeDetectionStrategy, output } from '@angular/core';

export type CalculatorMode = 'toolkit' | 'compare' | 'refinance' | 'history' | 'features' | 'planner' | 'rental' | 'heloc' | 'blended' | 'portability';

interface DashboardItem {
  id: CalculatorMode;
  title: string;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  modeSelected = output<CalculatorMode>();

  tools: DashboardItem[] = [
    {
      id: 'planner',
      title: 'Pre-Purchase Planner',
      description: 'A comprehensive toolkit for Canadian home buyers to analyze affordability, stress tests, closing costs, and HBP.',
      icon: 'clipboard-document-check',
      color: 'blue',
    },
    {
      id: 'refinance',
      title: 'Refinance & Penalty',
      description: 'Analyze refinancing, calculate breakeven points, and estimate early renewal penalties in one place.',
      icon: 'arrows-right-left',
      color: 'yellow',
    },
     {
      id: 'blended',
      title: 'Blended Mortgage',
      description: 'Model a "blend and extend" scenario to access more funds without breaking your current mortgage term.',
      icon: 'swirl',
      color: 'indigo',
    },
    {
      id: 'portability',
      title: 'Mortgage Portability',
      description: 'Analyze whether to port your existing mortgage to a new home or get a new one, comparing costs and benefits.',
      icon: 'truck',
      color: 'orange',
    },
    {
      id: 'rental',
      title: 'Rental Investment',
      description: 'Analyze the profitability of a rental property, calculating cash flow, cap rate, and cash-on-cash return.',
      icon: 'building-office',
      color: 'lime',
    },
    {
      id: 'heloc',
      title: 'HELOC Calculator',
      description: 'Model a Home Equity Line of Credit, including draw and repayment periods, to see your potential borrowing power.',
      icon: 'banknotes',
      color: 'teal',
    },
    {
      id: 'history',
      title: 'Loan History Tracker',
      description: 'Track your mortgage from the beginning, through events like refinancing, to see your full journey.',
      icon: 'chart-bar-square',
      color: 'fuchsia',
    },
    {
      id: 'features',
      title: 'Roadmap & Changelog',
      description: 'View the latest updates, see what features are currently implemented, and check out what\'s coming next.',
      icon: 'list-bullet',
      color: 'green',
    }
  ];

  selectMode(mode: CalculatorMode) {
    this.modeSelected.emit(mode);
  }
}