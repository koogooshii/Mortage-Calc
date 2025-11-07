
import { Injectable } from '@angular/core';
import { LoanHistoryState } from '../models/loan-history-state.model';

@Injectable({
  providedIn: 'root'
})
export class LoanHistoryPersistenceService {
  private readonly STORAGE_KEY = 'loan_history_state';

  saveState(state: LoanHistoryState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving loan history state to local storage', e);
    }
  }

  loadState(): LoanHistoryState | null {
    try {
      const savedState = localStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Basic validation
        if (parsed && parsed.form && Array.isArray(parsed.events)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading loan history state from local storage', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return null;
  }
}
