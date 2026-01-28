import { Component, ChangeDetectionStrategy } from '@angular/core';

interface Feature {
  title: string;
  description: string;
  icon: string;
  status: 'Not Started' | 'In Progress' | 'Done';
}

@Component({
  selector: 'app-feature-suggestions',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-suggestions.component.html',
})
export class FeatureSuggestionsComponent {
  
  readonly version = '1.5';

  readonly changelog = [
    {
      version: '1.5',
      date: new Date().toISOString().split('T')[0],
      notes: [
        'Feature: Added a Blended Mortgage Calculator to model "blend and extend" scenarios.',
        'Feature: Added a Mortgage Portability Analyzer to compare porting vs. breaking a mortgage when moving.',
        'Feature: Added a Shared Equity (FTHBI) Modeler to analyze the impact of shared equity mortgages on payments and profit.',
      ]
    },
    {
      version: '1.4',
      date: new Date().toISOString().split('T')[0],
      notes: [
        'Major Refactor: Combined Affordability, Stress Test, LTT, CMHC, and HBP calculators into a unified "Pre-Purchase Planner".',
        'Enhancement: Integrated the Early Renewal Penalty calculator directly into the Refinance workflow.',
        'UX: Simplified the main dashboard for clarity and ease of navigation, reducing the number of tools shown.',
        'Roadmap: Added new suggestions for future Canadian-focused features.',
      ]
    },
    {
      version: '1.3',
      date: new Date().toISOString().split('T')[0],
      notes: [
        'Feature: Added Land Transfer Tax calculator for Canadian regions.',
        'Feature: Added CMHC Insurance Premium calculator.',
        'Feature: Added RRSP Home Buyers\' Plan (HBP) modeler.',
      ]
    },
    {
      version: '1.2',
      date: new Date().toISOString().split('T')[0],
      notes: [
        'Feature: Added a Mortgage Stress Test calculator to model affordability based on Canadian qualifying rules.',
      ]
    },
    {
      version: '1.1',
      date: new Date().toISOString().split('T')[0],
      notes: [
        'Feature: Added Canadian mortgage rules, including options for semi-annual compounding.',
        'Feature: Enhanced PDF reports with more detailed summaries and improved chart rendering.',
        'Feature: Implemented visual annotations on the Loan History chart to mark key events like refinancing and renewals.',
        'UX: Added hover tooltips to many input fields across all calculators to explain complex terms.'
      ]
    },
    {
      version: '1.0',
      date: '2024-07-26',
      notes: [
        'Initial release of the Advanced Mortgage Calculator.',
        'Feature: Central Dashboard for tool navigation.',
        'Feature: Scenario Comparison for up to 3 loans.',
        'Feature: What-If Analysis with interactive sliders.',
        'Feature: Advanced Prepayment Options (recurring, one-time, annual increase).',
        'Feature: Refinance Analysis calculator.',
        'Feature: Visual analysis graphs and PITI charts.',
        'Feature: PDF and CSV data exporting.',
        'Feature: Integrated AI Advisors for strategy suggestions.',
        'Feature: Home Affordability Calculator.',
        'Feature: Early Renewal Penalty Calculator.',
        'Feature: Persistent Data Storage for Scenarios and Loan History.',
        'Feature: AI-Powered Local Tax & Insurance Estimator (U.S. ZIP codes).'
      ]
    }
  ];

  readonly roadmap: Feature[] = [];
}
