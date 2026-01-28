import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GlossaryTerm {
    term: string;
    definition: string;
    category: 'Core' | 'Time' | 'Types' | 'Payments' | 'Ratios' | 'Other';
}

@Component({
    selector: 'app-glossary',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-6">
      <!-- Search and Filter -->
      <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700 sticky top-4 z-10">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1 relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-400">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search terms..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-gray-600 focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm transition-colors duration-200"
            />
          </div>
          <div class="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              *ngFor="let cat of categories"
              (click)="selectedCategory.set(cat)"
              class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-200"
              [class.bg-cyan-600]="selectedCategory() === cat"
              [class.text-white]="selectedCategory() === cat"
              [class.bg-gray-700]="selectedCategory() !== cat"
              [class.text-gray-300]="selectedCategory() !== cat"
              [class.hover:bg-gray-600]="selectedCategory() !== cat"
            >
              {{ cat }}
            </button>
          </div>
        </div>
      </div>

      <!-- Terms Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (item of filteredTerms(); track item.term) {
          <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700 hover:border-cyan-500/50 transition-all duration-300">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-lg font-bold text-white">{{ item.term }}</h3>
              <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-gray-700 text-gray-400">
                {{ item.category }}
              </span>
            </div>
            <p class="text-gray-300 text-sm leading-relaxed">{{ item.definition }}</p>
          </div>
        } @empty {
          <div class="col-span-full text-center py-12 text-gray-400">
            No terms found matching your search.
          </div>
        }
      </div>
    </div>
  `
})
export class GlossaryComponent {
    searchQuery = signal('');
    selectedCategory = signal<string>('All');
    categories = ['All', 'Core', 'Time', 'Types', 'Payments', 'Ratios', 'Other'];

    terms: GlossaryTerm[] = [
        // Core
        { term: 'Mortgage', category: 'Core', definition: 'A loan secured by real estate. You repay the borrowed amount (principal) plus interest over time.' },
        { term: 'Principal', category: 'Core', definition: 'The amount of money you actually borrowed. Interest is calculated on this amount.' },
        { term: 'Interest', category: 'Core', definition: 'The cost of borrowing money, expressed as a percentage of the principal.' },
        { term: 'Lender', category: 'Core', definition: 'The financial institution (bank, credit union, etc.) that loans you the money.' },

        // Time
        { term: 'Amortization Period', category: 'Time', definition: 'The total time it takes to pay off your mortgage in full (e.g., 25 years). Longer amortization = lower monthly payments but more total interest.' },
        { term: 'Mortgage Term', category: 'Time', definition: 'The length of your current contract (e.g., 5 years). At the end, you must renew or switch lenders.' },
        { term: 'Maturity Date', category: 'Time', definition: 'The last day of your current mortgage term.' },
        { term: 'Closing Date', category: 'Time', definition: 'The date the sale is final, funds are transferred, and you take possession of the home.' },

        // Types
        { term: 'Fixed-Rate Mortgage', category: 'Types', definition: 'The interest rate stays the same for the entire term, offering predictable payments.' },
        { term: 'Variable-Rate Mortgage', category: 'Types', definition: 'The interest rate fluctuates with the prime rate. Payments may change or the principal/interest split may shift.' },
        { term: 'High-Ratio Mortgage', category: 'Types', definition: 'A mortgage with less than 20% down payment. Requires mortgage default insurance (CMHC).' },
        { term: 'Conventional Mortgage', category: 'Types', definition: 'A mortgage with 20% or more down payment. Does not require default insurance.' },
        { term: 'Open Mortgage', category: 'Types', definition: 'Allows you to pay off the mortgage at any time without penalty, usually at a higher interest rate.' },

        // Payments
        { term: 'Down Payment', category: 'Payments', definition: 'The upfront money you pay for the home. Minimum is 5% for homes under $500k.' },
        { term: 'Prepayment Privilege', category: 'Payments', definition: 'The ability to make extra payments on your mortgage principal without penalty.' },
        { term: 'Prepayment Charge', category: 'Payments', definition: 'A fee charged if you break your mortgage contract or pay more than allowed early.' },

        // Ratios & Insurance
        { term: 'LTV (Loan-to-Value)', category: 'Ratios', definition: 'The ratio of your loan amount to the property value. High LTV = higher risk.' },
        { term: 'GDS (Gross Debt Service)', category: 'Ratios', definition: 'Percentage of gross income covering housing costs (mortgage + taxes + heat). Should be < 32-39%.' },
        { term: 'TDS (Total Debt Service)', category: 'Ratios', definition: 'Percentage of gross income covering all debts (housing + cars + cards). Should be < 40-44%.' },
        { term: 'Stress Test', category: 'Ratios', definition: 'Qualifying at a higher rate (contract + 2% or 5.25%) to ensure you can afford payments if rates rise.' },
        { term: 'Mortgage Default Insurance', category: 'Ratios', definition: 'Mandatory insurance for high-ratio mortgages (down payment < 20%) to protect the lender.' },

        // Other
        { term: 'Appraisal', category: 'Other', definition: 'An estimate of the property\'s value by a professional.' },
        { term: 'Closing Costs', category: 'Other', definition: 'Extra fees paid at closing (legal fees, land transfer tax, etc.), typically 1.5-4% of purchase price.' },
        { term: 'Title Insurance', category: 'Other', definition: 'Protects against losses due to title defects or fraud.' },
        { term: 'Portability', category: 'Other', definition: 'Moving your existing mortgage conditions to a new property.' },
    ];

    filteredTerms = computed(() => {
        const query = this.searchQuery().toLowerCase();
        const category = this.selectedCategory();

        return this.terms.filter(item => {
            const matchesSearch = item.term.toLowerCase().includes(query) || item.definition.toLowerCase().includes(query);
            const matchesCategory = category === 'All' || item.category === category;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => a.term.localeCompare(b.term));
    });
}
