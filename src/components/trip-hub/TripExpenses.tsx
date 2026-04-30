/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, DollarSign, TrendingUp, TrendingDown, Wallet, QrCode, SlidersHorizontal, Settings, ArrowLeftRight, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { ScrollableTabBar } from "@/components/shared/ScrollableTabBar";
import { StatCard } from "@/components/shared/StatCard";
import { ExpenseCard } from "@/components/shared/ExpenseCard";
import { SettlementCard } from "@/components/shared/SettlementCard";
import { ViewQRModal } from "@/components/trip-hub/ViewQRModal";
import { SendReminderModal } from "@/components/trip-hub/SendReminderModal";
import { YourQRSection } from "@/components/trip-hub/YourQRSection";
import { AddExpenseModal, NewExpense, ExpenseData as BaseExpenseData } from "@/components/trip-hub/AddExpenseModal";
import { DeleteExpenseDialog } from "@/components/trip-hub/DeleteExpenseDialog";
import { ReceiptViewerModal } from "@/components/trip-hub/ReceiptViewerModal";
import { ExpenseDetailsModal } from "@/components/trip-hub/ExpenseDetailsModal";
import { SettlementBreakdownModal, SettlementExpense } from "@/components/trip-hub/SettlementBreakdownModal";
import { SettlementConfirmModal } from "@/components/trip-hub/SettlementConfirmModal";
import { SettlementReceiptsModal } from "@/components/trip-hub/SettlementReceiptsModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { mockExpenses as initialMockExpenses, mockMembers } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { getCategoryFromTitle } from "@/lib/expenseCategories";
import { fetchTripExpenses, createExpense, deleteExpense, calculateTripBalances, getWhoOwesWho, fetchTripPaymentMethods, addExpensePayments, markParticipantsAsPaid, uploadPaymentQR, upsertPaymentMethod, uploadReceipt } from "@/lib/expenses";
import { getTripCurrencySettings, updateTripCurrencySettings, isTripNotificationEnabled } from "@/lib/trips";
import { supabase } from "@/lib/supabase";
import { sendSettlementReminder } from "@/lib/settlementReminders";
import { useExpenses } from "@/contexts/ExpenseContext";
import { ExpenseSettingsSheet } from "./ExpenseSettingSheet";
import { CurrencyCode } from "@/lib/currencyUtils";
import { sendSystemMessage } from "@/lib/system-messages";

// Category configuration with colors and emojis
const CATEGORY_CONFIG: Record<string, { color: string; emoji: string }> = {
  "Transport": { color: "bg-stat-blue", emoji: "🚗" },
  "transport": { color: "bg-stat-blue", emoji: "🚗" },
  "transportation": { color: "bg-stat-blue", emoji: "🚗" },
  "Food & Drinks": { color: "bg-stat-orange", emoji: "🍴" },
  "food & drinks": { color: "bg-stat-orange", emoji: "🍴" },
  "food": { color: "bg-stat-orange", emoji: "🍴" },
  "Accommodation": { color: "bg-purple-500", emoji: "🏨" },
  "accommodation": { color: "bg-purple-500", emoji: "🏨" },
  "Activities": { color: "bg-stat-green", emoji: "🎫" },
  "activities": { color: "bg-stat-green", emoji: "🎫" },
  "Shopping": { color: "bg-pink-500", emoji: "🛍️" },
  "shopping": { color: "bg-pink-500", emoji: "🛍️" },
  "Entertainment": { color: "bg-yellow-500", emoji: "🎭" },
  "entertainment": { color: "bg-yellow-500", emoji: "🎭" },
  "Other": { color: "bg-gray-500", emoji: "📦" },
  "other": { color: "bg-gray-500", emoji: "📦" },
};

// Member color palette for contribution charts
const MEMBER_COLORS = [
  { bg: "bg-member-coral", ring: "ring-member-coral", cssVar: "--member-coral" },
  { bg: "bg-member-teal", ring: "ring-member-teal", cssVar: "--member-teal" },
  { bg: "bg-member-violet", ring: "ring-member-violet", cssVar: "--member-violet" },
  { bg: "bg-member-sky", ring: "ring-member-sky", cssVar: "--member-sky" },
  { bg: "bg-member-rose", ring: "ring-member-rose", cssVar: "--member-rose" },
  { bg: "bg-member-amber", ring: "ring-member-amber", cssVar: "--member-amber" },
  { bg: "bg-member-mint", ring: "ring-member-mint", cssVar: "--member-mint" },
  { bg: "bg-member-indigo", ring: "ring-member-indigo", cssVar: "--member-indigo" },
];

// Deterministic color assignment based on member name for consistent colors
const getMemberColor = (memberName: string, index: number): typeof MEMBER_COLORS[0] => {
  const hash = memberName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = (hash + index) % MEMBER_COLORS.length;
  return MEMBER_COLORS[colorIndex];
};

