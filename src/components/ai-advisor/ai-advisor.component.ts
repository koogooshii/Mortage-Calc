
import { Component, ChangeDetectionStrategy, input, signal, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { GeminiAiService } from '../../services/gemini-ai.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-ai-advisor',
  standalone: true,
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-advisor.component.html',
})
export class AiAdvisorComponent {
  private aiService = inject(GeminiAiService);
  private sanitizer = inject(DomSanitizer);

  loanAmount = input.required<number>();
  interestRate = input.required<number>();
  loanTerm = input.required<number>();
  monthlyPayment = input.required<number>();
  color = input<string>('cyan');

  isLoading = signal(false);
  advice = signal<string | null>(null);
  error = signal<string | null>(null);

  sanitizedAdvice = computed(() => {
    const rawAdvice = this.advice();
    if (!rawAdvice) return null;

    // Basic markdown to HTML conversion
    let html = rawAdvice
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/-\s(.*?)\n/g, '<li class="ml-4">$1</li>') // List items
      .replace(/\n/g, '<br>'); // Newlines

    return this.sanitizer.bypassSecurityTrustHtml(html);
  });
  
  async fetchAdvice() {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.advice.set(null);
    this.error.set(null);

    try {
      const result = await this.aiService.getMortgageAdvice(
        this.loanAmount(),
        this.interestRate(),
        this.loanTerm(),
        this.monthlyPayment()
      );
      this.advice.set(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}