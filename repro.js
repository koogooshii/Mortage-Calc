
function calculateMonthlyPayment(principal, annualInterestRate, loanTermYears) {
    if (principal <= 0 || loanTermYears <= 0) return 0;
    const monthlyRate = annualInterestRate / 12;
    const numberOfPayments = loanTermYears * 12;
    if (monthlyRate === 0) return principal / numberOfPayments;
    const factor = Math.pow(1 + monthlyRate, numberOfPayments);
    return (principal * (monthlyRate * factor)) / (factor - 1);
}

function calculatePeriodicPayment(monthlyPayment, frequency) {
    switch (frequency) {
        case 'accelerated-weekly': return monthlyPayment / 4;
        case 'weekly': return (monthlyPayment * 12) / 52;
        case 'accelerated-bi-weekly': return monthlyPayment / 2;
        case 'bi-weekly': return (monthlyPayment * 12) / 26;
        case 'monthly':
        default: return monthlyPayment;
    }
}

function getNextPaymentDate(startDate, paymentNumber, frequency) {
    const d = new Date(startDate.getTime());
    if (paymentNumber <= 0) return d;
    switch (frequency) {
        case 'weekly':
        case 'accelerated-weekly':
            d.setDate(d.getDate() + paymentNumber * 7);
            break;
        case 'bi-weekly':
        case 'accelerated-bi-weekly':
            d.setDate(d.getDate() + paymentNumber * 14);
            break;
        case 'monthly':
        default:
            d.setMonth(d.getMonth() + paymentNumber);
            break;
    }
    return d;
}

function performCalculation(params) {
    let { loanAmount, interestRate, loanTerm, startDate, paymentFrequency, oneTimePayments } = params;
    const paymentsPerYear = paymentFrequency === 'weekly' ? 52 : 12;
    const annualInterestRate = interestRate / 100;
    const monthlyPayment = calculateMonthlyPayment(loanAmount, annualInterestRate, loanTerm);
    const periodicPayment = calculatePeriodicPayment(monthlyPayment, paymentFrequency);

    let remainingBalance = loanAmount;
    let paymentNumber = 0;
    const validStartDate = new Date(startDate);
    let oneTimePaymentIndex = 0;
    const sortedOneTimePayments = [...oneTimePayments].sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log('Initial Balance:', remainingBalance);
    console.log('Periodic Payment:', periodicPayment);

    while (paymentNumber < 3) {
        paymentNumber++;
        const currentDate = getNextPaymentDate(validStartDate, paymentNumber, paymentFrequency);
        const previousDate = getNextPaymentDate(validStartDate, paymentNumber - 1, paymentFrequency);

        const interestForPeriod = remainingBalance * (annualInterestRate / paymentsPerYear);
        let principalFromPayment = periodicPayment - interestForPeriod;
        let scheduledExtraPayment = 0;

        while (oneTimePaymentIndex < sortedOneTimePayments.length && new Date(sortedOneTimePayments[oneTimePaymentIndex].date) <= currentDate) {
            const p = sortedOneTimePayments[oneTimePaymentIndex];
            if (new Date(p.date) > previousDate) {
                scheduledExtraPayment += p.amount;
            }
            oneTimePaymentIndex++;
        }

        remainingBalance -= principalFromPayment + scheduledExtraPayment;

        console.log(`Payment ${paymentNumber} (${currentDate.toISOString().split('T')[0]}):`);
        console.log(`  Principal: ${principalFromPayment.toFixed(2)}`);
        console.log(`  Extra: ${scheduledExtraPayment.toFixed(2)}`);
        console.log(`  Balance: ${remainingBalance.toFixed(2)}`);
    }
}

const params = {
    loanAmount: 233869.29,
    interestRate: 3.85,
    loanTerm: 21.6, // Adjusted to match payment approx
    startDate: '2026-11-03',
    paymentFrequency: 'weekly',
    oneTimePayments: [{ date: '2026-11-17', amount: 1000 }]
};

performCalculation(params);