// Helper function for consistent currency formatting
const formatCurrency = (amount: number): string => {
  return `RM${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatTwoDecimalAmount = (amount: number): string => {
  return amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// Extend ExpenseData to include 'payer' property
interface ExpenseData extends BaseExpenseData {
  payer?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  createdBy?: string | null;
}

interface Settlement {
  id: string;
  fromUser: { id: string; name: string; imageUrl: string };
  toUser: { id: string; name: string; imageUrl: string; qrCodeUrl?: string };
  amount: number;
  status: "pending" | "settled" | "awaiting";
  originalCurrency?: CurrencyCode;
  receiptUrl?: string;
}

const calculateNetSettlements = (
  expenses: ExpenseData[], 
  members: typeof mockMembers,
  currentUserId: string,
  homeCurrency: CurrencyCode
): Settlement[] => {
  // Track debts: debtMatrix[fromId][toId] = { amountHome, hasForeignCurrency, foreignAmounts }
  interface DebtInfo {
    amountHome: number;
    foreignAmounts: Record<CurrencyCode, number>;
  }
  const debtMatrix: Record<string, Record<string, DebtInfo>> = {};
  
  expenses.forEach(expense => {
    // Find payer's member ID
    const payer = members.find(m => m.name === expense.paidBy);
    if (!payer) return;
    
    // Determine the expense's effective amount in home currency
    const expenseHomeCurrency = expense.homeCurrency || homeCurrency;
    const expenseOriginalCurrency = expense.originalCurrency || expenseHomeCurrency;
    
    // For each person who split this expense (except the payer)
    expense.splitWith.forEach(memberId => {
      if (memberId === payer.id) return; // Payer doesn't owe themselves
      
      const memberPayment = expense.payments?.find(p => p.memberId === memberId);
      // Only count unsettled amounts (pending or submitted, not settled)
      if (!memberPayment || memberPayment.status !== "settled") {
        const shareAmount = calculateUserShare(expense, memberId);
        
        // Calculate share in home currency
        let shareInHome: number;
        if (expense.convertedAmountHome && expense.amount > 0) {
          // Proportional share of the converted amount
          shareInHome = (shareAmount / expense.amount) * expense.convertedAmountHome;
        } else {
          shareInHome = shareAmount; // Already in home currency
        }
        
        // Initialize if needed
        if (!debtMatrix[memberId]) debtMatrix[memberId] = {};
        if (!debtMatrix[memberId][payer.id]) {
          debtMatrix[memberId][payer.id] = { amountHome: 0, foreignAmounts: {} as Record<CurrencyCode, number> };
        }
        
        debtMatrix[memberId][payer.id].amountHome += shareInHome;
        
        // Track foreign currency amounts for display
        if (expenseOriginalCurrency !== homeCurrency) {
          if (!debtMatrix[memberId][payer.id].foreignAmounts[expenseOriginalCurrency]) {
            debtMatrix[memberId][payer.id].foreignAmounts[expenseOriginalCurrency] = 0;
          }
          debtMatrix[memberId][payer.id].foreignAmounts[expenseOriginalCurrency] += shareAmount;
        }
      }
    });
  });
  
  // Convert to net settlements (simplify mutual debts)
  const settlements: Settlement[] = [];
  const processedPairs = new Set<string>();
  
  Object.keys(debtMatrix).forEach(fromId => {
    Object.keys(debtMatrix[fromId]).forEach(toId => {
      const pairKey = [fromId, toId].sort().join("-");
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);
      
      const aOwesB = debtMatrix[fromId]?.[toId]?.amountHome || 0;
      const bOwesA = debtMatrix[toId]?.[fromId]?.amountHome || 0;
      const netAmountHome = aOwesB - bOwesA;
      
      if (Math.abs(netAmountHome) > 0.01) {
        const netFromId = netAmountHome > 0 ? fromId : toId;
        const netToId = netAmountHome > 0 ? toId : fromId;
        const fromMember = members.find(m => m.id === netFromId);
        const toMember = members.find(m => m.id === netToId);
        
        if (fromMember && toMember) {
          // Determine if settlement has foreign currency component
          const debtorDebt = debtMatrix[netFromId]?.[netToId];
          const foreignCurrencies = debtorDebt ? Object.keys(debtorDebt.foreignAmounts) as CurrencyCode[] : [];
          const dominantForeignCurrency = foreignCurrencies.length === 1 ? foreignCurrencies[0] : undefined;
          const foreignAmount = dominantForeignCurrency ? debtorDebt?.foreignAmounts[dominantForeignCurrency] : undefined;
          
          // Calculate foreign amount if there's a dominant foreign currency
          // Net foreign = debtor's foreign debt - (creditor's debt to debtor in that currency)
          const creditorDebt = debtMatrix[netToId]?.[netFromId];
          const creditorForeignInSameCurrency = creditorDebt?.foreignAmounts[dominantForeignCurrency!] || 0;
          const netForeignAmount = dominantForeignCurrency 
            ? Math.abs((foreignAmount || 0) - creditorForeignInSameCurrency)
            : undefined;
          
          settlements.push({
            id: `settlement-${fromMember.id}-${toMember.id}`,
            fromUser: { id: fromMember.id, name: fromMember.name, imageUrl: fromMember.imageUrl },
            toUser: { id: toMember.id, name: toMember.name, imageUrl: toMember.imageUrl },
            amount: Math.round(Math.abs(netAmountHome) * 100) / 100, // Home currency amount
            status: "pending",
            // Multi-currency: if there's a single dominant foreign currency, show dual display
            originalCurrency: dominantForeignCurrency,
            // Removed amountOriginal property to match Settlement type
          });
        }
      }
    });
  });
  
  return settlements;
};

// Fallback for homeCurrency if not defined
const homeCurrency = (typeof window !== "undefined" && window.localStorage.getItem("homeCurrency")) || "MYR";

// Calculate a user's share for a single expense
const calculateUserShare = (expense: ExpenseData, userId: string): number => {
  if (!expense.splitWith.includes(userId)) {
    return 0;
  }
  
  const baseAmount = typeof expense.convertedAmountHome === "number"
    ? expense.convertedAmountHome
    : parseFloat(expense.convertedAmountHome || expense.amount?.toString() || "0") || 0;
  const originalAmount = parseFloat(expense.amount.toString()) || 0;
  
  if (expense.splitType === "custom" && expense.customSplitAmounts) {
    const customAmount = expense.customSplitAmounts.find(c => c.memberId === userId);
    const originalShare = customAmount?.amount || 0;
    if (originalAmount > 0 && expense.convertedAmountHome) {
      return (originalShare / originalAmount) * parseFloat(expense.convertedAmountHome.toString());
    }
    return originalShare;
  }
  
  return baseAmount / expense.splitWith.length;
};

// Calculate a user's share in original currency for a single expense
const calculateUserShareOriginal = (expense: ExpenseData, userId: string): number => {
  if (!expense.splitWith.includes(userId)) return 0;
  const originalAmount = parseFloat(expense.amount.toString()) || 0;
  if (expense.splitType === "custom" && expense.customSplitAmounts) {
    const customAmount = expense.customSplitAmounts.find(c => c.memberId === userId);
    return customAmount?.amount || 0;
  }
  return originalAmount / expense.splitWith.length;
};

interface TripExpensesProps {
  tripId: string;
  members: Array<{ id: string; name: string; imageUrl?: string; avatar?: string; role: string }>;
  tripName?: string;
  allowedCurrencies?: CurrencyCode[];
  conversationId?: string;
  canAddExpenses?: boolean;
}

const getTripCurrencyStorageKey = (tripId: string) => `trip-travel-currencies:${tripId}`;

const readCachedTripCurrencies = (tripId: string): CurrencyCode[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getTripCurrencyStorageKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as CurrencyCode[];
  } catch {
    return null;
  }
};

const writeCachedTripCurrencies = (tripId: string, currencies: CurrencyCode[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getTripCurrencyStorageKey(tripId), JSON.stringify(currencies));
  } catch {
    // Ignore local cache write errors
  }
};

export function TripExpenses({ tripId, members: providedMembers, tripName = "Trip", allowedCurrencies, conversationId, canAddExpenses = true }: TripExpensesProps) {
  const isMobile = useIsMobile();
  const [subTab, setSubTab] = useState("breakdown");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [filterPayer, setFilterPayer] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "awaiting" | "settled" | "pending">("all");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  // Currency settings sheet state
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);

  // Trip travel currencies loaded from trips.currency_settings
  const [tripTravelCurrencies, setTripTravelCurrencies] = useState<CurrencyCode[]>(() => {
    const cached = readCachedTripCurrencies(tripId);
    if (cached) return cached;
    return Array.isArray(allowedCurrencies) ? allowedCurrencies : [];
  });

  // Currency view toggle - home or original
  const [viewCurrency, setViewCurrency] = useState<"home" | "original">("home");

  // Avatar cache to prevent Dicebear URL regeneration and blinking
  const avatarCache = useRef<Map<string, string>>(new Map());
  
  const getAvatarUrl = (userId: string, existingUrl?: string) => {
    if (existingUrl) return existingUrl;
    if (!avatarCache.current.has(userId)) {
      avatarCache.current.set(userId, `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`);
    }
    return avatarCache.current.get(userId)!;
  };

  // Debug toggle via ?debug=1 or localStorage('debugExpenses' = '1')
  const [debugEnabled] = useState<boolean>(() => {
    try {
      const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const byQuery = !!qs && qs.get("debug") === "1";
      const byStorage = typeof window !== "undefined" && window.localStorage.getItem("debugExpenses") === "1";
      return byQuery || byStorage;
    } catch {
      return false;
    }
  });

  const { expenses: hookExpenses, updateExpense, deleteExpense: removeExpense, addExpense } = useExpenses();
  

  // Helper to update multiple expenses and sync with hook (avoid redeclaration)
  const updateExpensesHelper = (updater: (prev: typeof expenses) => typeof expenses) => {
    const updated = updater(expenses);
    updated.forEach(exp => {
      const original = expenses.find(e => e.id === exp.id);
      if (original && JSON.stringify(original) !== JSON.stringify(exp)) {
        updateExpense(exp as any);
      }
    });
  };

  // Map providedMembers to match mockMembers structure (add descriptor, imageUrl, qrCodeUrl fields)
  const members = useMemo(() => {
    if (providedMembers.length === 0) return mockMembers;
    return providedMembers.map((m) => ({
      ...m,
      // Keep existing imageUrl from parent (already contains avatar_url from TripHub)
      imageUrl: m.imageUrl || m.avatar || undefined,
      descriptor: '',
      qrCodeUrl: undefined,
    }));
  }, [providedMembers]);

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoadingExpenses(true);
      const data = await fetchTripExpenses(tripId);
      
      // Fetch balances from database function
      const balances = await calculateTripBalances(tripId);
      
      // Fetch who owes who
      const debts = await getWhoOwesWho(tripId);
      
      // Fetch payment methods
      const paymentMethods = await fetchTripPaymentMethods(tripId);
      
      const formattedExpenses: ExpenseData[] = data.map((exp: any) => {
        // Get the actual payer from expense_payments (who paid upfront)
        const payerPayment = exp.expense_payments?.[0]; // First payer
        const payerId = payerPayment?.user_id || exp.created_by;
        const payerProfile = payerPayment?.user || exp.creator;
        
        // Calculate payment progress from participants
        const participants = exp.expense_participants || [];
        const receipts = exp.expense_receipts || [];
        const totalParticipants = participants.length;
        const paidParticipants = participants.filter((p: any) => p.is_paid).length;
        const paymentProgress = totalParticipants > 0 
          ? Math.round((paidParticipants / totalParticipants) * 100) 
          : 0;
        
        return {
          id: exp.id,
          title: exp.description,
          amount: Number(exp.amount),
          paidBy: payerProfile?.full_name || payerProfile?.username || 'Unknown',
          date: exp.expense_date,
          category: exp.category,
          imageUrl: exp.receipt_url,
          receipt_url: exp.receipt_url,
          hasReceipt: !!exp.receipt_url,
          splitWith: exp.expense_participants?.map((p: any) => p.user_id) || [],
          notes: exp.notes,
          createdBy: exp.created_by || exp.creator?.id || null,
          // Currency conversion fields
          originalCurrency: exp.original_currency || exp.currency,
          fxRateToHome: exp.fx_rate_to_home,
          convertedAmountHome: exp.converted_amount_home,
          homeCurrency: exp.home_currency,
          payer: {
            id: payerId,
            name: payerProfile?.full_name || payerProfile?.username || 'Unknown',
            imageUrl: payerProfile?.avatar_url,
          },
          payments: exp.expense_participants?.map((p: any) => {
            // Check if this participant has uploaded a receipt
            const participantReceipt = receipts.find((r: any) => r.participant_id === p.user_id);
            
            let status: 'pending' | 'settled' = 'pending';
            let receiptUrl: string | undefined;
            
            // Get receipt URL if available
            if (participantReceipt) {
              receiptUrl = participantReceipt.receipt_url;
            }
            
            if (p.is_paid) {
              status = 'settled';
            } else if (participantReceipt && participantReceipt.status === 'pending') {
              // Receipt uploaded but awaiting payer approval; do NOT mark as settled
              status = 'pending';
            }
            
            return {
              memberId: p.user_id,
              status,
              receiptUrl,
              confirmedByPayer: p.is_paid,
            };
          }) || [],
          paymentProgress,
          splitType: 'equal', // Default, can be enhanced later
        };
      });
      
      setExpenses(formattedExpenses);
      
      // Store balances and debts for settlements
      setBalances(balances || []);
      setDebts(debts || []);
      setPaymentMethods(paymentMethods || []);
      
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [tripId]);

  const loadCurrencySettings = useCallback(async () => {
    try {
      const settings = await getTripCurrencySettings(tripId);
      if (settings && Array.isArray(settings.travel_currencies)) {
        const loadedCurrencies = settings.travel_currencies as CurrencyCode[];
        setTripTravelCurrencies(loadedCurrencies);
        writeCachedTripCurrencies(tripId, loadedCurrencies);
      } else {
        setTripTravelCurrencies([]);
        writeCachedTripCurrencies(tripId, []);
      }
    } catch (e) {
      console.warn('Failed to load trip currency settings, using defaults', e);
      const cached = readCachedTripCurrencies(tripId);
      if (cached) {
        setTripTravelCurrencies(cached);
      }
    }
  }, [tripId]);

  useEffect(() => {
    writeCachedTripCurrencies(tripId, tripTravelCurrencies);
  }, [tripId, tripTravelCurrencies]);

  useEffect(() => {
    loadCurrentUser();
    loadExpenses();
    loadCurrencySettings();
  }, [tripId, loadExpenses, loadCurrencySettings]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };
  
  // Settlement filters
  const [directionFilter, setDirectionFilter] = useState<"all" | "owesMe" | "iOwe">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "settled">("all");
  
  // QR Codes sub-view toggle
  const [qrSubView, setQrSubView] = useState<"myqr" | "others">("myqr");
  
  // Selected member for QR viewing
  const [selectedMemberForQR, setSelectedMemberForQR] = useState<typeof mockMembers[0] | null>(null);

  // Ref for scrolling to category breakdown
  const categoryBreakdownRef = useRef<HTMLDivElement>(null);
  
  // Ref for auto-scroll to top on subtab change
  const topScrollAnchorRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to top when switching sub-tabs
  useEffect(() => {
    topScrollAnchorRef.current?.scrollIntoView({ 
      behavior: "smooth", 
      block: "start" 
    });
  }, [subTab]);

  // Load user's QR from payment methods
  useEffect(() => {
    const userPaymentMethod = paymentMethods.find(
      pm => pm.user_id === currentUserId && pm.qr_code_url && pm.is_active
    );
    if (userPaymentMethod?.qr_code_url) {
      setUserQRUrl(userPaymentMethod.qr_code_url);
    } else {
      setUserQRUrl(null);
    }
  }, [paymentMethods, currentUserId]);

  // Modal states
  const [viewQROpen, setViewQROpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [deleteExpenseOpen, setDeleteExpenseOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseData | null>(null);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<{ title: string; url?: string } | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingExpenseDetails, setViewingExpenseDetails] = useState<ExpenseData | null>(null);
  const [initialModalTab, setInitialModalTab] = useState<"overview" | "payments">("overview");
  
  // Settlement breakdown modal state
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedSettlementForBreakdown, setSelectedSettlementForBreakdown] = useState<Settlement | null>(null);
  
  // Unified settlement confirmation modal state
  const [settlementConfirmModalOpen, setSettlementConfirmModalOpen] = useState(false);
  const [settlementToConfirm, setSettlementToConfirm] = useState<Settlement | null>(null);
  
  // Settlement receipts modal state
  const [receiptsModalOpen, setReceiptsModalOpen] = useState(false);

  // Track recently settled expense IDs for visual feedback
  const [recentlySettledIds, setRecentlySettledIds] = useState<string[]>([]);

  // User's own QR
  const [userQRUrl, setUserQRUrl] = useState<string | null>(null);

  // Track settlement status overrides (when user marks as paid)
  const [settlementStatuses, setSettlementStatuses] = useState<Record<string, "pending" | "settled">>({});

  // Calculate dynamic category breakdown from expenses (always home currency for summary)
  const categoryBreakdown = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    // Sum up amounts by category using selected currency view
    expenses.forEach(expense => {
      const category = expense.category || "Other";
      const originalAmount = Number(expense.amount) || 0;
      const homeAmount = Number(expense.convertedAmountHome ?? originalAmount) || 0;
      const addAmount = homeAmount;
      categoryTotals[category] = (categoryTotals[category] || 0) + addAmount;
    });
    
    // Calculate total for percentages in the same currency space
    const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    // Transform into array with percentages
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: CATEGORY_CONFIG[category]?.color || "bg-gray-500",
        emoji: CATEGORY_CONFIG[category]?.emoji || "📦",
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }, [expenses]);

  // Calculate member contributions from balances (always home currency for summary)
  const memberContributions = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    // Aggregate paid totals per payer based on selected currency view
    const paidTotals: Record<string, number> = {};
    expenses.forEach(exp => {
      const payerId = exp.payer?.id;
      if (!payerId) return;
      const originalAmount = Number(exp.amount) || 0;
      const homeAmount = Number(exp.convertedAmountHome ?? originalAmount) || 0;
      const addAmount = homeAmount;
      paidTotals[payerId] = (paidTotals[payerId] || 0) + addAmount;
    });

    const entries = Object.entries(paidTotals).filter(([, amt]) => amt > 0);
    const totalPaid = entries.reduce((sum, [, amt]) => sum + amt, 0);

    return entries
      .map(([userId, amt], index) => {
        const memberProfile = members.find(m => m.id === userId);
        return {
          name: memberProfile?.name || `Member ${userId}`,
          imageUrl: getAvatarUrl(userId, memberProfile?.imageUrl),
          amount: amt,
          percentage: totalPaid > 0 ? Math.round((amt / totalPaid) * 100) : 0,
          colorIndex: index,
        };
      })
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }, [expenses, members]);

  // Generate settlements from database debts and fallback to expense-derived pairs; apply local status overrides
  const settlements = useMemo(() => {
    // Helper to compute a settlement for a given from/to pair
    const getFallbackMember = (userId: string) => {
      const payerMatch = expenses.find(expense => expense.payer?.id === userId)?.payer;
      return {
        id: userId,
        name: payerMatch?.name || (userId === currentUserId ? "You" : "Member"),
        imageUrl: payerMatch?.imageUrl || "",
      };
    };

    const computeSettlementForPair = (fromUserId: string, toUserId: string, dbAmount?: number) => {
      const fromMember = members.find(m => m.id === fromUserId) || getFallbackMember(fromUserId);
      const toMember = members.find(m => m.id === toUserId) || getFallbackMember(toUserId);

      const settlementId = `settlement-${fromUserId}-${toUserId}`;
      const qrCodeUrl = paymentMethods.find(pm => pm.user_id === toMember.id)?.qr_code_url;

      // 1. Expenses where toUser (creditor) paid and fromUser (debtor) participated
      const expensesToUserPaid = expenses.filter(expense => 
        expense.payer?.id === toUserId && expense.splitWith?.includes(fromUserId)
      );

      // 2. Expenses where fromUser (debtor) paid and toUser (creditor) participated (reverse)
      const expensesFromUserPaid = expenses.filter(expense => 
        expense.payer?.id === fromUserId && expense.splitWith?.includes(toUserId)
      );

      // Check if there are ANY unpaid expenses in either direction
      const hasUnpaidToUser = expensesToUserPaid.some(expense => {
        const payment = expense.payments?.find(p => p.memberId === fromUserId);
        return payment?.status === "pending" || !payment?.confirmedByPayer;
      });

      const hasUnpaidFromUser = expensesFromUserPaid.some(expense => {
        const payment = expense.payments?.find(p => p.memberId === toUserId);
        return payment?.status === "pending" || !payment?.confirmedByPayer;
      });

      // Check if there are receipts awaiting confirmation and get the receipt URL
      let receiptUrl: string | undefined;
      const hasAwaitingConfirmation = expensesToUserPaid.some(expense => {
        const payment = expense.payments?.find(p => p.memberId === fromUserId);
        if (payment?.receiptUrl && !payment?.confirmedByPayer) {
          receiptUrl = payment.receiptUrl;
          return true;
        }
        return false;
      }) || expensesFromUserPaid.some(expense => {
        const payment = expense.payments?.find(p => p.memberId === toUserId);
        if (payment?.receiptUrl && !payment?.confirmedByPayer) {
          receiptUrl = payment.receiptUrl;
          return true;
        }
        return false;
      });

      // Settlement is "settled" only if there are related expenses AND no unpaid items
      const allPaid = (expensesToUserPaid.length > 0 || expensesFromUserPaid.length > 0)
        && !hasUnpaidToUser
        && !hasUnpaidFromUser;

      // Status precedence: awaiting > settled > pending
      let status: "pending" | "settled" | "awaiting" = "pending";
      if (hasAwaitingConfirmation) {
        status = "awaiting";
      } else if (allPaid) {
        status = "settled";
      }

      // Calculate net settlement amount from included shares (home currency)
      const includeSettledOnly = status === "settled";
      const owedSum = expensesToUserPaid.reduce((sum, expense) => {
        const payment = expense.payments?.find(p => p.memberId === fromUserId);
        const isSettled = payment?.status === "settled";
        const shouldInclude = includeSettledOnly ? isSettled : !isSettled;
        if (!shouldInclude) return sum;
        return sum + calculateUserShare(expense, fromUserId);
      }, 0);

      const offsetSum = expensesFromUserPaid.reduce((sum, expense) => {
        const payment = expense.payments?.find(p => p.memberId === toUserId);
        const isSettled = payment?.status === "settled";
        const shouldInclude = includeSettledOnly ? isSettled : !isSettled;
        if (!shouldInclude) return sum;
        return sum + calculateUserShare(expense, toUserId);
      }, 0);

      const netRaw = Math.round((owedSum - offsetSum) * 100) / 100;
      const hasRelatedExpenses = expensesToUserPaid.length > 0 || expensesFromUserPaid.length > 0;
      const dbAmountNormalized = typeof dbAmount === "number" && dbAmount > 0
        ? Math.round(dbAmount * 100) / 100
        : 0;

      const pairExpenses = [...expensesToUserPaid, ...expensesFromUserPaid];
      const conversionRates = pairExpenses
        .map((expense) => {
          const original = Number(expense.amount) || 0;
          const converted = Number(expense.convertedAmountHome);
          const expenseHomeCurrency = expense.homeCurrency || homeCurrency;
          if (!original || !converted) return null;
          if (!expense.originalCurrency || expense.originalCurrency === expenseHomeCurrency) return null;
          return converted / original;
        })
        .filter((rate): rate is number => !!rate && Number.isFinite(rate));

      const averageRate = conversionRates.length
        ? conversionRates.reduce((sum, rate) => sum + rate, 0) / conversionRates.length
        : 1;

      let settlementAmount = netRaw;
      if (!hasRelatedExpenses && dbAmountNormalized > 0) {
        const convertedDb = Math.round(dbAmountNormalized * averageRate * 100) / 100;
        settlementAmount = convertedDb;
      }

      if (Math.abs(settlementAmount) <= 0.009) {
        return null;
      }

      const isNegative = settlementAmount < 0;
      const amountAbsolute = Math.abs(settlementAmount);
      const finalFrom = isNegative ? toMember : fromMember;
      const finalTo = isNegative ? fromMember : toMember;

      const settlement: Settlement = {
        id: settlementId,
        fromUser: { 
          id: finalFrom.id, 
          name: finalFrom.name, 
          imageUrl: finalFrom.imageUrl || ""
        },
        toUser: { 
          id: finalTo.id, 
          name: finalTo.name, 
          imageUrl: finalTo.imageUrl || "",
          ...(qrCodeUrl && { qrCodeUrl })
        },
        amount: amountAbsolute,
        status,
        ...(receiptUrl && { receiptUrl }),
      };

      return settlement;
    };

    const pairKeys = new Set<string>();
    const generatedFromDebts = (debts || [])
      .filter(debt => debt.amount > 0)
      .map(debt => {
        // Map database column names: debtor_id -> from_user_id, creditor_id -> to_user_id
        const fromUserId = debt.debtor_id || debt.from_user_id;
        const toUserId = debt.creditor_id || debt.to_user_id;
        const key = `${fromUserId}-${toUserId}`;
        pairKeys.add(key);
        return computeSettlementForPair(fromUserId, toUserId, Number(debt.amount || 0));
      })
      .filter((s): s is Settlement => !!s);

    // Derive additional pairs directly from expenses if DB debts miss some edges
    const expensePairs = new Set<string>();
    expenses.forEach(expense => {
      const payerId = expense.payer?.id;
      if (!payerId) return;
      expense.splitWith.forEach(memberId => {
        if (memberId === payerId) return;
        const key = `${memberId}-${payerId}`; // member owes payer
        expensePairs.add(key);
      });
    });

    const generatedFromExpenses = Array.from(expensePairs)
      .filter(key => !pairKeys.has(key))
      .map(key => {
        const [fromUserId, toUserId] = key.split("-");
        return computeSettlementForPair(fromUserId, toUserId);
      })
      .filter((s): s is Settlement => !!s);

    const generated = [...generatedFromDebts, ...generatedFromExpenses];

    // Apply local status overrides (e.g., when user marks as paid)
    const withOverrides = generated.map(s => ({
      ...s,
      status: settlementStatuses[s.id] ? settlementStatuses[s.id] : s.status,
    }));

    // De-duplicate pairs and keep the higher net amount (avoids 0.00 cards)
    const pairMap = new Map<string, Settlement>();
    withOverrides.forEach((settlement) => {
      const pairKey = [settlement.fromUser.id, settlement.toUser.id].sort().join("-");
      const existing = pairMap.get(pairKey);
      if (!existing || settlement.amount > existing.amount) {
        pairMap.set(pairKey, settlement);
      }
    });

    return Array.from(pairMap.values()).filter((s) => s.amount > 0.009);
  }, [debts, members, expenses, paymentMethods, settlementStatuses, currentUserId]);

  // Get current user's name from members array
  const currentUserName = useMemo(() => {
    if (!currentUserId) return "User";
    const user = members.find(m => m.id === currentUserId);
    return user?.name || "User";
  }, [currentUserId, members]);

  const totalCost = useMemo(() => {
    return expenses.reduce((sum, e) => {
      const homeAmount = parseFloat((e.convertedAmountHome ?? e.amount).toString()) || 0;
      return sum + homeAmount;
    }, 0);
  }, [expenses]);

  // Get display currency symbol based on viewCurrency
  const getDisplayCurrency = (): string => {
    if (viewCurrency === "original") {
      // Find the most common original currency in expenses
      const currencyCount: Record<string, number> = {};
      expenses.forEach(e => {
        const curr = e.originalCurrency || 'USD';
        currencyCount[curr] = (currencyCount[curr] || 0) + 1;
      });
      const sortedCurrencies = Object.entries(currencyCount).sort((a, b) => b[1] - a[1]);
      return sortedCurrencies[0]?.[0] || 'USD';
    }
    return 'RM';
  };

  const displayCurrency = getDisplayCurrency();
  const summaryDisplayCurrency = "RM";

  const normalizeCurrencyCode = (value?: string) => {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    return normalized === "RM" ? "MYR" : normalized;
  };

  const canSwitchCurrency = useMemo(() => {
    return expenses.some((expense) => {
      const expenseHomeCurrency = normalizeCurrencyCode(expense.homeCurrency || homeCurrency) || "MYR";
      const expenseOriginalCurrency = normalizeCurrencyCode(expense.originalCurrency) || expenseHomeCurrency;
      return expenseOriginalCurrency !== expenseHomeCurrency;
    });
  }, [expenses]);

  // Debug breakdown of owed/receivable components
  const debugBreakdown = useMemo(() => {
    if (!currentUserId) return null;

    const getShare = (expense: ExpenseData, memberId: string) => (
      viewCurrency === "original"
        ? calculateUserShareOriginal(expense, memberId)
        : calculateUserShare(expense, memberId)
    );

    const owedOutByUser: Record<string, number> = {};
    const receivableOutByUser: Record<string, number> = {};

    expenses.forEach(expense => {
      const otherPayerId = expense.payer?.id;
      if (otherPayerId && otherPayerId !== currentUserId && expense.splitWith.includes(currentUserId)) {
        const payment = expense.payments?.find(p => p.memberId === currentUserId);
        const isUnpaid = !payment || payment.status !== "settled" || !payment.confirmedByPayer;
        if (isUnpaid) {
          owedOutByUser[otherPayerId] = (owedOutByUser[otherPayerId] || 0) + getShare(expense, currentUserId);
        }
      }

      const isCurrentPayer = expense.payer?.id === currentUserId;
      if (isCurrentPayer) {
        expense.splitWith
          .filter(memberId => memberId !== currentUserId)
          .forEach(memberId => {
            const payment = expense.payments?.find(p => p.memberId === memberId);
            const isUnpaid = !payment || payment.status !== "settled" || !payment.confirmedByPayer;
            if (isUnpaid) {
              receivableOutByUser[memberId] = (receivableOutByUser[memberId] || 0) + getShare(expense, memberId);
            }
          });
      }
    });

    const netYouOwe = Object.keys(owedOutByUser).reduce((sum, otherId) => {
      const owe = owedOutByUser[otherId] || 0;
      const recv = receivableOutByUser[otherId] || 0;
      const net = Math.max(0, Math.round((owe - recv) * 100) / 100);
      return sum + net;
    }, 0);

    const netOwedToYou = Object.keys(receivableOutByUser).reduce((sum, otherId) => {
      const recv = receivableOutByUser[otherId] || 0;
      const owe = owedOutByUser[otherId] || 0;
      const net = Math.max(0, Math.round((recv - owe) * 100) / 100);
      return sum + net;
    }, 0);

    const owedOutTotal = Object.values(owedOutByUser).reduce((a, b) => a + b, 0);
    const receivableOutTotal = Object.values(receivableOutByUser).reduce((a, b) => a + b, 0);

    return { owedOut: owedOutTotal, receivableOut: receivableOutTotal, netYouOwe, netOwedToYou };
  }, [expenses, currentUserId, viewCurrency]);

  // Calculate current user's balance data from database
  const currentUserBalance = useMemo(() => {
    if (!balances || !currentUserId) return null;
    return balances.find(b => b.user_id === currentUserId);
  }, [balances, currentUserId]);

  // Calculate current user's total share across all expenses
  // Calculate current user's total share across all expenses (paid + unpaid)
  const yourTotalExpenses = useMemo(() => {
    if (!currentUserId) return 0;

    // Calculate from actual expenses instead of database balance
    // because total_owed only counts unpaid amounts
    return expenses.reduce((sum, expense) => {
      if (!expense.splitWith.includes(currentUserId)) {
        return sum;
      }
      if (expense.splitType === "custom" && expense.customSplitAmounts) {
        const customAmount = expense.customSplitAmounts.find(c => c.memberId === currentUserId);
        return sum + (customAmount?.amount || 0);
      }
      return sum + calculateUserShare(expense, currentUserId);
    }, 0);
  }, [expenses, currentUserId]);

  // Calculate NET amount current user owes others from raw expenses, PAIR-WISE (pending + awaiting)
  const youOwe = useMemo(() => {
    if (!currentUserId) return 0;

    const getShare = (expense: ExpenseData, memberId: string) => (
      calculateUserShare(expense, memberId)
    );

    // Build pair-wise maps: {otherUserId -> sum}
    const owedOutByUser: Record<string, number> = {};
    const receivableOutByUser: Record<string, number> = {};

    expenses.forEach(expense => {
      // Case A: Other paid, current user owes (to that other)
      const otherPayerId = expense.payer?.id;
      if (otherPayerId && otherPayerId !== currentUserId && expense.splitWith.includes(currentUserId)) {
        const payment = expense.payments?.find(p => p.memberId === currentUserId);
        const isUnpaid = !payment || payment.status !== "settled" || !payment.confirmedByPayer;
        if (isUnpaid) {
          owedOutByUser[otherPayerId] = (owedOutByUser[otherPayerId] || 0) + getShare(expense, currentUserId);
        }
      }

      // Case B: Current user paid, other owes (receivable from that other)
      const isCurrentPayer = expense.payer?.id === currentUserId;
      if (isCurrentPayer) {
        expense.splitWith
          .filter(memberId => memberId !== currentUserId)
          .forEach(memberId => {
            const payment = expense.payments?.find(p => p.memberId === memberId);
            const isUnpaid = !payment || payment.status !== "settled" || !payment.confirmedByPayer;
            if (isUnpaid) {
              receivableOutByUser[memberId] = (receivableOutByUser[memberId] || 0) + getShare(expense, memberId);
            }
          });
      }
    });

    // Net per counterparty, sum positives where current user owes them
    const totalNetOwe = Object.keys(owedOutByUser).reduce((sum, otherId) => {
      const owe = owedOutByUser[otherId] || 0;
      const recv = receivableOutByUser[otherId] || 0;
      const net = Math.max(0, Math.round((owe - recv) * 100) / 100);
      return sum + net;
    }, 0);

    return Math.round(totalNetOwe * 100) / 100;
  }, [expenses, currentUserId]);

  // Calculate NET amount others owe current user from raw expenses, PAIR-WISE (pending + awaiting)
  const owedToYou = useMemo(() => {
    if (!currentUserId) return 0;

    const getShare = (expense: ExpenseData, memberId: string) => (
      calculateUserShare(expense, memberId)
    );

    const receivableInByUser: Record<string, number> = {};
    const owedInByUser: Record<string, number> = {};

    expenses.forEach(expense => {
      // Case A: Current user paid, other owes current user
      const isCurrentPayer = expense.payer?.id === currentUserId;
      if (isCurrentPayer) {
        expense.splitWith
          .filter(memberId => memberId !== currentUserId)
          .forEach(memberId => {
            const payment = expense.payments?.find(p => p.memberId === memberId);
            const isUnpaid = !payment || payment.status !== "settled" || !payment.confirmedByPayer;
            if (isUnpaid) {
              receivableInByUser[memberId] = (receivableInByUser[memberId] || 0) + getShare(expense, memberId);
            }
          });
      }

      // Case B: Other paid, current user owes (offset against receivable from that same other)
      const otherPayerId = expense.payer?.id;
      if (otherPayerId && otherPayerId !== currentUserId && expense.splitWith.includes(currentUserId)) {
        const payment = expense.payments?.find(p => p.memberId === currentUserId);
        const isUnpaid = !payment || payment.status !== "settled" || !payment.confirmedByPayer;
        if (isUnpaid) {
          owedInByUser[otherPayerId] = (owedInByUser[otherPayerId] || 0) + getShare(expense, currentUserId);
        }
      }
    });

    // Net per counterparty, sum positives where others owe current user
    const totalNetOwedToYou = Object.keys(receivableInByUser).reduce((sum, otherId) => {
      const recv = receivableInByUser[otherId] || 0;
      const owe = owedInByUser[otherId] || 0;
      const net = Math.max(0, Math.round((recv - owe) * 100) / 100);
      return sum + net;
    }, 0);

    return Math.round(totalNetOwedToYou * 100) / 100;
  }, [expenses, currentUserId]);

  // Get unique payers from expenses
  const uniquePayers = useMemo(() => {
    const payers = [...new Set(expenses.map(e => e.paidBy))];
    return payers;
  }, [expenses]);

  // Filter and sort expenses
  // Helper to determine user's payment status for an expense
  const getUserPaymentStatus = useCallback((expense: ExpenseData): "settled" | "pending" | "payer" => {
    if (!currentUserId) return "pending";
    const isPayer = expense.payer?.id === currentUserId;
    if (isPayer) return "payer";

    const userPayment = expense.payments?.find(p => p.memberId === currentUserId);
    if (userPayment?.confirmedByPayer && userPayment.status === "settled") return "settled";
    return "pending";
  }, [currentUserId]);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // Only show expenses involving the current user
    if (currentUserId) {
      result = result.filter(e =>
        e.payer?.id === currentUserId ||
        e.createdBy === currentUserId ||
        e.splitWith?.includes(currentUserId)
      );
    }
    
    // Filter by payer
    if (filterPayer !== "all") {
      result = result.filter(e => e.paidBy === filterPayer);
    }
    
    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter(e => getCategoryFromTitle(e.title) === filterCategory);
    }
    
    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter(e => {
        const status = getUserPaymentStatus(e);
        if (filterStatus === "settled") return status === "settled" || e.paymentProgress === 100;
        if (filterStatus === "pending") return status === "pending";
        return true;
      });
    }
    
    // Sort by date
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "latest" ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [expenses, sortOrder, filterPayer, filterCategory, filterStatus, getUserPaymentStatus, currentUserId]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sortOrder !== "latest") count++;
    if (filterPayer !== "all") count++;
    if (filterCategory !== "all") count++;
    if (filterStatus !== "all") count++;
    return count;
  }, [sortOrder, filterPayer, filterCategory, filterStatus]);

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setSortOrder("latest");
    setFilterPayer("all");
    setFilterCategory("all");
    setFilterStatus("all");
  };

  // Filter settlements based on direction and status filters - only show settlements involving current user
  const filteredSettlements = useMemo(() => {
    return settlements.filter(s => {
      if (currentUserId) {
        // Always filter to only show settlements involving the current user
        const involvesCurrentUser = 
          s.fromUser.id === currentUserId || s.toUser.id === currentUserId;
        
        if (!involvesCurrentUser) return false;
        
        // Direction filter (within settlements that involve me)
        if (directionFilter === "owesMe" && s.toUser.id !== currentUserId) return false;
        if (directionFilter === "iOwe" && s.fromUser.id !== currentUserId) return false;
      }

      // Status filter
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      
      return true;
    });
  }, [settlements, directionFilter, statusFilter, currentUserId]);

  // Compute contributing expenses for each settlement (both directions for net calculation)
  const getContributingExpenses = (settlement: Settlement): {
    owedToReceiver: SettlementExpense[];
    owedToDebtor: SettlementExpense[];
    grossOwed: number;
    grossOffset: number;
  } => {
    const owedToReceiver: SettlementExpense[] = []; // fromUser owes toUser
    const owedToDebtor: SettlementExpense[] = [];   // toUser owes fromUser (reverse/offset)
    
    expenses.forEach((expense, index) => {
      const payer = members.find(m => m.name === expense.paidBy);
      
      if (!payer) {
        return;
      }
      
      // Direction 1: toUser paid, fromUser owes
      if (payer.id === settlement.toUser.id && expense.splitWith?.includes(settlement.fromUser.id)) {
        const shareAmount = calculateUserShare(expense, settlement.fromUser.id);
        const memberPayment = expense.payments?.find(p => p.memberId === settlement.fromUser.id);
        const status: SettlementExpense["status"] = memberPayment?.status === "settled" 
          ? "settled" 
          : "pending";
        
        // Include settled expenses when viewing a settled settlement
        const shouldInclude = settlement.status === "settled" 
          ? status === "settled" 
          : status !== "settled";
        
        if (shouldInclude) {
          owedToReceiver.push({
            expenseId: expense.id,
            title: expense.title,
            date: expense.date,
            shareAmount,
            status,
            category: expense.category || getCategoryFromTitle(expense.title),
            paidBy: expense.paidBy,
          });
        }
      }
      
      // Direction 2: fromUser paid, toUser owes (reverse - this gets subtracted)
      if (payer.id === settlement.fromUser.id && expense.splitWith?.includes(settlement.toUser.id)) {
        const shareAmount = calculateUserShare(expense, settlement.toUser.id);
        const memberPayment = expense.payments?.find(p => p.memberId === settlement.toUser.id);
        const status: SettlementExpense["status"] = memberPayment?.status === "settled" 
          ? "settled" 
          : "pending";
        
        // Include settled expenses when viewing a settled settlement
        const shouldInclude = settlement.status === "settled" 
          ? status === "settled" 
          : status !== "settled";
        
        if (shouldInclude) {
          owedToDebtor.push({
            expenseId: expense.id,
            title: expense.title,
            date: expense.date,
            shareAmount,
            status,
            category: expense.category || getCategoryFromTitle(expense.title),
            paidBy: expense.paidBy,
          });
        }
      }
    });
    
    const grossOwed = owedToReceiver.reduce((sum, e) => sum + e.shareAmount, 0);
    const grossOffset = owedToDebtor.reduce((sum, e) => sum + e.shareAmount, 0);

    if (owedToReceiver.length === 0 && settlement.amount > 0) {
      const fallbackStatus: SettlementExpense["status"] =
        settlement.status === "settled" ? "settled" : "pending";
      owedToReceiver.push({
        expenseId: `debt-${settlement.fromUser.id}-${settlement.toUser.id}`,
        title: "Net balance from debts",
        date: new Date().toISOString(),
        shareAmount: settlement.amount,
        status: fallbackStatus,
        category: "Other",
        paidBy: settlement.toUser.name,
      });
      return { owedToReceiver, owedToDebtor, grossOwed: settlement.amount, grossOffset };
    }

    return { owedToReceiver, owedToDebtor, grossOwed, grossOffset };
  };

  // Handler for settlement card click
  const handleSettlementCardClick = (settlement: Settlement) => {
    setSelectedSettlementForBreakdown(settlement);
    setBreakdownModalOpen(true);
  };
  // Helper: Get all expense payments contributing to a settlement
  const getExpensePaymentsForSettlement = (settlement: Settlement): { expenseId: string; memberId: string }[] => {
    const result: { expenseId: string; memberId: string }[] = [];

    expenses.forEach(expense => {
      // Prefer payer id from expense data to avoid name mismatches
      const payerId = expense.payer?.id || members.find(m => m.name === expense.paidBy)?.id;
      if (!payerId) return;

      // Case 1: toUser paid, fromUser owes (fromUser is the debtor)
      if (payerId === settlement.toUser.id && expense.splitWith?.includes(settlement.fromUser.id)) {
        const memberPayment = expense.payments?.find(p => p.memberId === settlement.fromUser.id);
        // Include if payment is not fully settled (pending or awaiting confirmation)
        if (!memberPayment || memberPayment.status !== "settled" || !memberPayment.confirmedByPayer) {
          result.push({ expenseId: expense.id, memberId: settlement.fromUser.id });
        }
      }

      // Case 2: fromUser paid, toUser owes (reverse direction for net calculation)
      if (payerId === settlement.fromUser.id && expense.splitWith?.includes(settlement.toUser.id)) {
        const memberPayment = expense.payments?.find(p => p.memberId === settlement.toUser.id);
        // Include if payment is not fully settled (pending or awaiting confirmation)
        if (!memberPayment || memberPayment.status !== "settled" || !memberPayment.confirmedByPayer) {
          result.push({ expenseId: expense.id, memberId: settlement.toUser.id });
        }
      }
    });

    return result;
  };

  // Helper: Cascade settlement to update all related expense payments
  const cascadeSettlementToExpenses = (settlement: Settlement) => {
    const expenseUpdates = getExpensePaymentsForSettlement(settlement);
    
    setExpenses(prev => prev.map(expense => {
      const updatesForThisExpense = expenseUpdates.filter(u => u.expenseId === expense.id);
      
      if (updatesForThisExpense.length > 0) {
        // Create or update payments array
        const existingPayments = expense.payments || [];
        const updatedPayments = expense.splitWith.map(memberId => {
          const existing = existingPayments.find(p => p.memberId === memberId);
          const shouldSettle = updatesForThisExpense.some(u => u.memberId === memberId);
          
          if (shouldSettle) {
            return { 
              memberId, 
              status: "settled" as const,
              confirmedByPayer: true,
              receiptUrl: existing?.receiptUrl,
              uploadedAt: existing?.uploadedAt,
              payerNote: existing?.payerNote
            };
          }
          return existing || { memberId, status: "pending" as const };
        });
        
        // Recalculate payment progress based on amounts
        const settledAmount = updatedPayments
          .filter(p => p.status === "settled")
          .reduce((sum, p) => {
            if (expense.splitType === "custom" && expense.customSplitAmounts) {
              const customAmount = expense.customSplitAmounts.find(c => c.memberId === p.memberId);
              return sum + (customAmount?.amount || 0);
            }
            return sum + (expense.amount / updatedPayments.length);
          }, 0);
        const newProgress = Math.round((settledAmount / expense.amount) * 100);
        
        return { ...expense, payments: updatedPayments, paymentProgress: newProgress };
      }
      return expense;
    }));
  };

  // Get affected expenses for confirmation dialog display
  const getAffectedExpensesForDisplay = (settlement: Settlement) => {
    const expenseUpdates = getExpensePaymentsForSettlement(settlement);
    const uniqueExpenseIds = [...new Set(expenseUpdates.map(u => u.expenseId))];
    
    return uniqueExpenseIds.map(expenseId => {
      const expense = expenses.find(e => e.id === expenseId);
      const update = expenseUpdates.find(u => u.expenseId === expenseId);
      if (!expense || !update) return null;
      
      return {
        id: expense.id,
        title: expense.title,
        shareAmount: calculateUserShare(expense, update.memberId),
      };
    }).filter(Boolean) as { id: string; title: string; shareAmount: number }[];
  };

  // Handler for initiating settlement confirmation (direct to unified modal)
  const handleInitiateSettlement = (settlement: Settlement) => {
    setSettlementToConfirm(settlement);
    setSettlementConfirmModalOpen(true);
  };

  // Handler for confirming settlement from unified modal
  const handleConfirmSettlement = async () => {
    if (settlementToConfirm) {
      try {
        // Get affected expense IDs and details
        const expenseUpdates = getExpensePaymentsForSettlement(settlementToConfirm);
        const uniqueIds = [...new Set(expenseUpdates.map(u => u.expenseId))];

        // Mark each participant as paid for their related expenses
        const expenseIdsByMember = expenseUpdates.reduce((acc, update) => {
          if (!acc[update.memberId]) acc[update.memberId] = [];
          acc[update.memberId].push(update.expenseId);
          return acc;
        }, {} as Record<string, string[]>);

        for (const [memberId, expenseIds] of Object.entries(expenseIdsByMember)) {
          await markParticipantsAsPaid(expenseIds, memberId);
          for (const expenseId of expenseIds) {
            try {
              await supabase.functions.invoke('send-expense-payment-marked', {
                body: { expenseId, participantId: memberId }
              });
            } catch (e) {
              console.warn('Failed to send payment marked email', e);
            }
          }
        }
        
        // Update local state for immediate feedback
        cascadeSettlementToExpenses(settlementToConfirm);
        
        // Set recently settled for visual feedback
        setRecentlySettledIds(uniqueIds);
        
        // Reload expenses to get updated data from database
        await loadExpenses();
        
        // Stay on settlements tab after confirming
        setSubTab("settle");
        
        // Clear highlight after 3 seconds
        setTimeout(() => setRecentlySettledIds([]), 3000);
        
        toast({
          title: "Settlement completed",
          description: `${uniqueIds.length} expense(s) with ${settlementToConfirm.fromUser.name} marked as settled`,
        });
        
        setSettlementToConfirm(null);
      } catch (error) {
        console.error('Error settling:', error);
        toast({
          title: "Error",
          description: "Failed to record settlement. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Handler for marking all as paid from breakdown modal
  const handleMarkAllPaidFromBreakdown = () => {
    if (selectedSettlementForBreakdown) {
      setSettlementToConfirm(selectedSettlementForBreakdown);
      setBreakdownModalOpen(false);
      setSettlementConfirmModalOpen(true);
    }
  };

  // Handler for viewing settlement receipts
  const handleViewSettlementReceipts = () => {
    if (selectedSettlementForBreakdown) {
      setBreakdownModalOpen(false);
      setReceiptsModalOpen(true);
    }
  };

  // Get receipts for a settlement
  const getReceiptsForSettlement = (settlement: Settlement) => {
    const { owedToReceiver } = getContributingExpenses(settlement);
    
    return owedToReceiver
      .filter(e => e.status === "pending")
      .map(e => {
        const expense = expenses.find(exp => exp.id === e.expenseId);
        const payment = expense?.payments?.find(p => p.memberId === settlement.fromUser.id);
        
        return {
          expenseId: e.expenseId,
          expenseTitle: e.title,
          amount: e.shareAmount,
          date: e.date,
          receiptUrl: payment?.receiptUrl || undefined,
          payerNote: payment?.payerNote,
          uploadedAt: payment?.uploadedAt,
          category: e.category,
        };
      });
  };

  // Card tap handlers
  const handleTotalSpendTap = () => {
    setSubTab("breakdown");
    setTimeout(() => {
      categoryBreakdownRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleYouPaidTap = () => {
    setSubTab("expenses");
  };

  const handleOwedToYouTap = () => {
    setDirectionFilter("owesMe");
    setStatusFilter("all");
    setSubTab("settle");
  };

  const handleYouOweTap = () => {
    setDirectionFilter("iOwe");
    setStatusFilter("all");
    setSubTab("settle");
  };

  const handleViewQR = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setViewQROpen(true);
  };

  const logSettlementPendingDetails = (settlement: Settlement) => {
    if (!debugEnabled) return;
    const updates = getExpensePaymentsForSettlement(settlement);
    const details = updates.map((update) => {
      const expense = expenses.find((exp) => exp.id === update.expenseId);
      const payment = expense?.payments?.find((p) => p.memberId === update.memberId);
      return {
        expenseId: update.expenseId,
        memberId: update.memberId,
        paymentStatus: payment?.status,
        confirmedByPayer: payment?.confirmedByPayer,
        receiptUrl: payment?.receiptUrl,
      };
    });
    console.info("[settlement-debug] pending-check", {
      settlementId: settlement.id,
      details,
    });
  };

  // Handler for "Mark as Paid" - directly opens unified confirmation modal
  const handleMarkPaid = (settlement: Settlement) => {
    logSettlementPendingDetails(settlement);
    setSettlementToConfirm(settlement);
    setSettlementConfirmModalOpen(true);
  };

  const handleSendReminder = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setReminderOpen(true);
  };

  // Handler for "Upload Receipt" - opens receipts modal for settlement
  const handleUploadReceipt = (settlement: Settlement) => {
    // Get the first expense where the user owes money
    const { owedToReceiver } = getContributingExpenses(settlement);
    
    const firstUnpaidExpense = owedToReceiver.find(e => e.status === "pending");
    
    if (firstUnpaidExpense) {
      const expense = expenses.find(exp => exp.id === firstUnpaidExpense.expenseId);
      
      if (expense) {
        setViewingExpenseDetails(expense);
        setInitialModalTab("payments"); // Open to Payments tab
        setDetailsModalOpen(true);
      }
    } else {
      toast({
        title: "No pending expenses",
        description: "All expenses in this settlement have been paid.",
        variant: "default",
      });
    }
  };

  const handleViewSettlementReceipt = (settlement: Settlement) => {
    if (settlement.receiptUrl) {
      setViewingReceipt({
        title: `Receipt from ${settlement.fromUser.name}`,
        url: settlement.receiptUrl
      });
      setReceiptViewerOpen(true);
    } else {
      // If no receipt URL, try to open the expense details
      const { owedToReceiver } = getContributingExpenses(settlement);
      const awaitingExpense = owedToReceiver.find(e => e.status === "settled");
      
      if (awaitingExpense) {
        const expense = expenses.find(exp => exp.id === awaitingExpense.expenseId);
        if (expense) {
          setViewingExpenseDetails(expense);
          setInitialModalTab("payments");
          setDetailsModalOpen(true);
        }
      }
    }
  };

  const handleReminderSend = async (message: string) => {
    if (!selectedSettlement) {
      throw new Error("No settlement selected.");
    }
    if (!currentUserId) {
      throw new Error("You must be signed in to send reminders.");
    }

    await sendSettlementReminder({
      tripId,
      payerId: selectedSettlement.toUser.id,
      recipientId: selectedSettlement.fromUser.id,
      amount: selectedSettlement.amount,
      currency: homeCurrency,
      message,
      channels: ["notification", "chat", "email"],
    });
  };

  const handleUploadUserQR = async (file: File) => {
    try {
      // Upload QR image to storage
      const qrCodeUrl = await uploadPaymentQR(tripId, file);
      
      // Save payment method to database
      await upsertPaymentMethod({
        trip_id: tripId,
        name: "Payment QR",
        description: "My payment QR code",
        qr_code_url: qrCodeUrl,
        is_default: false
      });

      // Update local state
      setUserQRUrl(qrCodeUrl);
      
      // Reload payment methods
      await loadExpenses();
      
      toast({
        title: "QR uploaded",
        description: "Your payment QR has been saved",
      });
    } catch (error) {
      console.error("Error uploading QR:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload QR code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUserQR = async () => {
    try {
      // Update database to set is_active=false
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('trip_payment_methods')
        .update({ is_active: false })
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setUserQRUrl(null);
      
      // Reload payment methods
      await loadExpenses();
      
      toast({
        title: "QR removed",
        description: "Your payment QR has been removed",
      });
    } catch (error) {
      console.error("Error removing QR:", error);
      toast({
        title: "Remove failed",
        description: "Failed to remove QR code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddExpense = async (newExpense: NewExpense) => {
    try {
      // Find the payer's user ID from their name
      const payer = members.find(m => m.name === newExpense.paidBy);
      const payerId = payer?.id || currentUserId;

      // Calculate split amounts for each participant
      const participants = newExpense.splitWith.map(memberId => {
        let amountOwed = 0;
        
        if (newExpense.splitType === "custom" && newExpense.customSplitAmounts) {
          const customAmount = newExpense.customSplitAmounts.find(c => c.memberId === memberId);
          amountOwed = customAmount?.amount || 0;
        } else {
          // Equal split
          amountOwed = newExpense.amount / newExpense.splitWith.length;
        }
        
        return {
          user_id: memberId,
          amount_owed: amountOwed
        };
      });

      // Create expense in database
      const createdExpense = await createExpense({
        trip_id: tripId,
        description: newExpense.title,
        amount: newExpense.amount,
        currency: newExpense.originalCurrency || 'MYR',
        category: newExpense.category,
        expense_date: new Date().toISOString(),
        notes: newExpense.notes,
        payer_id: payerId, // Use UUID, not name
        receipt_file: newExpense.receiptFile, // Upload receipt if provided
        // Multi-currency fields
        original_currency: newExpense.originalCurrency,
        fx_rate_to_home: newExpense.fxRateToHome,
        converted_amount_home: newExpense.convertedAmountHome,
        home_currency: newExpense.homeCurrency,
        participants
      });

      const currencySymbol = newExpense.originalCurrency === 'MYR' ? 'RM' : newExpense.originalCurrency || 'RM';
      toast({
        title: "Expense added",
        description: `${newExpense.title} - ${currencySymbol} ${newExpense.amount.toFixed(2)} saved successfully`,
      });

      const expenseUpdatesEnabled = await isTripNotificationEnabled(tripId, 'expense_updates');

      if (expenseUpdatesEnabled) {
        try {
          await supabase.functions.invoke('send-expense-added', {
            body: { expenseId: createdExpense.id }
          });
        } catch (e) {
          console.warn('Failed to send expense added emails', e);
        }

        // Keep expense system messages aligned with the trip setting.
        if (conversationId && payer) {
          try {
            const formattedSystemAmount = newExpense.amount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            const expenseDetail = `${newExpense.title} - ${currencySymbol} ${formattedSystemAmount}`;
            await sendSystemMessage({
              conversationId,
              action: "expense_added",
              senderName: payer.name,
              details: expenseDetail,
            });
          } catch (e) {
            console.warn('Failed to send expense system message:', e);
          }
        }
      }

      // Reload expenses from database
      await loadExpenses();
      
      // Switch to expenses tab to show the new expense
      setSubTab("expenses");
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditExpense = async (id: string, updatedExpense: NewExpense) => {
    try {
      // Get the payer's user ID
      const payerMember = members.find(m => m.name === updatedExpense.paidBy);
      const payerId = payerMember?.id;

      if (!payerId) {
        toast({
          title: "Error",
          description: "Could not find payer information",
          variant: "destructive",
        });
        return;
      }

      // Handle receipt upload if there's a new file
      let receiptUrl = updatedExpense.existingReceiptUrl; // Start with existing URL
      
      if (updatedExpense.receiptFile) {
        // Upload new receipt directly to storage
        const fileExt = updatedExpense.receiptFile.name.split('.').pop();
        const fileName = `${id}-${Date.now()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('expense-receipts')
          .upload(filePath, updatedExpense.receiptFile);

        if (uploadError) {
          console.error('Receipt upload failed:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('expense-receipts')
            .getPublicUrl(filePath);
          receiptUrl = publicUrl;
        }
      }

      // 1. Update main expense record
      const updates: any = {
        description: updatedExpense.title,
        amount: updatedExpense.amount,
        category: updatedExpense.category,
        expense_date: updatedExpense.date,
        notes: updatedExpense.notes,
        original_currency: updatedExpense.originalCurrency,
        fx_rate_to_home: updatedExpense.fxRateToHome,
        converted_amount_home: updatedExpense.convertedAmountHome,
        home_currency: updatedExpense.homeCurrency,
      };

      // Add receipt URL if changed
      if (receiptUrl) {
        updates.receipt_url = receiptUrl;
      }

      await supabase
        .from('trip_expenses')
        .update(updates)
        .eq('id', id);

      // 2. Update expense_payments (who paid)
      // Delete existing payment records
      await supabase
        .from('expense_payments')
        .delete()
        .eq('expense_id', id);

      // Insert new payment record
      await supabase
        .from('expense_payments')
        .insert({
          expense_id: id,
          user_id: payerId,
          amount_paid: updatedExpense.amount
        });

      // 3. Update expense_participants (who owes what)
      // Delete existing participants
      await supabase
        .from('expense_participants')
        .delete()
        .eq('expense_id', id);

      // Calculate and insert new participants
      const participants = updatedExpense.splitWith.map(memberId => {
        let amountOwed = 0;
        
        if (updatedExpense.splitType === "custom" && updatedExpense.customSplitAmounts) {
          const customAmount = updatedExpense.customSplitAmounts.find(a => a.memberId === memberId);
          amountOwed = customAmount?.amount || 0;
        } else {
          // Equal split
          amountOwed = updatedExpense.amount / updatedExpense.splitWith.length;
        }

        return {
          expense_id: id,
          user_id: memberId,
          amount_owed: amountOwed,
          // Auto-mark as paid if participant is also the payer
          is_paid: memberId === payerId,
          paid_at: memberId === payerId ? new Date().toISOString() : null
        };
      });

      if (participants.length > 0) {
        await supabase
          .from('expense_participants')
          .insert(participants);
      }

      // Reload expenses from database to reflect changes
      await loadExpenses();
      
      setEditingExpense(null);
      
      toast({
        title: "Expense updated",
        description: `${updatedExpense.title} has been updated`,
      });

      if (await isTripNotificationEnabled(tripId, 'expense_updates')) {
        try {
          await supabase.functions.invoke('send-expense-updated', {
            body: { expenseId: id }
          });
        } catch (e) {
          console.warn('Failed to send expense updated emails', e);
        }
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      // Optimistically remove from UI
      setExpenses(prev => prev.filter(e => e.id !== deletingExpense.id));

      // Persist deletion to DB (soft delete via is_deleted=true)
      await deleteExpense(deletingExpense.id);

      // Reload expenses to reflect server state
      await loadExpenses();

      toast({
        title: "Expense deleted",
        description: `${deletingExpense.title} has been removed`,
      });

      if (await isTripNotificationEnabled(tripId, 'expense_updates')) {
        try {
          await supabase.functions.invoke('send-expense-deleted', {
            body: { expenseId: deletingExpense.id }
          });
        } catch (e) {
          console.warn('Failed to send expense deleted emails', e);
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingExpense(null);
      setDeleteExpenseOpen(false);
    }
  };

  const openEditExpense = (expense: ExpenseData) => {
    setEditingExpense(expense);
    setAddExpenseOpen(true);
  };

  const openDeleteExpense = (expense: ExpenseData) => {
    setDeletingExpense(expense);
    setDeleteExpenseOpen(true);
  };

  const openReceiptViewer = (expense: ExpenseData) => {
    // For demo purposes, use a placeholder receipt image
    setViewingReceipt({
      title: expense.title,
      url: expense.hasReceipt ? "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop" : undefined,
    });
    setReceiptViewerOpen(true);
  };

  // Card click → opens Overview tab
  const handleCardClick = (expense: ExpenseData) => {
    setViewingExpenseDetails(expense);
    setInitialModalTab("overview");
    setDetailsModalOpen(true);
  };

  // Primary action button click → opens Payments tab
  const handlePrimaryAction = (expense: ExpenseData) => {
    setViewingExpenseDetails(expense);
    setInitialModalTab("payments");
    setDetailsModalOpen(true);
  };

  // Handle marking member payment as received from modal
  const handleMarkAsReceived = (memberId: string) => {
    // This will be called from the modal
    console.log("Mark as received for member:", memberId);
  };

  // Handle uploading proof from modal
  const handleUploadProof = (file: File, note?: string) => {
    console.log("Proof uploaded:", file, note);
  };

  // Handle submitting payment proof from modal (user marks themselves as paid)
  const handleSubmitPayment = async (
    expenseId: string, 
    memberId: string, 
    receiptFile?: File,
    payerNote?: string
  ) => {
    try {
      let receiptUrl: string | undefined;
      
      // Upload receipt file to storage if provided
      if (receiptFile) {
        const receiptData = await uploadReceipt(expenseId, memberId, receiptFile, payerNote);
        receiptUrl = receiptData.receipt_url;
        
        toast({
          title: "Payment proof uploaded",
          description: "Your receipt has been submitted for review.",
        });
      }
      
      const uploadedAt = new Date().toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
      });
      
      setExpenses(prev => prev.map(expense => {
        if (expense.id === expenseId) {
          // Ensure payments array exists
          const existingPayments = expense.payments || expense.splitWith.map(id => ({
            memberId: id,
            status: "pending" as const
          }));
          
          // Update the specific member's payment to "settled" (awaiting payer confirmation)
          const updatedPayments = existingPayments.map(p => 
            p.memberId === memberId 
              ? { 
                  ...p, 
                  status: "settled" as const,
                  receiptUrl,
                  payerNote,
                  uploadedAt,
                  confirmedByPayer: false
                } 
              : p
          );
          
          return { ...expense, payments: updatedPayments };
        }
        return expense;
      }));
      
      // Also update the viewing expense details for immediate modal feedback
      if (viewingExpenseDetails?.id === expenseId) {
        setViewingExpenseDetails(prev => prev ? {
          ...prev,
          payments: (prev.payments || prev.splitWith.map(id => ({ memberId: id, status: "pending" as const }))).map(p => 
            p.memberId === memberId 
              ? { ...p, status: "settled" as const, receiptUrl, payerNote, uploadedAt, confirmedByPayer: false } 
              : p
          )
        } : null);
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload receipt. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle progress update from modal
  const handleUpdateProgress = (expenseId: string, newProgress: number) => {
    setExpenses(prev => prev.map(e => {
      if (e.id === expenseId) {
        return { ...e, paymentProgress: newProgress };
      }
      return e;
    }));
  };

  // Handle confirming payment settled (with verification)
  const handleConfirmPaymentSettled = async (expenseId: string, memberId: string) => {
    try {
      // Save to database
      await markParticipantsAsPaid([expenseId], memberId);
      try {
        await supabase.functions.invoke('send-expense-payment-marked', {
          body: { expenseId, participantId: memberId }
        });
      } catch (e) {
        console.warn('Failed to send payment marked email', e);
      }
      
      // Update local state
      setExpenses(prev => prev.map(expense => {
        if (expense.id === expenseId && expense.payments) {
          const updatedPayments = expense.payments.map(p => 
            p.memberId === memberId ? { ...p, status: "settled" as const, confirmedByPayer: true } : p
          );
          // Calculate progress based on amounts
          const settledAmount = updatedPayments
            .filter(p => p.status === "settled")
            .reduce((sum, p) => {
              if (expense.splitType === "custom" && expense.customSplitAmounts) {
                const customAmount = expense.customSplitAmounts.find(c => c.memberId === p.memberId);
                return sum + (customAmount?.amount || 0);
              }
              return sum + (expense.amount / updatedPayments.length);
            }, 0);
          const newProgress = Math.round((settledAmount / expense.amount) * 100);
          
          return { 
            ...expense, 
            payments: updatedPayments,
            paymentProgress: newProgress 
          };
        }
        return expense;
      }));
      
      toast({
        title: "Payment confirmed",
        description: "The payment has been verified and saved to the database.",
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Check if a settlement can show reminder (pending + others owe current user)
  const canShowReminder = (settlement: Settlement) => {
    return settlement.status === "pending" && settlement.toUser.name === currentUserId;
  };

  // Get members who have uploaded QR codes (excluding current user)
  const membersWithQR = useMemo(() => {
    return paymentMethods
      .filter(pm => pm.user_id !== currentUserId && pm.qr_code_url && pm.is_active)
      .map(pm => {
        // Find member profile to get avatar/imageUrl
        const memberProfile = members.find(m => m.id === pm.user_id);
        return {
          id: pm.user_id,
          name: pm.user_name || 'Unknown User',
          imageUrl: memberProfile?.imageUrl,
          qrCodeUrl: pm.qr_code_url,
          paymentMethodName: pm.name,
          description: pm.description
        };
      });
  }, [paymentMethods, currentUserId, members]);

  // Handler for viewing a member's QR code
  const handleViewMemberQR = (member: typeof mockMembers[0]) => {
    setSelectedMemberForQR(member);
    setViewQROpen(true);
  };

  return (
    <div className="relative">
      {/* Scroll anchor for auto-scroll on subtab change */}
      <div ref={topScrollAnchorRef} className="absolute top-0 left-0" />

      {isLoadingExpenses && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/65 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading trip expenses...
          </div>
        </div>
      )}

      {/* Always Visible: Header + Stat Cards */}
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Trip Expenses Overview</h2>
            <p className="text-sm text-muted-foreground">See where the money went and who's settled.</p>
          </div>
          <div className="flex gap-2">
            {subTab === "expenses" && canSwitchCurrency && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 -mt-1"
                onClick={() => setViewCurrency(viewCurrency === "home" ? "original" : "home")}
                title={`Switch to ${viewCurrency === "home" ? "original" : "home"} currency`}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 -mt-1"
              onClick={() => setSettingsSheetOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Debug: show ID and net components */}
        {debugEnabled && (
          <div className="mt-2 text-[11px] sm:text-xs text-muted-foreground">
            <div>
              Debug • User: {currentUserName} [{currentUserId || "N/A"}] • Currency: {displayCurrency}
            </div>
            {debugBreakdown && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span>OweOut: {debugBreakdown.owedOut.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>RecvOut: {debugBreakdown.receivableOut.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>Net You Owe: {debugBreakdown.netYouOwe.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>RecvIn: {debugBreakdown.receivableOut.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>OwedIn: {debugBreakdown.owedOut.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>Net You're Owed: {debugBreakdown.netOwedToYou.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        )}

        {/* Interactive Stat Cards - Mobile: 1 full + 2 column, Desktop: 2x2 grid */}
        {isMobile ? (
          <div className="space-y-2">
            {/* Your Total Expenses - Full width on mobile */}
            <StatCard
              title="Your Total Expenses"
              value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(yourTotalExpenses)}`}
              icon={Wallet}
              color="green"
              subtitle="Your share of all trip costs"
              tooltip="Includes expenses paid by others that were split with you"
              onClick={handleYouPaidTap}
              variant="highlight"
            />
            {/* You're Owed + You Owe - Two column layout */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                title="You're Owed"
                value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(owedToYou)}`}
                icon={TrendingUp}
                color="orange"
                description="Net from others"
                tooltip="Net amount after offsetting what you owe them"
                onClick={handleOwedToYouTap}
              />
              <StatCard
                title="You Owe"
                value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(youOwe)}`}
                icon={TrendingDown}
                color="red"
                description="Net to others"
                tooltip="Net amount after offsetting what they owe you"
                onClick={handleYouOweTap}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Total Trip Spend"
              value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(totalCost)}`}
              icon={DollarSign}
              color="blue"
              description="All group expenses"
              onClick={handleTotalSpendTap}
            />
            <StatCard
              title="Your Total Expenses"
              value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(yourTotalExpenses)}`}
              icon={Wallet}
              color="green"
              subtitle="Your share of all trip costs"
              tooltip="Includes expenses paid by others that were split with you"
              onClick={handleYouPaidTap}
            />
            <StatCard
              title="You're Owed"
              value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(owedToYou)}`}
              icon={TrendingUp}
              color="orange"
              description="Net from others"
              tooltip="Net amount after offsetting what you owe them"
              onClick={handleOwedToYouTap}
            />
            <StatCard
              title="You Owe"
              value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(youOwe)}`}
              icon={TrendingDown}
              color="red"
              description="Net to others"
              tooltip="Net amount after offsetting what they owe you"
              onClick={handleYouOweTap}
            />
          </div>
        )}

        {/* Sub Tabs - Below Stat Cards */}
        {isMobile ? (
          <ScrollableTabBar
            options={[
              { label: "Summary", value: "breakdown" },
              { label: "All Expenses", value: "expenses" },
              { label: "Settlement", value: "settle" },
              { label: "QR Codes", value: "qrcodes" },
            ]}
            value={subTab}
            onChange={(value) => {
              setSubTab(value);
              if (value === "settle") {
                setDirectionFilter("all");
                setStatusFilter("all");
              }
              if (value === "expenses") {
                setFilterPayer("all");
                setFilterCategory("all");
              }
              if (value === "qrcodes") {
                setQrSubView("myqr");
              }
            }}
          />
        ) : (
          <SegmentedControl
            options={[
              { label: "Summary", value: "breakdown" },
              { label: "All Expenses", value: "expenses" },
              { label: "Settlement", value: "settle" },
              { label: "QR Codes", value: "qrcodes" },
            ]}
            value={subTab}
            onChange={(value) => {
              setSubTab(value);
              if (value === "settle") {
                setDirectionFilter("all");
                setStatusFilter("all");
              }
              if (value === "expenses") {
                setFilterPayer("all");
                setFilterCategory("all");
              }
              if (value === "qrcodes") {
                setQrSubView("myqr");
              }
            }}
          />
        )}
      </div>

      {/* Tab Content - Extra padding for sticky CTA */}
      <div 
        key={subTab} 
        className={`animate-fade-in ${subTab === "breakdown" || subTab === "expenses" ? "pb-24" : "pb-8"}`}
      >
        {/* Breakdown Tab */}
        {subTab === "breakdown" && (
          <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-4 sm:space-y-6">
            {/* Total Trip Spend - Summary card on mobile only */}
            {isMobile && (
              <StatCard
                title="Total Trip Spend"
                value={`${summaryDisplayCurrency} ${formatTwoDecimalAmount(totalCost)}`}
                icon={DollarSign}
                color="blue"
                description="All group expenses"
                onClick={handleTotalSpendTap}
                variant="summary"
              />
            )}
            
            {/* Category Breakdown - Sorted by amount (highest first) */}
            <div ref={categoryBreakdownRef}>
              <Card className="p-3 sm:p-4 border-border/50">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Spending by Category</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3 sm:mb-4">
                  Shows how total trip expenses are distributed across different categories.
                </p>
                <div className="space-y-2 sm:space-y-3">
                  {[...categoryBreakdown].sort((a, b) => b.amount - a.amount).map((item, index) => (
                    <div key={item.category} className="space-y-1 sm:space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                        <span className="text-foreground truncate flex items-center gap-1.5">
                          <span>{item.emoji}</span>
                          {item.category}
                        </span>
                        <span className="text-foreground shrink-0">
                          {`${summaryDisplayCurrency} ${formatTwoDecimalAmount(item.amount)}`} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-700 ease-out`}
                          style={{ 
                            width: `${item.percentage}%`,
                            animation: `growWidth 0.7s ease-out ${200 + index * 100}ms both`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {debugEnabled && (debts?.length ?? 0) > 0 && (
              <Card className="p-3 sm:p-4 border-border/50">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Who Owes Who (DB)</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Raw function output for this trip.</p>
                <div className="space-y-2">
                  {(debts || []).map((d: any, idx: number) => {
                    const debtorName = d.debtor_name || members.find(m => m.id === (d.debtor_id || d.from_user_id))?.name || 'Unknown';
                    const creditorName = d.creditor_name || members.find(m => m.id === (d.creditor_id || d.to_user_id))?.name || 'Unknown';
                    const amount = Number(d.amount || 0);
                    return (
                      <div key={`debt-${idx}`} className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-foreground truncate">
                          {debtorName} → {creditorName}
                        </span>
                        <span className="text-foreground shrink-0">
                          {`${summaryDisplayCurrency} ${formatTwoDecimalAmount(amount)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Paid on Behalf of the Group */}
            <Card className="p-3 sm:p-4 border-border/50">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                Paid on Behalf of the Group
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Shows how much each member has paid upfront for shared expenses.
              </p>
              
              {/* Total Group Expense */}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Total group expense</span>
                <span className="text-xs sm:text-sm text-foreground font-medium">
                  {`${summaryDisplayCurrency} ${formatTwoDecimalAmount(totalCost)}`}
                </span>
              </div>
              
              {/* Average per person */}
              <div className="flex items-center justify-between py-1.5 border-b border-border/30 mb-3">
                <span className="text-xs text-muted-foreground">Average per person</span>
                <span className="text-xs sm:text-sm text-foreground font-medium">
                  {`${summaryDisplayCurrency} ${formatTwoDecimalAmount(totalCost / members.length)}`}
                </span>
              </div>
              
              {/* Member contributions - horizontal layout using real data */}
              <div className="space-y-2">
                {memberContributions.length > 0 ? (
                  memberContributions.map((member, index) => {
                    const memberColor = getMemberColor(member.name, member.colorIndex);
                    return (
                      <div key={member.name} className="space-y-1 sm:space-y-1.5 group cursor-default">
                        {/* Top row: Avatar + Name on left, Amount + % on right */}
                        <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                          <span className="text-foreground truncate flex items-center gap-1.5 sm:gap-2">
                            <Avatar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0">
                              <AvatarImage src={member.imageUrl} alt={member.name} />
                              <AvatarFallback className="text-[10px] sm:text-xs bg-secondary text-muted-foreground">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            {member.name}
                          </span>
                          <span className="text-foreground shrink-0">
                            {`${summaryDisplayCurrency} ${formatTwoDecimalAmount(member.amount)}`} <span className="text-muted-foreground">({member.percentage}%)</span>
                          </span>
                        </div>
                        
                        {/* Full-width colorful progress bar */}
                        <div className="h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${memberColor.bg} rounded-full transition-all duration-300 ease-out group-hover:brightness-110`}
                            style={{ 
                              width: `${member.percentage}%`,
                              animation: `growWidth 0.7s ease-out ${400 + index * 100}ms both`,
                              boxShadow: `0 2px 8px hsl(var(${memberColor.cssVar}) / 0.35)`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No payments recorded yet
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Expenses Tab */}
        {subTab === "expenses" && (
          <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
            {/* Mobile: Filter Trigger Button */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-9 px-3 text-xs rounded-lg bg-secondary border-0"
                  onClick={() => setFilterDrawerOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                  Filter & Sort
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
                
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground"
                    onClick={handleClearAllFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}

            {/* Tablet/Desktop: Inline Dropdown Filters */}
            {!isMobile && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-4 gap-2">
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "latest" | "oldest")}>
                    <SelectTrigger className="w-full h-9 text-sm rounded-lg bg-secondary border-0">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPayer} onValueChange={setFilterPayer}>
                    <SelectTrigger className="w-full h-9 text-sm rounded-lg bg-secondary border-0">
                      <SelectValue placeholder="Paid by">{filterPayer === "all" ? "Paid by" : filterPayer}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Paid by</SelectItem>
                      {uniquePayers.map((payer) => (
                        <SelectItem key={payer} value={payer}>{payer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full h-9 text-sm rounded-lg bg-secondary border-0">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Food & Drinks">Food & Drinks</SelectItem>
                      <SelectItem value="Accommodation">Accommodation</SelectItem>
                      <SelectItem value="Activities">Activities</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "awaiting" | "settled" | "pending")}>
                    <SelectTrigger className="w-full h-9 text-sm rounded-lg bg-secondary border-0">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="awaiting">Awaiting Confirmation</SelectItem>
                      <SelectItem value="pending">Pending Payment</SelectItem>
                      <SelectItem value="settled">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-sm text-muted-foreground"
                      onClick={handleClearAllFilters}
                    >
                      Clear ({activeFilterCount})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Expense Cards */}
            <div className="space-y-2 sm:space-y-3">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense, index) => {
                  // Prepare both original and home amounts/splits for per-card toggle
                  const originalAmount = expense.amount;
                  const originalCurrency = expense.originalCurrency || expense.homeCurrency || 'MYR';
                  const homeAmount = expense.convertedAmountHome 
                    ? parseFloat(expense.convertedAmountHome.toString())
                    : expense.amount;
                  const homeCurrency = expense.homeCurrency || 'MYR';

                  const originalCustomSplits = expense.customSplitAmounts;
                  let homeCustomSplits = expense.customSplitAmounts;
                  if (expense.convertedAmountHome && expense.customSplitAmounts && expense.amount > 0) {
                    const conversionRatio = parseFloat(expense.convertedAmountHome.toString()) / expense.amount;
                    homeCustomSplits = expense.customSplitAmounts.map(split => ({
                      memberId: split.memberId,
                      amount: split.amount * conversionRatio
                    }));
                  }

                  // Maintain legacy display values based on global viewCurrency for initial render
                  const displayAmount = viewCurrency === 'original' ? originalAmount : homeAmount;
                  const displayCurrency = viewCurrency === 'original' ? originalCurrency : homeCurrency;
                  const convertedCustomSplits = viewCurrency === 'original' ? originalCustomSplits : homeCustomSplits;
                  const canManageExpense = !!currentUserId && expense.createdBy === currentUserId;
                  
                  return (
                    <ExpenseCard
                      key={expense.id}
                      id={expense.id}
                      title={expense.title}
                      amount={displayAmount}
                      currency={displayCurrency}
                      paidBy={expense.paidBy}
                      date={expense.date}
                      category={expense.category}
                      paymentProgress={expense.paymentProgress}
                      currentUser={currentUserId}
                      currentUserId={currentUserId || ""}
                      splitWith={expense.splitWith}
                      splitType={expense.splitType}
                      customSplitAmounts={convertedCustomSplits}
                      // Per-card currency toggle props
                      originalAmount={originalAmount}
                      originalCurrency={originalCurrency}
                      homeAmount={homeAmount}
                      homeCurrency={homeCurrency}
                      originalCustomSplitAmounts={originalCustomSplits}
                      homeCustomSplitAmounts={homeCustomSplits}
                      initialViewCurrency={viewCurrency}
                      payments={expense.payments}
                      onCardClick={() => handleCardClick(expense)}
                      onPrimaryAction={() => handlePrimaryAction(expense)}
                      onEdit={() => openEditExpense(expense)}
                      onDelete={() => openDeleteExpense(expense)}
                      canManage={canManageExpense}
                      isHighlighted={recentlySettledIds.includes(expense.id)}
                      animationDelay={200 + index * 100}
                    />
                  );
                })
              ) : (
                <Card className="p-6 text-center border-border/50">
                  <p className="text-sm text-muted-foreground">No expenses yet. Add your first expense and it will show up here</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Settle Tab */}
        {subTab === "settle" && (
          <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-4">
            {/* Header */}
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-foreground">Settlement Summary</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Net balances between group members for this trip
              </p>
            </div>

            {/* Filter Controls - Full-Width 2-Column Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Direction Filter Dropdown */}
              <Select 
                value={directionFilter} 
                onValueChange={(value: "all" | "owesMe" | "iOwe") => setDirectionFilter(value)}
              >
                <SelectTrigger className="w-full h-9 text-xs rounded-full bg-secondary border-0 px-4">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="owesMe">Owes Me</SelectItem>
                  <SelectItem value="iOwe">I Owe</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter Dropdown */}
              <Select 
                value={statusFilter} 
                onValueChange={(value: "all" | "pending" | "settled") => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full h-9 text-xs rounded-full bg-secondary border-0 px-4">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Settlements */}
            <div className="space-y-2 sm:space-y-3">
                {filteredSettlements.length > 0 ? (
                  filteredSettlements.map((settlement) => (
                    <SettlementCard
                      key={settlement.id}
                      fromUser={settlement.fromUser}
                      toUser={settlement.toUser}
                      amount={settlement.amount}
                      status={settlement.status}
                      currentUserId={currentUserId}
                      receiptAvailable={!!settlement.receiptUrl}
                      formatAmount={formatTwoDecimalAmount}
                      currency={summaryDisplayCurrency}
                      showReminder={canShowReminder(settlement)}
                      onCardClick={() => settlement.status === "awaiting" ? handleViewSettlementReceipt(settlement) : handleSettlementCardClick(settlement)}
                      onViewPayment={() => handleViewQR(settlement)}
                      onViewDetails={() => handleSettlementCardClick(settlement)}
                      onViewReceipt={() => handleViewSettlementReceipt(settlement)}
                      onSendReminder={() => handleSendReminder(settlement)}
                      onMarkPaid={() => handleMarkPaid(settlement)}
                      onUploadReceipt={() => handleUploadReceipt(settlement)}
                    />
                  ))
                ) : (
                  <Card className="p-6 text-center border-border/50">
                    {expenses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No expenses yet. Add expenses to see settlements here</p>
                    ) : (
                      <p className="text-sm font-semibold text-green-600">All settled!</p>
                    )}
                  </Card>
                )}
            </div>
          </div>
        )}

        {/* QR Codes Tab */}
        {subTab === "qrcodes" && (
          <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-4">
            {/* Sub-toggle: My QR / Others */}
            <SegmentedControl
              options={[
                { label: "My QR", value: "myqr" },
                { label: "Others", value: "others" },
              ]}
              value={qrSubView}
              onChange={(value) => setQrSubView(value as "myqr" | "others")}
              className="max-w-xs mx-auto"
            />
            
            {/* My QR View */}
            {qrSubView === "myqr" && (
              <YourQRSection
                qrCodeUrl={userQRUrl}
                onUpload={handleUploadUserQR}
                onRemove={handleRemoveUserQR}
              />
            )}
            
            {/* Others View */}
            {qrSubView === "others" && (
              <div className="space-y-3">
                {/* Description */}
                <p className="text-sm text-muted-foreground text-center">
                  View group members' QR codes to make payments
                </p>
                
                {/* Member Cards - Only show members with QR */}
                {membersWithQR.length > 0 ? (
                  membersWithQR.map((member) => (
                    <Card key={member.id} className="p-3 border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.imageUrl} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.paymentMethodName || 'Payment QR'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-lg"
                          onClick={() => handleViewMemberQR({
                            id: member.id,
                            name: member.name,
                            role: "member",
                            descriptor: member.description || "",
                            imageUrl: undefined,
                            qrCodeUrl: member.qrCodeUrl
                          })}
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1.5" />
                          View QR
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  // Empty state
                  <Card className="p-6 text-center border-border/50">
                    <QrCode className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No QR codes available yet.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ask your group to upload theirs for faster settlement.
                    </p>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Container - Only on Breakdown and Expenses tabs */}
      {canAddExpenses && (subTab === "breakdown" || subTab === "expenses") && (
        <div className="fixed bottom-above-nav lg:bottom-0 left-0 lg:left-60 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/50">
          <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3 lg:py-4">
            <Button 
              className="w-full h-12 rounded-xl text-sm font-medium shadow-lg"
              onClick={() => setAddExpenseOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Shared Expense
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      <AddExpenseModal
        open={addExpenseOpen}
        onOpenChange={(open) => {
          setAddExpenseOpen(open);
          if (!open) setEditingExpense(null);
        }}
        onAddExpense={handleAddExpense}
        onEditExpense={handleEditExpense}
        editingExpense={editingExpense}
        currentUser={currentUserName}
        members={members}
        allowedCurrencies={tripTravelCurrencies}
      />

      {/* Delete Expense Dialog */}
      <DeleteExpenseDialog
        open={deleteExpenseOpen}
        onOpenChange={setDeleteExpenseOpen}
        expenseTitle={deletingExpense?.title || ""}
        expenseAmount={deletingExpense?.amount || 0}
        onConfirm={handleDeleteExpense}
      />

      {/* View QR Modal */}
      <ViewQRModal
        open={viewQROpen}
        onOpenChange={(open) => {
          setViewQROpen(open);
          if (!open) {
            setSelectedMemberForQR(null);
            setSelectedSettlement(null);
          }
        }}
        recipientName={selectedMemberForQR?.name || selectedSettlement?.toUser.name || ""}
        amount={selectedSettlement?.amount}
        qrCodeUrl={
          selectedMemberForQR?.qrCodeUrl ||
          selectedSettlement?.toUser.qrCodeUrl ||
          paymentMethods.find(pm => pm.user_id === selectedSettlement?.toUser.id)?.qr_code_url ||
          (selectedSettlement?.toUser.id === currentUserId ? userQRUrl : undefined)
        }
      />

      {/* Send Reminder Modal */}
      <SendReminderModal
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        recipientName={selectedSettlement?.fromUser.name || ""}
        amount={selectedSettlement?.amount || 0}
        tripName={tripName}
        onSend={handleReminderSend}
      />

      {/* Receipt Viewer Modal */}
      <ReceiptViewerModal
        open={receiptViewerOpen}
        onOpenChange={(open) => {
          setReceiptViewerOpen(open);
          if (!open) setViewingReceipt(null);
        }}
        expenseTitle={viewingReceipt?.title || ""}
        receiptUrl={viewingReceipt?.url}
      />

      {/* Expense Details Modal */}
      <ExpenseDetailsModal
        open={detailsModalOpen}
        onOpenChange={(open) => {
          setDetailsModalOpen(open);
          if (!open) setViewingExpenseDetails(null);
        }}
        expense={viewingExpenseDetails}
        currentUser={currentUserName}
        initialTab={initialModalTab}
        viewCurrency={viewCurrency}
        pairNetAmount={(() => {
          if (!viewingExpenseDetails || !currentUserId) return undefined;
          const payerId = viewingExpenseDetails.payer?.id;
          if (!payerId) return undefined;
          const s = settlements.find(
            (x) => x.fromUser.id === currentUserId && x.toUser.id === payerId
          );
          return s ? s.amount : undefined;
        })()}
        onMarkAsReceived={handleMarkAsReceived}
        onUploadProof={handleUploadProof}
        onUpdateProgress={(newProgress) => {
          if (viewingExpenseDetails) {
            handleUpdateProgress(viewingExpenseDetails.id, newProgress);
          }
        }}
        onConfirmPaymentReceived={handleConfirmPaymentSettled}
        onSubmitPayment={handleSubmitPayment}
        members={members}
      />

      {/* Settlement Breakdown Modal */}
      {selectedSettlementForBreakdown && (() => {
        const breakdown = getContributingExpenses(selectedSettlementForBreakdown);
        return (
          <SettlementBreakdownModal
            open={breakdownModalOpen}
            onOpenChange={(open) => {
              setBreakdownModalOpen(open);
              if (!open) setSelectedSettlementForBreakdown(null);
            }}
            fromUser={selectedSettlementForBreakdown.fromUser}
            toUser={selectedSettlementForBreakdown.toUser}
            totalAmount={selectedSettlementForBreakdown.amount}
            status={selectedSettlementForBreakdown.status === "awaiting" ? "pending" : selectedSettlementForBreakdown.status}
            contributingExpenses={breakdown.owedToReceiver}
            reverseExpenses={breakdown.owedToDebtor}
            grossOwed={breakdown.grossOwed}
            grossOffset={breakdown.grossOffset}
            currentUserId={currentUserId || "1"}
            onUploadProof={() => {
              handleMarkPaid(selectedSettlementForBreakdown);
              setBreakdownModalOpen(false);
            }}
            onMarkAllPaid={handleMarkAllPaidFromBreakdown}
            onSendReminder={() => {
              handleSendReminder(selectedSettlementForBreakdown);
              setBreakdownModalOpen(false);
            }}
            onViewQR={() => {
              handleViewQR(selectedSettlementForBreakdown);
              setBreakdownModalOpen(false);
            }}
            onViewReceipts={handleViewSettlementReceipts}
          />
        );
      })()}

      {/* Settlement Receipts Modal */}
      {selectedSettlementForBreakdown && (
        <SettlementReceiptsModal
          open={receiptsModalOpen}
          onOpenChange={(open) => {
            setReceiptsModalOpen(open);
            if (!open) setSelectedSettlementForBreakdown(null);
          }}
          fromUser={selectedSettlementForBreakdown.fromUser}
          toUser={selectedSettlementForBreakdown.toUser}
          totalAmount={selectedSettlementForBreakdown.amount}
          receipts={getReceiptsForSettlement(selectedSettlementForBreakdown)}
          onMarkAllPaid={() => {
            setSettlementToConfirm(selectedSettlementForBreakdown);
            setReceiptsModalOpen(false);
            setSettlementConfirmModalOpen(true);
          }}
        />
      )}

      {/* Unified Settlement Confirmation Modal */}
      {settlementToConfirm && (() => {
        const breakdown = getContributingExpenses(settlementToConfirm);
        return (
          <SettlementConfirmModal
            open={settlementConfirmModalOpen}
            onOpenChange={(open) => {
              setSettlementConfirmModalOpen(open);
              if (!open) setSettlementToConfirm(null);
            }}
            fromUser={settlementToConfirm.fromUser}
            toUser={settlementToConfirm.toUser}
            netAmount={settlementToConfirm.amount}
            owedToReceiver={breakdown.owedToReceiver.map(e => ({ title: e.title, amount: e.shareAmount }))}
            owedToDebtor={breakdown.owedToDebtor.map(e => ({ title: e.title, amount: e.shareAmount }))}
            grossOwed={breakdown.grossOwed}
            grossOffset={breakdown.grossOffset}
            receiptUrl={settlementToConfirm.receiptUrl}
            onViewReceipt={() => {
              setViewingReceipt({ 
                title: "Payment Receipt", 
                url: settlementToConfirm.receiptUrl 
              });
              setReceiptViewerOpen(true);
            }}
            onConfirm={handleConfirmSettlement}
          />
        );
      })()}

      {/* Filter & Sort Drawer - Mobile Only */}
      {isMobile && (
        <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <DrawerContent className="h-[85vh] max-h-[85vh] flex flex-col">
            <DrawerHeader className="text-left shrink-0">
              <DrawerTitle>Filter & Sort Expenses</DrawerTitle>
              <DrawerDescription>
                {activeFilterCount > 0 
                  ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` 
                  : 'Customize your expense view'}
              </DrawerDescription>
            </DrawerHeader>
            
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4">
              <div className="space-y-6 pb-6">
                {/* Sort Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Sort Order</h4>
                  <RadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as "latest" | "oldest")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="latest" id="latest" />
                      <Label htmlFor="latest">Latest first</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="oldest" id="oldest" />
                      <Label htmlFor="oldest">Oldest first</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Separator />
                
                {/* Member Filter Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Paid By</h4>
                  <RadioGroup value={filterPayer} onValueChange={setFilterPayer}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-members" />
                      <Label htmlFor="all-members">All members</Label>
                    </div>
                    {uniquePayers.map((payer) => (
                      <div key={payer} className="flex items-center space-x-2">
                        <RadioGroupItem value={payer} id={`payer-${payer}`} />
                        <Label htmlFor={`payer-${payer}`}>{payer}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <Separator />
                
                {/* Category Filter Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Category</h4>
                  <RadioGroup value={filterCategory} onValueChange={setFilterCategory}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-categories" />
                      <Label htmlFor="all-categories">All Categories</Label>
                    </div>
                    {["Transport", "Food & Drinks", "Accommodation", "Activities"].map((cat) => (
                      <div key={cat} className="flex items-center space-x-2">
                        <RadioGroupItem value={cat} id={`cat-${cat}`} />
                        <Label htmlFor={`cat-${cat}`}>{cat}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <Separator />
                
                {/* Status Filter Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Status</h4>
                  <RadioGroup value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "awaiting" | "settled" | "pending")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all-status" />
                      <Label htmlFor="all-status">All Status</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="awaiting" id="awaiting" />
                      <Label htmlFor="awaiting">Awaiting Confirmation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pending" id="pending" />
                      <Label htmlFor="pending">Pending Payment</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="settled" id="settled" />
                      <Label htmlFor="settled">Settled</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
            
            <DrawerFooter className="border-t shrink-0">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClearAllFilters}
                >
                  Clear All
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => setFilterDrawerOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
      {/* Currency Settings Sheet */}
      <ExpenseSettingsSheet
        open={settingsSheetOpen}
        onOpenChange={setSettingsSheetOpen}
        tripTravelCurrencies={tripTravelCurrencies}
        onTravelCurrenciesChange={async (currs) => {
          setTripTravelCurrencies(currs);
          writeCachedTripCurrencies(tripId, currs);
          try {
            await updateTripCurrencySettings(tripId, { travel_currencies: currs });
          } catch (e) {
            console.error('Failed to save trip currency settings', e);
          }
        }}
      />
    </div>
  );
}
