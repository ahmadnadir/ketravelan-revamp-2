import {
  PaymentMode,
  PaymentInstallment,
  PaymentPlanSnapshot,
} from '../types/guided-trip';

export interface PaymentPlanInput {
  totalAmount: number;
  depositPercentage: number;
  paymentMode: PaymentMode;
  tripStartDate: string;
  numInstallments?: number;
  customDepositAmount?: number;
  minimumBookingDays?: number;
}

export interface PaymentPlanCalculation {
  depositAmount: number;
  remainingBalance: number;
  installments: PaymentInstallment[];
  requiresFullPayment: boolean;
  availableDays: number;
  cutoffDate: string;
}

export function calculateDepositAmount(
  totalAmount: number,
  depositPercentage: number
): number {
  return Math.ceil((totalAmount * depositPercentage) / 100);
}

export function calculateRemainingBalance(
  totalAmount: number,
  depositAmount: number
): number {
  return totalAmount - depositAmount;
}

export function splitIntoInstallments(
  remainingBalance: number,
  numInstallments: number
): number[] {
  if (numInstallments <= 0) return [];

  const baseAmount = Math.floor(remainingBalance / numInstallments);
  const remainder = remainingBalance - baseAmount * numInstallments;

  const installmentAmounts: number[] = [];
  for (let i = 0; i < numInstallments; i++) {
    const amount = i === 0 ? baseAmount + remainder : baseAmount;
    installmentAmounts.push(amount);
  }

  return installmentAmounts;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDaysUntil(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

export function generateInstallmentSchedule(
  remainingBalance: number,
  numInstallments: number,
  cutoffDate: Date
): PaymentInstallment[] {
  if (numInstallments === 0 || remainingBalance === 0) return [];

  const today = new Date();
  const monthlyAmount = remainingBalance / numInstallments;
  const installments: PaymentInstallment[] = [];

  for (let i = 1; i <= numInstallments; i++) {
    let dueDate = new Date(today);
    dueDate.setMonth(today.getMonth() + i);
    dueDate.setDate(1);

    if (i === numInstallments) {
      dueDate = new Date(cutoffDate);
    }

    const amount = i === numInstallments
      ? Math.round((remainingBalance - (monthlyAmount * (numInstallments - 1))) * 100) / 100
      : Math.round(monthlyAmount * 100) / 100;

    installments.push({
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount,
      status: 'pending',
    });
  }

  return installments;
}

export function calculatePaymentPlan(
  input: PaymentPlanInput
): PaymentPlanCalculation {
  const {
    totalAmount,
    depositPercentage,
    paymentMode,
    tripStartDate,
    numInstallments = 3,
    customDepositAmount,
    minimumBookingDays = 14,
  } = input;

  const today = new Date();
  const tripDate = new Date(tripStartDate);
  const cutoffDate = addDays(tripDate, -minimumBookingDays);
  const daysToTrip = getDaysUntil(tripDate);
  const availableDays = Math.max(0, daysToTrip - minimumBookingDays);

  if (availableDays <= 0) {
    return {
      depositAmount: totalAmount,
      remainingBalance: 0,
      installments: [],
      requiresFullPayment: true,
      availableDays,
      cutoffDate: cutoffDate.toISOString().split('T')[0],
    };
  }

  const minDepositAmount = calculateDepositAmount(totalAmount, depositPercentage);
  const depositAmount = customDepositAmount
    ? Math.max(minDepositAmount, Math.min(customDepositAmount, totalAmount))
    : minDepositAmount;

  const remainingBalance = calculateRemainingBalance(totalAmount, depositAmount);

  let installments: PaymentInstallment[] = [];

  switch (paymentMode) {
    case 'full':
      break;

    case 'deposit_installments':
      if (remainingBalance > 0 && numInstallments > 0) {
        installments = generateInstallmentSchedule(
          remainingBalance,
          numInstallments,
          cutoffDate
        );
      }
      break;

    case 'deposit_final':
      if (remainingBalance > 0) {
        installments = [
          {
            installmentNumber: 2,
            dueDate: cutoffDate.toISOString().split('T')[0],
            amount: remainingBalance,
            status: 'pending',
          },
        ];
      }
      break;
  }

  return {
    depositAmount,
    remainingBalance,
    installments,
    requiresFullPayment: false,
    availableDays,
    cutoffDate: cutoffDate.toISOString().split('T')[0],
  };
}

export function createPaymentPlanSnapshot(
  input: PaymentPlanInput,
  calculation: PaymentPlanCalculation
): PaymentPlanSnapshot {
  const { totalAmount, depositPercentage, paymentMode, numInstallments = 0 } = input;
  const { depositAmount, remainingBalance, installments, requiresFullPayment } = calculation;

  const allInstallments: PaymentInstallment[] = [
    {
      installmentNumber: 1,
      dueDate: new Date().toISOString().split('T')[0],
      amount: (paymentMode === 'full' || requiresFullPayment) ? totalAmount : depositAmount,
      status: 'pending',
    },
    ...installments,
  ];

  return {
    mode: requiresFullPayment ? 'full' : paymentMode,
    totalAmount,
    depositAmount: requiresFullPayment ? totalAmount : depositAmount,
    depositPercentage,
    remainingBalance: requiresFullPayment ? 0 : remainingBalance,
    numInstallments: paymentMode === 'deposit_installments' ? numInstallments : 0,
    installments: allInstallments,
    createdAt: new Date().toISOString(),
  };
}

export function validatePaymentPlan(
  tripStartDate: string,
  installments: PaymentInstallment[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const tripStart = new Date(tripStartDate);
  const today = new Date();

  if (tripStart <= today) {
    errors.push('Trip start date must be in the future');
  }

  for (const installment of installments) {
    const dueDate = new Date(installment.dueDate);

    if (dueDate > tripStart) {
      errors.push(
        `Payment ${installment.installmentNumber} is due after trip starts`
      );
    }

    if (installment.amount <= 0) {
      errors.push(`Payment ${installment.installmentNumber} must be greater than 0`);
    }
  }

  const totalFromInstallments = installments.reduce(
    (sum, inst) => sum + inst.amount,
    0
  );

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getMaxAllowedInstallments(
  tripStartDate: string
): number {
  const tripStart = new Date(tripStartDate);
  const today = new Date();

  const monthsDiff =
    (tripStart.getFullYear() - today.getFullYear()) * 12 +
    (tripStart.getMonth() - today.getMonth());

  return Math.max(1, Math.min(monthsDiff - 1, 12));
}

export function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
