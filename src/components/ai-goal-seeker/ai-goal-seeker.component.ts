
import { Component, ChangeDetectionStrategy, input, signal, inject, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { GeminiAiService } from '../../services/gemini-ai.service';

@Component({
  selector: 'app-ai-goal-seeker',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-goal-seeker.component.html',
})
export class AiGoalSeekerComponent {
  private aiService = inject(GeminiAiService);
  private sanitizer = inject(DomSanitizer);

  loanAmount = input.required<number>();
  interestRate = input.required<number>();
  loanTerm = input.required<number>();
  monthlyPayment = input.required<number>();
  color = input<string>('cyan');

  isLoading = signal(false);
  suggestion = signal<string | null>(null);
  error = signal<string | null>(null);

  sanitizedSuggestion = computed(() => {
    const rawSuggestion = this.suggestion();
    if (!rawSuggestion) return null;

    let html = rawSuggestion
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/-\s(.*?)\n/g, '<li class="ml-4">$1</li>')
      .replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  async findStrategy() {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.suggestion.set(null);
    this.error.set(null);

    try {
      const loanDetails = {
        loanAmount: this.loanAmount(),
        interestRate: this.interestRate(),
        loanTerm: this.loanTerm(),
        monthlyPayment: this.monthlyPayment(),
      };
      const result = await this.aiService.getGoalSeekingAdvice(loanDetails);
      this.suggestion.set(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}