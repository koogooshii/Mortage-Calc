import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, CommonModule } from '@angular/common';

type Province = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'ON' | 'PE' | 'QC' | 'SK';

interface TaxResult {
  provincialTax: number;
  municipalTax: number;
  totalTax: number;
  rebate: number;
}

@Component({
  selector: 'app-land-transfer-tax-calculator',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './land-transfer-tax-calculator.component.html',
})
export class LandTransferTaxCalculatorComponent {
  private fb = inject(FormBuilder);

  taxForm = this.fb.group({
    purchasePrice: [500000, [Validators.required, Validators.min(0)]],
    province: ['ON' as Province, Validators.required],
    isToronto: [false],
    isFirstTimeBuyer: [false],
  });

  private formValues = toSignal(this.taxForm.valueChanges, {
    initialValue: this.taxForm.getRawValue(),
  });

  taxResult = computed<TaxResult>(() => {
    const { purchasePrice, province, isToronto, isFirstTimeBuyer } = this.formValues();
    if (!purchasePrice || !province) {
      return { provincialTax: 0, municipalTax: 0, totalTax: 0, rebate: 0 };
    }

    let provincialTax = 0;
    let municipalTax = 0;
    let rebate = 0;

    switch (province) {
      case 'ON':
        provincialTax = this.calculateBrackets(purchasePrice, [
          { threshold: 55000, rate: 0.005 },
          { threshold: 250000, rate: 0.01 },
          { threshold: 400000, rate: 0.015 },
          { threshold: 2000000, rate: 0.02 },
          { threshold: Infinity, rate: 0.025 },
        ]);
        if (isFirstTimeBuyer) {
          rebate = Math.min(provincialTax, 4000);
        }
        if (isToronto) {
          municipalTax = this.calculateBrackets(purchasePrice, [
            { threshold: 55000, rate: 0.005 },
            { threshold: 250000, rate: 0.01 },
            { threshold: 400000, rate: 0.015 },
            { threshold: 2000000, rate: 0.02 },
            { threshold: Infinity, rate: 0.025 },
          ]);
          if (isFirstTimeBuyer) {
            rebate += Math.min(municipalTax, 4475);
          }
        }
        break;
      case 'BC':
        provincialTax = this.calculateBrackets(purchasePrice, [
          { threshold: 200000, rate: 0.01 },
          { threshold: 2000000, rate: 0.02 },
          { threshold: 3000000, rate: 0.03 },
          { threshold: Infinity, rate: 0.05 },
        ]);
         if (isFirstTimeBuyer && purchasePrice <= 500000) {
            rebate = provincialTax;
        }
        break;
      case 'QC':
         provincialTax = this.calculateBrackets(purchasePrice, [
          { threshold: 55200, rate: 0.005 },
          { threshold: 276100, rate: 0.01 },
          { threshold: Infinity, rate: 0.015 },
        ]);
        // Montreal has higher brackets
        // This is a simplification; a full implementation would require city selection.
        break;
      case 'AB':
        provincialTax = 100 + Math.ceil(Math.max(0, purchasePrice - 30000) / 5000) * 10;
        break;
      case 'MB':
         provincialTax = this.calculateBrackets(purchasePrice, [
            { threshold: 30000, rate: 0 },
            { threshold: 90000, rate: 0.005 },
            { threshold: 150000, rate: 0.01 },
            { threshold: 200000, rate: 0.015 },
            { threshold: Infinity, rate: 0.02 },
        ]);
        break;
      case 'SK':
         provincialTax = this.calculateBrackets(purchasePrice, [
            { threshold: 80000, rate: 0.003 },
            { threshold: Infinity, rate: 0.005 },
        ]);
        break;
      case 'NS':
        // Varies by municipality, typically 0.5% to 1.5%. Using an average.
        provincialTax = purchasePrice * 0.015;
        if(isFirstTimeBuyer && purchasePrice <= 500000){
            rebate = Math.min(provincialTax, 3000);
        }
        break;
      case 'NB':
        provincialTax = purchasePrice * 0.01;
        break;
      case 'PE':
        provincialTax = Math.max(0, (purchasePrice - 30000) * 0.01);
        if (isFirstTimeBuyer) {
            rebate = Math.min(provincialTax, 2000);
        }
        break;
      case 'NL':
        // No provincial tax, but cities have registration fees.
        break;
    }

    provincialTax = Math.max(0, provincialTax);
    municipalTax = Math.max(0, municipalTax);
    const totalTax = provincialTax + municipalTax - rebate;

    return { provincialTax, municipalTax, totalTax: Math.max(0, totalTax), rebate };
  });

  private calculateBrackets(value: number, brackets: { threshold: number; rate: number }[]): number {
    let tax = 0;
    let previousThreshold = 0;
    for (const bracket of brackets) {
      if (value > previousThreshold) {
        const taxableAmount = Math.min(value, bracket.threshold) - previousThreshold;
        tax += taxableAmount * bracket.rate;
      }
      previousThreshold = bracket.threshold;
    }
    return tax;
  }
}
