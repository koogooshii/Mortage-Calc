import { Injectable } from '@angular/core';
import { AmortizationEntry, LoanEvent, LoanHistorySegment, MortgageSummary, RefinanceDetails, RenewalDetails, LumpSumDetails } from '../models/mortgage.model';

// Declare jsPDF and its autoTable plugin to inform TypeScript about the global variables from the CDN scripts.
declare const jspdf: any;

export interface ChartImages {
  balance: string | null;
  piti: string | null;
  equity: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {

  private formatCurrency(val: number): string {
    if (val === null || val === undefined) return 'N/A';
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  private formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    // Add timezone offset to prevent date from shifting
    const adjustedDate = new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
    return adjustedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
  }

  private getPaymentFrequencyLabel(freq: string): string {
    switch (freq) {
      case 'weekly': return 'Weekly';
      case 'accelerated-weekly': return 'Accelerated Weekly';
      case 'bi-weekly': return 'Bi-Weekly';
      case 'accelerated-bi-weekly': return 'Accelerated Bi-Weekly';
      case 'monthly':
      default: return 'Monthly';
    }
  }

  private addAmortizationTable(doc: any, schedule: AmortizationEntry[], title: string) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text(title, 14, 22);
    
    const head = [['#', 'Date', 'Payment', 'Extra', 'Principal', 'Interest', 'Balance']];
    const body = schedule.map(entry => [
        entry.paymentNumber,
        this.formatDate(entry.paymentDate),
        this.formatCurrency(entry.payment),
        this.formatCurrency(entry.scheduledExtraPayment + entry.adHocPayment),
        this.formatCurrency(entry.principal),
        this.formatCurrency(entry.interest),
        this.formatCurrency(entry.remainingBalance)
    ]);

    doc.autoTable({
      head: head,
      body: body,
      startY: 30,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [44, 62, 80] }
    });
  }

  private addVisualAnalysisSection(doc: any, title: string, chartImages: ChartImages | null): void {
    if (!chartImages || (!chartImages.balance && !chartImages.piti && !chartImages.equity)) {
        return;
    }

    doc.addPage();
    let yPos = 22;
    doc.setFontSize(14);
    doc.text(title, 14, yPos);
    yPos += 10;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    if (chartImages.balance) {
        const chartHeight = (contentWidth / 16) * 9; // Maintain 16:9 aspect ratio
        doc.addImage(chartImages.balance, 'PNG', margin, yPos, contentWidth, chartHeight);
        yPos += chartHeight + 10;
    }

    const halfWidth = (contentWidth - 10) / 2;
    const smallChartHeight = halfWidth; // Maintain 1:1 aspect ratio for smaller charts

    let hasPlacedSmallChart = false;
    if (chartImages.piti) {
        doc.addImage(chartImages.piti, 'PNG', margin, yPos, halfWidth, smallChartHeight);
        hasPlacedSmallChart = true;
    }

    if (chartImages.equity) {
        const xOffset = hasPlacedSmallChart ? margin + halfWidth + 10 : margin;
        doc.addImage(chartImages.equity, 'PNG', xOffset, yPos, halfWidth, smallChartHeight);
    }
  }

  private addAiAdviceSection(doc: any, title: string, advice: string | null): void {
    if (!advice) {
        return;
    }

    doc.addPage();
    let yPos = 22;
    doc.setFontSize(14);
    doc.text(title, 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(40);

    // Clean up markdown for plain text display
    const plainTextAdvice = advice
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
        .replace(/-\s/g, '• ');        // Change markdown list to bullet point

    const lines = doc.splitTextToSize(plainTextAdvice, 180); // 180 is width for A4 page
    doc.text(lines, 14, yPos);
  }

  exportScenarioAsPdf(
    scenarioTitle: string,
    params: any,
    summary: MortgageSummary | null,
    schedule: AmortizationEntry[],
    chartImages: ChartImages | null,
    aiStrategyAdvice: string | null,
    aiPaymentFrequencyAdvice: string | null
  ): void {
    if (!summary) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // --- Document Header ---
    doc.setFontSize(20);
    doc.text(`${scenarioTitle} - Mortgage Report`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    let yPos = 40;

    // --- Parameters Summary ---
    doc.setFontSize(14);
    doc.text('Loan Parameters', 14, yPos);
    yPos += 7;
    doc.setFontSize(10);

    const loanTermYears = params.loanTerm ?? 0;
    const loanTermMonths = params.loanTermMonths ?? 0;
    let amortizationPeriod = `${Math.floor(loanTermYears)} years`;
    if (loanTermMonths > 0) {
        amortizationPeriod += `, ${loanTermMonths} months`;
    }

    const paramsBody: (string | number)[][] = [
        ['Loan Amount', this.formatCurrency(params.loanAmount ?? 0)],
        ['Interest Rate', `${(params.interestRate ?? 0).toFixed(2)} %`],
        ['Amortization Period', amortizationPeriod],
        ['Term', `${params.termInYears ?? 0} years`],
        ['Payment Frequency', params.paymentFrequency],
    ];

    if (params.annualPaymentIncreasePercentage > 0) {
        paramsBody.push(['Annual Payment Increase', `${params.annualPaymentIncreasePercentage.toFixed(2)} %`]);
    }
    if ((params.annualPropertyTax ?? 0) > 0) {
        paramsBody.push(['Annual Property Tax', this.formatCurrency(params.annualPropertyTax)]);
    }
    if ((params.annualHomeInsurance ?? 0) > 0) {
        paramsBody.push(['Annual Home Insurance', this.formatCurrency(params.annualHomeInsurance)]);
    }
    if ((params.monthlyPMI ?? 0) > 0) {
        paramsBody.push(['Monthly PMI', this.formatCurrency(params.monthlyPMI)]);
    }
    
    doc.autoTable({
        startY: yPos,
        body: paramsBody,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: { 0: { fontStyle: 'bold' } },
        tableWidth: 'auto',
    });
    yPos = doc.autoTable.previous.finalY + 10;
    
    // --- Core Loan Summary ---
    doc.setFontSize(14);
    doc.text('Projected Summary', 14, yPos);
    yPos += 7;
    const paymentLabel = this.getPaymentFrequencyLabel(params.paymentFrequency);
    
    const summaryData: (string | any)[][] = [];
    
    if (summary.totalTaxesAndInsurance > 0) {
        const periodicTaxesAndInsurance = summary.totalPeriodicPITI - summary.periodicPayment;
        summaryData.push([`${paymentLabel} Principal & Interest`, this.formatCurrency(summary.periodicPayment)]);
        summaryData.push([`${paymentLabel} Taxes & Insurance`, this.formatCurrency(periodicTaxesAndInsurance)]);
        summaryData.push([`Total ${paymentLabel} Payment (PITI)`, this.formatCurrency(summary.totalPeriodicPITI)]);
    } else {
        summaryData.push([`${paymentLabel} Payment`, this.formatCurrency(summary.periodicPayment)]);
    }

    summaryData.push(
        ['Balance at End of Term', summary.balanceAtEndOfTerm > 0 ? this.formatCurrency(summary.balanceAtEndOfTerm) : 'Paid Off'],
        ['Projected Payoff Date', this.formatDate(summary.payoffDate)]
    );

    if (summary.payoffDate && summary.originalPayoffDate && summary.payoffDate.getTime() !== summary.originalPayoffDate.getTime()) {
      summaryData.push(['Original Payoff Date', this.formatDate(summary.originalPayoffDate)]);
    }
    
    doc.autoTable({
        startY: yPos,
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [39, 174, 96] },
        columnStyles: { 0: { fontStyle: 'bold' } },
        tableWidth: 'auto',
         didParseCell: (data: any) => {
             // Bold the 'Total...' row
             if (data.row.section === 'body' && data.row.raw[0].toString().startsWith('Total ')) {
                Object.values(data.row.cells).forEach((cell: any) => {
                    cell.styles.fontStyle = 'bold';
                });
            }
        }
    });
    yPos = doc.autoTable.previous.finalY + 10;
    
    // --- Cost Breakdown Table ---
    doc.setFontSize(14);
    doc.text('Cost Breakdown', 14, yPos);
    yPos += 7;
    const costHead = [['', 'Over Term', 'Over Full Loan']];
    const costBody: (string | number)[][] = [
      ['Principal', this.formatCurrency(summary.totalPaidOverTerm - summary.totalInterestOverTerm - summary.totalExtraPaymentsOverTerm), this.formatCurrency(summary.totalPaid - summary.totalInterest - summary.totalExtraPayments)],
      ['Interest Paid', this.formatCurrency(summary.totalInterestOverTerm), this.formatCurrency(summary.totalInterest)],
    ];

    if (summary.totalExtraPayments > 0) {
      costBody.push(['Extra Payments', this.formatCurrency(summary.totalExtraPaymentsOverTerm), this.formatCurrency(summary.totalExtraPayments)]);
    }

    if (summary.totalTaxesAndInsurance > 0) {
        costBody.push(['Taxes & Insurance', this.formatCurrency(summary.totalTaxesAndInsuranceOverTerm), this.formatCurrency(summary.totalTaxesAndInsurance)]);
    }

    costBody.push(['TOTAL COST', this.formatCurrency(summary.totalPaidOverTerm + summary.totalTaxesAndInsuranceOverTerm), this.formatCurrency(summary.totalLifetimeCost)]);
    
     doc.autoTable({
        startY: yPos,
        head: costHead,
        body: costBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [44, 62, 80] },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didParseCell: (data: any) => {
            if (data.row.section === 'body' && data.row.raw[0] === 'TOTAL COST') {
                Object.values(data.row.cells).forEach((cell: any) => {
                    cell.styles.fontStyle = 'bold';
                    cell.styles.fillColor = '#ecf0f1';
                    cell.styles.textColor = [44, 62, 80];
                });
            }
            if (data.row.section === 'body' && data.row.raw[0] === 'Interest Paid') {
                 Object.values(data.row.cells).forEach((cell: any) => {
                    cell.styles.textColor = [192, 57, 43];
                    cell.styles.fontStyle = 'bold';
                });
            }
            if (data.row.section === 'body' && data.row.raw[0] === 'Extra Payments') {
              Object.values(data.row.cells).forEach((cell: any) => {
                cell.styles.textColor = [39, 174, 96];
                cell.styles.fontStyle = 'bold';
              });
            }
        }
    });
    yPos = doc.autoTable.previous.finalY + 10;

    // --- Savings Summary ---
    if (summary.interestSavedLifetime > 0) {
        doc.setFontSize(14);
        doc.text('Savings From Extra Payments', 14, yPos);
        yPos += 7;
        const savingsData = [
            ['Interest Saved (Over Term)', this.formatCurrency(summary.interestSavedOverTerm)],
            ['Interest Saved (Lifetime)', this.formatCurrency(summary.interestSavedLifetime)],
            ['Time Saved', summary.timeSaved]
        ];
        doc.autoTable({
            startY: yPos,
            body: savingsData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: '#e8f5e9' } },
            didParseCell: (data: any) => {
                 if (data.row.section === 'body' && data.column.index === 1) {
                    data.cell.styles.textColor = [39, 174, 96];
                 }
            }
        });
        yPos = doc.autoTable.previous.finalY + 15;
    }

    // --- Extra Payments by Year ---
    if (summary.totalExtraPayments > 0 && Object.keys(summary.extraPaymentsByYear).length > 0) {
        doc.setFontSize(14);
        doc.text('Extra Payments by Year', 14, yPos);
        yPos += 7;

        const yearlyPaymentsHead = [['Year', 'Amount']];
        const yearlyPaymentsBody = Object.entries(summary.extraPaymentsByYear)
            .map(([year, amount]) => [year, this.formatCurrency(amount)])
            .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
        
        doc.autoTable({
            startY: yPos,
            head: yearlyPaymentsHead,
            body: yearlyPaymentsBody,
            theme: 'striped',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [22, 160, 133] },
            columnStyles: { 0: { fontStyle: 'bold' } },
            tableWidth: 'auto',
        });
        yPos = doc.autoTable.previous.finalY + 15;
    }

    // --- Visual Analysis ---
    this.addVisualAnalysisSection(doc, 'Visual Analysis', chartImages);

    // --- Amortization Schedule Table ---
    this.addAmortizationTable(doc, schedule, 'Amortization Schedule');

    // --- AI Advice ---
    this.addAiAdviceSection(doc, 'AI Strategy Advisor', aiStrategyAdvice);
    this.addAiAdviceSection(doc, 'AI Payment Strategy', aiPaymentFrequencyAdvice);
    
    // --- Save Document ---
    doc.save(`${scenarioTitle.toLowerCase().replace(' ', '-')}-report.pdf`);
  }

  exportRefinanceAsPdf(
    current: { params: any; summary: MortgageSummary; schedule: AmortizationEntry[], charts: ChartImages | null },
    refi: { params: any; summary: MortgageSummary; schedule: AmortizationEntry[], charts: ChartImages | null },
    analysis: { monthlySavings: number; breakevenMonths: number; totalInterestSavings: number; closingCosts: number }
  ) {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Refinance Analysis Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    let yPos = 40;

    // Analysis Summary
    doc.setFontSize(14);
    doc.text('Refinance Summary', 14, yPos);
    yPos += 7;
    const analysisBody = [
        ['Monthly Payment Savings', this.formatCurrency(analysis.monthlySavings)],
        ['Closing Costs', this.formatCurrency(analysis.closingCosts)],
        ['Breakeven Point', `${analysis.breakevenMonths > 0 ? analysis.breakevenMonths.toFixed(1) : 'N/A'} months`],
        ['Lifetime Interest Savings', this.formatCurrency(analysis.totalInterestSavings)],
    ];
    doc.autoTable({
        startY: yPos,
        body: analysisBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didParseCell: (data: any) => {
            if (data.column.index === 1) {
                const isSavings = data.row.raw[0].toString().toLowerCase().includes('savings');
                const value = analysis.monthlySavings; // Check against a value to determine positive/negative
                if(isSavings) {
                    data.cell.styles.textColor = analysis.totalInterestSavings > 0 ? [39, 174, 96] : [192, 57, 43];
                }
            }
        }
    });
    yPos = doc.autoTable.previous.finalY + 10;

    // Comparison Table
    doc.setFontSize(14);
    doc.text('Loan Comparison', 14, yPos);
    yPos += 7;

    const currentAmortization = `${current.params.loanTerm}y ${current.params.loanTermMonths || 0}m`;
    const newAmortization = `${refi.params.loanTerm}y ${refi.params.loanTermMonths || 0}m`;

    const comparisonBody = [
        ['Loan Amount', this.formatCurrency(current.params.loanAmount), this.formatCurrency(refi.params.loanAmount)],
        ['Interest Rate', `${current.params.interestRate}%`, `${refi.params.interestRate}%`],
        ['Amortization', currentAmortization, newAmortization],
        ['Term', `${current.params.termInYears} years`, `${refi.params.termInYears} years`],
        ['Payment Frequency', this.getPaymentFrequencyLabel(current.params.paymentFrequency), this.getPaymentFrequencyLabel(refi.params.paymentFrequency)],
        ['Total Periodic Payment', this.formatCurrency(current.summary.totalPeriodicPITI), this.formatCurrency(refi.summary.totalPeriodicPITI)],
        ['Payoff Date', this.formatDate(current.summary.payoffDate), this.formatDate(refi.summary.payoffDate)],
        ['Total Interest Paid', this.formatCurrency(current.summary.totalInterest), this.formatCurrency(refi.summary.totalInterest)],
        ['Total Lifetime Cost', this.formatCurrency(current.summary.totalLifetimeCost), this.formatCurrency(refi.summary.totalLifetimeCost)],
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Metric', 'Current Loan', 'New Loan']],
        body: comparisonBody,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [44, 62, 80] },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Visual Analysis
    this.addVisualAnalysisSection(doc, 'Current Loan - Visual Analysis', current.charts);
    this.addVisualAnalysisSection(doc, 'New Loan - Visual Analysis', refi.charts);

    // Amortization Schedules
    this.addAmortizationTable(doc, current.schedule, 'Current Loan Amortization Schedule');
    this.addAmortizationTable(doc, refi.schedule, 'New (Refinanced) Loan Amortization Schedule');

    doc.save('refinance-report.pdf');
  }

  exportLoanHistoryAsPdf(
    params: any,
    summary: { originalPayoffDate: Date | null; actualPayoffDate: Date | null; originalTotalInterest: number; actualTotalInterest: number },
    segments: LoanHistorySegment[],
    schedule: AmortizationEntry[],
    chartImage: string | null
  ) {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('Loan History Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    let yPos = 40;

    // Original Loan Params
    doc.setFontSize(14);
    doc.text('Original Loan Parameters', 14, yPos);
    yPos += 7;
    const loanAmount = (params.purchasePrice ?? 0) - (params.downPayment ?? 0);
    const paramsBody = [
        ['Purchase Price', this.formatCurrency(params.purchasePrice)],
        ['Down Payment', this.formatCurrency(params.downPayment)],
        ['Initial Loan Amount', this.formatCurrency(loanAmount)],
        ['Interest Rate', `${params.interestRate}%`],
        ['Amortization / Term', `${params.amortizationPeriod} years / ${params.term} years`],
        ['Payment Frequency', this.getPaymentFrequencyLabel(params.paymentFrequency)],
        ['Start Date', this.formatDate(params.startDate)],
    ];
    doc.autoTable({ startY: yPos, body: paramsBody, theme: 'striped', styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: 'bold' } } });
    yPos = doc.autoTable.previous.finalY + 10;
    
    // Lifetime Summary
    doc.setFontSize(14);
    doc.text('Lifetime Projection Summary', 14, yPos);
    yPos += 7;
    const summaryBody = [
        ['', 'Original Projection', 'Actual History'],
        ['Payoff Date', this.formatDate(summary.originalPayoffDate), this.formatDate(summary.actualPayoffDate)],
        ['Total Interest Paid', this.formatCurrency(summary.originalTotalInterest), this.formatCurrency(summary.actualTotalInterest)],
    ];
    doc.autoTable({ startY: yPos, head: [summaryBody[0]], body: summaryBody.slice(1), theme: 'grid', styles: { fontSize: 9 }, headStyles: { fillColor: [44, 62, 80] } });
    yPos = doc.autoTable.previous.finalY + 10;
    
    // Chart
    if (chartImage) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const contentWidth = pageWidth - (margin * 2);
        const chartHeight = (contentWidth / 16) * 9;
        doc.addImage(chartImage, 'PNG', margin, yPos, contentWidth, chartHeight);
        yPos += chartHeight + 10;
    }

    // Segments/Events
    if (segments.length > 0) {
      doc.addPage();
      yPos = 22;
      doc.setFontSize(14);
      doc.text('Loan Events Timeline', 14, yPos);
      yPos += 7;

      const segmentsBody = segments.map(seg => {
        let eventDetails = 'Initial Loan';
        if (seg.event) {
          const type = seg.event.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          let detailsStr = '';
          switch (seg.event.type) {
            case 'refinance':
              const refi = seg.event.details as RefinanceDetails;
              detailsStr = `New Rate: ${refi.newInterestRate}%, New Term: ${refi.newLoanTerm}y`;
              if (refi.cashOutAmount > 0) detailsStr += `, Cash Out: ${this.formatCurrency(refi.cashOutAmount)}`;
              break;
            case 'renewal':
              const renew = seg.event.details as RenewalDetails;
              detailsStr = `New Rate: ${renew.newInterestRate}%, New Term: ${renew.newTerm}y`;
              break;
            case 'lumpSum':
              detailsStr = `Amount: ${this.formatCurrency((seg.event.details as LumpSumDetails).amount)}`;
              break;
            case 'missedPayment':
              detailsStr = 'Payment deferred';
              break;
          }
          eventDetails = `${type}: ${detailsStr}`;
        }
        return [
          `${this.formatDate(seg.startDate)} to ${this.formatDate(seg.endDate)}`,
          eventDetails,
          `${seg.interestRate}%`,
          `${this.formatCurrency(seg.startingBalance)} -> ${this.formatCurrency(seg.endingBalance)}`
        ];
      });
      doc.autoTable({
        startY: yPos,
        head: [['Period', 'Event & Details', 'Rate', 'Balance Change']],
        body: segmentsBody,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [80, 44, 62] }
      });
    }

    // Amortization Schedule
    this.addAmortizationTable(doc, schedule, 'Lifetime Amortization Schedule');

    doc.save('loan-history-report.pdf');
  }
}