
import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({
  providedIn: 'root',
})
export class GeminiAiService {
  private ai: GoogleGenAI | undefined;

  constructor() {
    // Guard against `process` not being defined in a browser environment
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
      console.warn("API_KEY environment variable not set for GeminiAiService.");
    }
  }

  async getMortgageAdvice(
    loanAmount: number,
    interestRate: number,
    loanTerm: number,
    monthlyPayment: number
  ): Promise<string> {
    if (!this.ai) {
        return Promise.resolve("AI Advisor is not configured. API key is missing.");
    }

    const prompt = `
      Analyze a mortgage strategy and present the results. Do not use markdown headers (#, ##).

      **User's Current Mortgage Data:**
      - Loan Amount: $${loanAmount.toLocaleString()}
      - Interest Rate: ${interestRate}%
      - Original Loan Term: ${loanTerm} years
      - Calculated Monthly Payment (P&I): $${monthlyPayment.toFixed(2)}

      **Required Analysis Steps & Output Format:**

      Start with the heading "**The Payment Flexibility Strategy**". Then, perform the following calculations and present them step-by-step using bolded subheadings and bullet points.

      1.  **Propose a Longer Term:**
          - Identify the user's original term (${loanTerm} years).
          - Propose a new amortization period that is exactly 5 years longer. If the original term is 30 years or more, propose a 35-year term. State the new term clearly.

      2.  **Calculate the New Lower Payment:**
          - Use the provided loan amount and interest rate.
          - Calculate the new monthly principal & interest payment for the longer term proposed in step 1. You must use the standard mortgage payment formula: P = L[c(1+c)^n]/[(1+c)^n-1] where L=${loanAmount}, c=(${interestRate}/100)/12, and n is the new number of payments. Show the result clearly.

      3.  **Determine the "Flex Payment" Amount:**
          - Calculate the difference between the user's *original* monthly payment ($${monthlyPayment.toFixed(2)}) and the *new, lower* monthly payment from step 2. Label this difference as the "Flex Payment".

      4.  **Analyze the Impact of Extra Payments:**
          - Model a scenario where the user gets the new longer-term loan but consistently pays the "Flex Payment" amount (from step 3) as an extra payment every month, starting from the first payment.
          - Calculate the new projected payoff date for this scenario.
          - Calculate the total interest paid in this scenario.

      5.  **Summarize and Compare:**
          - Create a final summary comparing the new scenario (from step 4) to the user's original mortgage plan.
          - Calculate and state how much *sooner* the loan is paid off.
          - Calculate and state the *total interest saved*.
          - Conclude by explaining the primary benefit: gaining the flexibility of a lower required payment for tight months, while having a clear plan to pay off the loan even faster and save a significant amount of money.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Error fetching advice from Gemini API:', error);
      return 'Sorry, I was unable to get advice at this time. Please check your configuration and try again later.';
    }
  }

  async getGoalSeekingAdvice(
    loanDetails: {
      loanAmount: number;
      interestRate: number;
      loanTerm: number;
      monthlyPayment: number;
    }
  ): Promise<string> {
    if (!this.ai) {
      return Promise.resolve("AI Advisor is not configured. API key is missing.");
    }

    const prompt = `
      You are an expert mortgage strategist providing advice on payment frequency. A user has the following mortgage details based on a standard monthly payment schedule:
      - Loan Amount: $${loanDetails.loanAmount.toLocaleString()}
      - Interest Rate: ${loanDetails.interestRate}%
      - Loan Term: ${loanDetails.loanTerm.toFixed(1)} years
      - Standard Monthly Payment: $${loanDetails.monthlyPayment.toFixed(2)}

      The user wants a strategy to pay off their loan faster by adjusting their payment frequency, without dramatically changing their periodic cash outflow. Your advice should focus on the concept of "accelerated" payments.

      Please analyze and compare their current standard monthly plan to the following two strategies:
      1.  **Accelerated Bi-Weekly Payments:** Clearly explain this means paying half of the monthly payment every two weeks. Detail that this results in 26 half-payments a year, equivalent to 13 full monthly payments, with the "extra" payment going directly to principal.
      2.  **Accelerated Weekly Payments:** Clearly explain this means paying a quarter of the monthly payment every week. Detail that this results in 52 quarter-payments a year, also equivalent to 13 full monthly payments.

      For both accelerated strategies, provide a concrete, high-level estimate of:
      - How much sooner the loan will be paid off (in years and months).
      - The approximate total interest savings over the life of the loan.

      Present the strategy in a friendly and encouraging tone. Conclude with a summary of why accelerated payments are effective. Format the output as simple markdown, using bold for headings and bullet points for lists. Do not use markdown headers (#, ##, etc).
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error('Error fetching goal-seeking advice from Gemini API:', error);
      return 'Sorry, I was unable to generate a strategy at this time. Please check your configuration and try again later.';
    }
  }
}