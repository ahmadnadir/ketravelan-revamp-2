import { ExpenseData, ExpensePayment } from "@/data/mockData";

/**
 * Calculate payment progress based on actual settled amounts (not count)
 */
export const calculatePaymentProgress = (
  expense: ExpenseData,
  payments: ExpensePayment[]
): number => {
  if (!payments || payments.length === 0) return 0;
  
  const settledAmount = payments
    .filter(p => p.status === "settled")
    .reduce((sum, p) => {
      if (expense.splitType === "custom" && expense.customSplitAmounts) {
        const customAmount = expense.customSplitAmounts.find(
          c => c.memberId === p.memberId
        );
        return sum + (customAmount?.amount || 0);
      }
      // Equal split
      return sum + (expense.amount / payments.length);
    }, 0);
  
  return Math.round((settledAmount / expense.amount) * 100);
};

/**
 * Get a member's share amount from an expense
 */
export const getMemberShareAmount = (
  expense: ExpenseData,
  memberId: string,
  totalMembers: number
): number => {
  if (expense.splitType === "custom" && expense.customSplitAmounts) {
    return expense.customSplitAmounts.find(c => c.memberId === memberId)?.amount || 0;
  }
  return expense.amount / totalMembers;
};
