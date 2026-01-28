import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mortgage-guide',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Hero Section -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-900 to-blue-900 p-8 shadow-2xl">
        <div class="relative z-10">
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Down Payment Strategy
          </h3>
          <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex gap-2">
              <span class="text-green-500 font-bold">•</span>
              <span><strong>The "Sweet Spot":</strong> While 5% is the minimum, putting down <strong>20%</strong> avoids CMHC insurance fees (saving you 2.8% - 4.0% of the loan amount).</span>
            </li>
            <li class="flex gap-2">
              <span class="text-green-500 font-bold">•</span>
              <span><strong>RRSP Home Buyers' Plan (HBP):</strong> Withdraw up to <strong>$60,000</strong> tax-free from your RRSP. Couples can combine this for $120,000!</span>
            </li>
            <li class="flex gap-2">
              <span class="text-green-500 font-bold">•</span>
              <span><strong>FHSA (First Home Savings Account):</strong> The ultimate tool. Contributions are tax-deductible (like RRSP) and withdrawals are tax-free (like TFSA).</span>
            </li>
          </ul>
        </div>

        <!-- Affordability & Pre-Approval -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
            Pre-Approval Power
          </h3>
           <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex gap-2">
              <span class="text-blue-500 font-bold">•</span>
              <span><strong>Rate Hold:</strong> A pre-approval locks in an interest rate for 90-120 days. If rates go up, you're safe. If they go down, you get the lower rate.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-blue-500 font-bold">•</span>
              <span><strong>Don't Max Out:</strong> Just because the bank approves you for $800k doesn't mean you should spend it. Leave room for lifestyle and emergencies.</span>
            </li>
             <li class="flex gap-2">
              <span class="text-blue-500 font-bold">•</span>
              <span><strong>Credit Score Tip:</strong> Don't apply for new credit cards or loans before closing. It can affect your credit score and jeopardize your mortgage.</span>
            </li>
          </ul>
        </div>

        <!-- Mortgage Types -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
            </svg>
            Fixed vs. Variable
          </h3>
          <p class="text-gray-300 text-sm mb-3">The eternal debate. Here's the cheat sheet:</p>
          <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex gap-2">
              <span class="text-purple-500 font-bold">•</span>
              <span><strong>Fixed:</strong> "Sleep at night" factor. Best if you have a tight budget and can't risk payment increases.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-purple-500 font-bold">•</span>
              <span><strong>Variable:</strong> Historically cheaper over the long run, but riskier. Best if you have cash flow flexibility.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-purple-500 font-bold">•</span>
              <span><strong>Pro Tip:</strong> If you go Variable, set your payment as if it were Fixed. You'll pay down principal faster and have a buffer if rates rise.</span>
            </li>
          </ul>
        </div>

        <!-- Hidden Costs -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Don't Forget These!
          </h3>
          <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex gap-2">
              <span class="text-red-500 font-bold">•</span>
              <span><strong>Closing Costs:</strong> Budget <strong>1.5% - 4%</strong> of the purchase price. This catches many buyers off guard.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-red-500 font-bold">•</span>
              <span><strong>Land Transfer Tax:</strong> Check if you qualify for a First-Time Home Buyer rebate to offset this.</span>
            </li>
             <li class="flex gap-2">
              <span class="text-red-500 font-bold">•</span>
              <span><strong>Adjustments:</strong> You may have to reimburse the seller for prepaid property taxes or utilities.</span>
            </li>
          </ul>
        </div>

        <!-- The Power of Frequency -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            The Power of Frequency
          </h3>
          <p class="text-gray-300 text-sm mb-3">Why "Accelerated" payments are magic:</p>
          <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex gap-2">
              <span class="text-yellow-500 font-bold">•</span>
              <span><strong>The Math:</strong> A monthly payment of $2000 = $24,000/year. An <em>Accelerated Bi-Weekly</em> payment is $1000 every two weeks. Since there are 52 weeks in a year, you make 26 payments. $1000 x 26 = <strong>$26,000/year</strong>.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-yellow-500 font-bold">•</span>
              <span><strong>The Result:</strong> You painlessly pay an extra month's worth of principal every single year. This shaves <strong>years</strong> off your amortization.</span>
            </li>
          </ul>
        </div>

        <!-- Watch Out for the Upsell -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-pink-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Watch Out for the Upsell
          </h3>
          <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex gap-2">
              <span class="text-pink-500 font-bold">•</span>
              <span><strong>Creditor Life Insurance:</strong> Banks push this hard. It's often expensive and the payout declines as your mortgage balance drops. <strong>Term Life Insurance</strong> from a third party is usually cheaper and pays out the full amount regardless of your mortgage balance.</span>
            </li>
            <li class="flex gap-2">
              <span class="text-pink-500 font-bold">•</span>
              <span><strong>Property Tax Bundling:</strong> Banks may offer to pay your property tax for you. While convenient, they might charge a fee or require a "tax buffer" in your account, tying up your cash. You're often better off paying the city directly.</span>
            </li>
          </ul>
        </div>

        <!-- Title Insurance Deep Dive -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700 md:col-span-2">
          <h3 class="text-xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Title Insurance: The Non-Negotiable
          </h3>
          
          <div class="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-4 mb-6">
            <p class="text-indigo-200 font-semibold text-center italic">
              "If you can't afford title insurance, you can't afford the house."
            </p>
          </div>

          <div class="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 class="font-bold text-white mb-2">What It Covers</h4>
              <ul class="space-y-2 text-gray-300 mb-4">
                <li class="flex gap-2"><span class="text-green-400">✓</span> Unknown title defects & liens</li>
                <li class="flex gap-2"><span class="text-green-400">✓</span> Encroachment issues & survey errors</li>
                <li class="flex gap-2"><span class="text-green-400">✓</span> Title fraud & forgery</li>
                <li class="flex gap-2"><span class="text-green-400">✓</span> Zoning non-compliance (from previous owners)</li>
              </ul>

              <h4 class="font-bold text-white mb-2">What It Doesn't Cover</h4>
              <ul class="space-y-2 text-gray-300">
                <li class="flex gap-2"><span class="text-red-400">✗</span> Known title defects</li>
                <li class="flex gap-2"><span class="text-red-400">✗</span> Environmental hazards</li>
                <li class="flex gap-2"><span class="text-red-400">✗</span> Renovations you make without permits</li>
                <li class="flex gap-2"><span class="text-red-400">✗</span> Native land claims</li>
              </ul>
            </div>

            <div>
              <h4 class="font-bold text-white mb-2">Critical Requirements</h4>
              <ul class="space-y-2 text-gray-300 mb-4">
                <li class="flex gap-2">
                  <span class="text-indigo-400 font-bold">•</span>
                  <span><strong>Inspections Required:</strong> To be fully effective, valid inspections are often required. Without them, certain coverage exclusions may apply.</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-indigo-400 font-bold">•</span>
                  <span><strong>Purchase &amp; Sale Agreement Review:</strong> Title insurance can cover work done by previous owners if permits were not obtained, provided the agreement confirms no unpermitted work. Review this clause carefully before signing.</span>
                </li>
              </ul>

              <h4 class="font-bold text-white mb-2">Levels of Coverage</h4>
              <ul class="space-y-2 text-gray-300">
                <li class="flex gap-2">
                  <span class="text-indigo-400 font-bold">1.</span>
                  <span><strong>Lender's Policy:</strong> Mandatory. Protects the bank's investment, NOT yours.</span>
                </li>
                <li class="flex gap-2">
                  <span class="text-indigo-400 font-bold">2.</span>
                  <span><strong>Owner's Policy:</strong> Optional but essential. Protects YOUR equity for as long as you own the home.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
          <!-- Older Home Inspection Checklist -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-3-3v6" />
            </svg>
            Inspecting an Older Home: What to Look For
          </h3>
          <p class="text-gray-300 text-sm mb-3">Before you schedule a professional inspection, walk through the property and watch for these red flags.</p>
          <ul class="space-y-3 text-gray-300 text-sm">
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Water Damage:</strong> Stains, mildew, warped walls, musty odors, water spots on ceilings or floors.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Roof &amp; Gutters:</strong> Missing shingles, sagging roofline, rusted gutters, granule loss in downspouts.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Foundation &amp; Cracks:</strong> Horizontal cracks in foundation walls, uneven floors, doors that stick.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Electrical System:</strong> Outdated knob‑and‑tube wiring, missing GFCI outlets, overloaded panels, flickering lights.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Plumbing:</strong> Corroded pipes, low water pressure, water stains under sinks, old copper or galvanized steel.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>HVAC:</strong> Age of furnace/air‑conditioner, dirty filters, uneven heating/cooling, noisy operation.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Mold &amp; Mildew:</strong> Visible mold, musty smells, especially in basements and bathrooms.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Asbestos / Lead Paint:</strong> Pre‑1978 homes may have hazardous materials; look for popcorn ceilings, deteriorating paint.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Pests &amp; Termites:</strong> Wood damage, mud tubes, small holes in wood structures.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Windows &amp; Doors:</strong> Drafts, broken seals, rotted frames, double‑pane fogging.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Insulation &amp; Energy Efficiency:</strong> Missing attic insulation, old single‑pane windows, high utility bills.</li>
            <li class="flex gap-2"><span class="text-orange-400 font-bold">•</span> <strong>Native Land / Reserve Issues:</strong> Verify the property isn’t on reserve land where the Crown retains ownership; lack of clear title can cause legal hurdles.</li>
          </ul>
        </div>
`
})
export class MortgageGuideComponent { }
