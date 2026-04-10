import { CommissionBreakdown } from '../types/guided-trip';

const PLATFORM_FEE_PERCENTAGE = 10;

export const calculateCommission = (
  basePrice: number,
  depositPercentage: number
): CommissionBreakdown => {
  const totalRevenue = basePrice;
  const depositByAgent = (basePrice * depositPercentage) / 100;
  const platformFee = (basePrice * PLATFORM_FEE_PERCENTAGE) / 100;
  const totalDepositRequired = depositByAgent + platformFee;
  const revenueToAgent = totalRevenue - (totalRevenue * PLATFORM_FEE_PERCENTAGE) / 100;
  const totalDepositToAgent = depositByAgent;

  return {
    depositByAgent,
    platformFee,
    totalDepositRequired,
    totalRevenue,
    revenueToAgent,
    totalDepositToAgent,
  };
};

export const formatCurrency = (amount: number): string => {
  return `RM${amount.toFixed(2)}`;
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage}%`;
};
