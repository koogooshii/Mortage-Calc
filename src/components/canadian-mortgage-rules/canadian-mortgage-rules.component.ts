import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-canadian-mortgage-rules',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Mortgage Rules Section -->
      <section class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
        <h2 class="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
          </svg>
          Mortgage Rules (2024 Updates)
        </h2>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div class="bg-gray-700/30 p-4 rounded-lg">
              <h3 class="font-semibold text-white text-lg mb-2">Stress Test</h3>
              <p class="text-gray-300 text-sm">
                <strong class="text-cyan-300">New Rule:</strong> As of Nov 21, 2024, homeowners switching lenders with the same amortization and loan amount are <span class="text-green-400">exempt</span> from the stress test.
              </p>
              <p class="text-gray-300 text-sm mt-2">
                <strong class="text-cyan-300">Standard:</strong> Borrowers must qualify at the higher of <strong>5.25%</strong> or <strong>contract rate + 2%</strong>.
              </p>
            </div>
            <div class="bg-gray-700/30 p-4 rounded-lg">
              <h3 class="font-semibold text-white text-lg mb-2">Insured Mortgage Cap</h3>
              <p class="text-gray-300 text-sm">
                <strong class="text-cyan-300">New Cap:</strong> Increased from $1M to <strong>$1.5 Million</strong> (effective Dec 15, 2024).
              </p>
              <p class="text-gray-300 text-sm mt-1">Allows < 20% down payment for higher-priced homes.</p>
            </div>
          </div>
          <div class="space-y-4">
             <div class="bg-gray-700/30 p-4 rounded-lg">
              <h3 class="font-semibold text-white text-lg mb-2">Amortization</h3>
              <p class="text-gray-300 text-sm">
                <strong class="text-cyan-300">30-Year Access:</strong> Expanded to <strong>all first-time homebuyers</strong> and <strong>buyers of new builds</strong> (effective Dec 15, 2024).
              </p>
              <p class="text-gray-300 text-sm mt-1">Previously limited to 25 years for insured mortgages.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Fees & Taxes Section -->
      <section class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
        <h2 class="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Additional Fees & Taxes
        </h2>
        <div class="grid md:grid-cols-3 gap-6">
          <!-- Realtor Fees -->
          <div class="bg-gray-700/30 p-4 rounded-lg border-l-4 border-yellow-500">
            <h3 class="font-semibold text-white text-lg mb-2">Realtor Fees</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li>• <strong>Total:</strong> Typically 3% - 7% of sale price.</li>
              <li>• <strong>Split:</strong> Often 2.5% buyer agent / 2.5% seller agent.</li>
              <li>• <strong>Note:</strong> Paid by the seller, but affects list price. Tax (GST/HST) applies to the fee.</li>
            </ul>
          </div>

          <!-- Land Transfer Tax -->
          <div class="bg-gray-700/30 p-4 rounded-lg border-l-4 border-yellow-500">
            <h3 class="font-semibold text-white text-lg mb-2">Land Transfer Tax (LTT)</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li>• <strong>Provincial:</strong> 0.5% - 2.5% (varies by province).</li>
              <li>• <strong>Municipal:</strong> Toronto adds an extra MLTT (doubling the cost).</li>
              <li>• <strong>Rebates:</strong> Available for first-time buyers in many regions (e.g., Ontario, BC, Toronto).</li>
            </ul>
          </div>

          <!-- Closing Costs -->
          <div class="bg-gray-700/30 p-4 rounded-lg border-l-4 border-yellow-500">
            <h3 class="font-semibold text-white text-lg mb-2">Closing Costs</h3>
            <ul class="space-y-2 text-sm text-gray-300">
              <li>• <strong>Legal Fees:</strong> $800 - $2,500+ (lawyer/notary).</li>
              <li>• <strong>Title Insurance:</strong> $200 - $500 (one-time).</li>
              <li>• <strong>Adjustments:</strong> Prepaid property taxes, utilities, etc.</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Inspections Section -->
      <section class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
        <h2 class="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
          Inspections & Due Diligence
        </h2>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="space-y-4">
             <div class="bg-gray-700/30 p-4 rounded-lg">
              <h3 class="font-semibold text-white text-lg mb-2">Home Inspection</h3>
              <p class="text-gray-300 text-sm mb-2">
                <span class="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wide">Highly Recommended</span>
              </p>
              <p class="text-gray-300 text-sm">
                <strong>Cost:</strong> $400 - $800+
              </p>
              <p class="text-gray-300 text-sm mt-1">
                Covers structure, roofing, plumbing, electrical, HVAC. Crucial for identifying hidden issues before purchase.
              </p>
            </div>
          </div>
          <div class="space-y-4">
             <div class="bg-gray-700/30 p-4 rounded-lg">
              <h3 class="font-semibold text-white text-lg mb-2">Specialized Inspections</h3>
              <ul class="space-y-2 text-sm text-gray-300">
                <li>• <strong>Well & Septic:</strong> Essential for rural properties. Water quality/quantity and system integrity.</li>
                <li>• <strong>WETT:</strong> Wood-burning appliances (fireplaces/stoves) for insurance.</li>
                <li>• <strong>Oil Tank:</strong> Check for leaks/age. Removal of old tanks is costly.</li>
                <li>• <strong>Survey:</strong> Confirms property boundaries and easements.</li>
                <li>• <strong>Radon/Mold:</strong> Health safety checks.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
})
export class CanadianMortgageRulesComponent {}
