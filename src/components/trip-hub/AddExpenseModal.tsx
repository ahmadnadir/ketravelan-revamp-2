/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Upload, Receipt, Users, UserCheck, Pencil, Info, Calendar as CalendarIcon, Wallet, Check, Plus } from "lucide-react";
import { ExpenseCategory, getExpenseCategoryCode } from "@/lib/expenseCategories";
import { 
  CurrencyCode, 
  travelCurrencies, 
  convertToHomeCurrencyLive, 
  formatCurrencySpaced,
  getCurrencySymbol
} from "@/lib/currencyUtils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ExpensePayment } from "@/data/mockData";
import { cn } from "@/lib/utils";

// Using expenseCategories from lib for consistency

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateInput = (): string => toDateInputValue(new Date());

const parseDateToInput = (dateValue?: string): string => {
  if (!dateValue) return getTodayDateInput();

  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
  if (isoMatch) return dateValue;

  const normalizedDateValue = dateValue.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(normalizedDateValue);
  if (Number.isNaN(parsed.getTime())) return getTodayDateInput();
  return toDateInputValue(parsed);
};

const dateInputToDate = (dateInput: string): Date => {
  const [year, month, day] = dateInput.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getOrdinalSuffix = (day: number): string => {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const formatDateForDisplay = (dateInput: string): string => {
  if (!dateInput) {
    const now = new Date();
    const month = now.toLocaleDateString("en-US", { month: "long" });
    const day = now.getDate();
    return `${month} ${day}${getOrdinalSuffix(day)}, ${now.getFullYear()}`;
  }

  const [year, month, day] = dateInput.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  const dayNumber = String(parsed.getDate()).padStart(2, "0");
  const monthNumber = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${dayNumber}/${monthNumber}/${parsed.getFullYear()}`;
};

const formatDateForPayload = (dateInput: string): string => {
  if (!dateInput) return getTodayDateInput();
  return /^\d{4}-\d{2}-\d{2}$/.test(dateInput) ? dateInput : getTodayDateInput();
};

const sanitizeAmountInput = (value: string): string => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [integerPart = "", decimalPart] = cleaned.split(".");
  if (decimalPart === undefined) return integerPart;
  return `${integerPart}.${decimalPart.replace(/\./g, "")}`;
};

const parseAmountInput = (value: string): number => {
  const numeric = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatAmountInput = (value: string): string => {
  const numeric = parseAmountInput(value);
  if (numeric <= 0) return "";
  return numeric.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatAmountDisplay = (value: number): string => {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface CustomSplitAmount {
  memberId: string;
  amount: number;
}

export interface NewExpense {
  title: string;
  amount: number;
  category: string;
  category_code?: string;
  paidBy: string;
  splitType: "equal" | "custom";
  splitWith: string[];
  customSplitAmounts?: CustomSplitAmount[];
  notes?: string;
  receiptFile?: File;
  existingReceiptUrl?: string; // Preserve existing receipt when editing
  date: string;
  // Multi-currency fields
  originalCurrency: CurrencyCode;
  fxRateToHome?: number;
  convertedAmountHome?: number;
  homeCurrency?: CurrencyCode;
}

export interface ExpenseData {
  id: string;
  createdAt?: string;
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  hasReceipt?: boolean;
  receipt_url?: string;
  paymentProgress?: number;
  category?: string;
  category_code?: string;
  splitType?: "equal" | "custom";
  splitWith?: string[];
  customSplitAmounts?: CustomSplitAmount[];
  notes?: string;
  payments?: ExpensePayment[];
  // Multi-currency fields
  originalCurrency?: CurrencyCode;
  fxRateToHome?: number;
  convertedAmountHome?: number;
  homeCurrency?: CurrencyCode;
}

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: (expense: NewExpense) => void;
  onEditExpense?: (id: string, expense: NewExpense) => void;
  editingExpense?: ExpenseData | null;
  currentUser?: string;
  members: Array<{ id: string; name: string; imageUrl?: string; avatar?: string }>;
  homeCurrency?: CurrencyCode;
  allowedCurrencies?: CurrencyCode[];
  expenseCategories: ExpenseCategory[];
  expenseCategoriesLoading?: boolean;
}

export function AddExpenseModal({
  open,
  onOpenChange,
  onAddExpense,
  onEditExpense,
  editingExpense,
  currentUser = "User",
  members,
  homeCurrency: tripHomeCurrency,
  allowedCurrencies,
  expenseCategories,
  expenseCategoriesLoading = false,
}: AddExpenseModalProps) {
  const { homeCurrency: authHomeCurrency } = useAuth();
  const homeCurrency: CurrencyCode = tripHomeCurrency || authHomeCurrency || "MYR";
  
  // Build available currencies: home currency + allowed travel currencies
  const availableCurrencies = useMemo(() => {
    const homeCurrencyInfo = {
      code: homeCurrency,
      symbol: homeCurrency === "MYR" ? "RM" : homeCurrency,
      name: "Home Currency",
    };
    const filteredTravelCurrencies = Array.isArray(allowedCurrencies)
      ? travelCurrencies.filter(c => allowedCurrencies.includes(c.code))
      : travelCurrencies;
    return [homeCurrencyInfo, ...filteredTravelCurrencies.filter(c => c.code !== homeCurrency)];
  }, [allowedCurrencies, homeCurrency]);
  
  // Helper: find member ID by name
  const getMemberIdByName = useCallback((name: string) => {
    return members.find((m) => m.name === name)?.id || members[0]?.id || "";
  }, [members]);

  // Helper: find member name by ID
  const getMemberNameById = useCallback((id: string) => {
    return members.find((m) => m.id === id)?.name || "Unknown";
  }, [members]);

  const getLastUsedCurrency = useCallback((): CurrencyCode => {
    try {
      const saved = localStorage.getItem("lastUsedExpenseCurrency");
      if (saved && availableCurrencies.some(c => c.code === saved)) {
        return saved as CurrencyCode;
      }
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }
    return homeCurrency;
  }, [availableCurrencies, homeCurrency]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayDateInput());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>(getLastUsedCurrency());
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState(getMemberIdByName(currentUser));
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [splitWith, setSplitWith] = useState<string[]>(
    members.map((m) => m.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [showNotesAndReceipts, setShowNotesAndReceipts] = useState(false);
  
  // Member helper memos
  const currentMember = useMemo(() => {
    return members.find((m) => m.name === currentUser || m.id === currentUser) || members[0];
  }, [members, currentUser]);

  const currentUserId = currentMember?.id || "";

  const otherMembers = useMemo(() => {
    return members.filter((m) => m.id !== currentUserId);
  }, [members, currentUserId]);
  
  // State for live conversion
  const [conversion, setConversion] = useState<{ amount: number; rate: number; available: boolean }>({ 
    amount: 0, 
    rate: 1, 
    available: false 
  });
  const [isLoadingConversion, setIsLoadingConversion] = useState(false);

  const isEditMode = !!editingExpense;
  
  // Compute conversion with live rates
  const numericAmount = parseAmountInput(amount);
  const showConversion = currency !== homeCurrency && numericAmount > 0;
  
  // Fetch live conversion when amount or currency changes
  useEffect(() => {
    if (showConversion && numericAmount > 0) {
      setIsLoadingConversion(true);
      convertToHomeCurrencyLive(numericAmount, currency, homeCurrency)
        .then(result => {
          setConversion(result);
        })
        .catch(() => {
          setConversion({ amount: 0, rate: 1, available: false });
        })
        .finally(() => {
          setIsLoadingConversion(false);
        });
    } else {
      setConversion({ amount: numericAmount, rate: 1, available: true });
    }
  }, [numericAmount, currency, homeCurrency, showConversion]);

  const resetForm = useCallback(() => {
    setTitle("");
    setAmount("");
    setExpenseDate(getTodayDateInput());
    setCurrency(getLastUsedCurrency());
    setCategory("");
    setPaidBy(getMemberIdByName(currentUser));
    setSplitType("equal");
    setSplitWith(members.map((m) => m.id));
    setCustomAmounts({});
    setNotes("");
    setReceiptFile(null);
    setReceiptPreview(null);
    setShowNotesAndReceipts(false);
  }, [currentUser, members, getMemberIdByName, getLastUsedCurrency]);

  // Load editing expense data
  useEffect(() => {
    if (editingExpense && open) {
      setTitle(editingExpense.title);
      setAmount(formatAmountInput(editingExpense.amount.toString()));
      setExpenseDate(parseDateToInput(editingExpense.date));
      setCurrency(editingExpense.originalCurrency || "USD");
      setCategory(editingExpense.category_code || getExpenseCategoryCode(editingExpense.category) || "other");
      setPaidBy(getMemberIdByName(editingExpense.paidBy));
      setSplitType(editingExpense.splitType || "equal");
      setSplitWith(editingExpense.splitWith || members.map((m) => m.id));
      setNotes(editingExpense.notes || "");
      
      // Load existing receipt if available
      if (editingExpense.receipt_url) {
        setReceiptPreview(editingExpense.receipt_url);
      }

      if (editingExpense.notes || editingExpense.receipt_url) {
        setShowNotesAndReceipts(true);
      }
      
      // Load custom amounts if available
      if (editingExpense.customSplitAmounts) {
        const amounts: Record<string, string> = {};
        editingExpense.customSplitAmounts.forEach((item) => {
          amounts[item.memberId] = item.amount.toString();
        });
        setCustomAmounts(amounts);
      }
    } else if (!open) {
      resetForm();
    }
  }, [editingExpense, open, members, resetForm, getMemberIdByName]);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCurrencyChange = (val: string) => {
    setCurrency(val as CurrencyCode);
    try {
      localStorage.setItem("lastUsedExpenseCurrency", val);
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const toggleMemberSplit = (memberId: string) => {
    setSplitWith((prev) => {
      const newSplitWith = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      
      // Clear custom amount when member is deselected
      if (!newSplitWith.includes(memberId)) {
        setCustomAmounts((prev) => {
          const updated = { ...prev };
          delete updated[memberId];
          return updated;
        });
      }
      
      return newSplitWith;
    });
  };

  const handleSelectAll = () => {
    setSplitWith(members.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSplitWith([]);
    setCustomAmounts({});
  };

  const handleCustomAmountChange = (memberId: string, value: string) => {
    setCustomAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  // Seed custom amounts from the current equal split when entering custom mode
  const handleSplitTypeChange = (nextType: "equal" | "custom") => {
    if (nextType === "custom" && splitType !== "custom" && splitWith.length > 0 && totalAmount > 0) {
      const equalShare = totalAmount / splitWith.length;
      setCustomAmounts((prev) => {
        const next = { ...prev };
        splitWith.forEach((memberId) => {
          next[memberId] = equalShare.toFixed(2);
        });
        return next;
      });
    }
    setSplitType(nextType);
  };

  const handleSubmit = () => {
    if (!title.trim() || !amount || !category) return;

    const customSplitAmounts: CustomSplitAmount[] = splitType === "custom" 
      ? splitWith.map((memberId) => ({
          memberId,
          amount: parseFloat(customAmounts[memberId] || "0"),
        }))
      : [];

    const expense: NewExpense = {
      title: title.trim(),
      amount: parseAmountInput(amount),
      category,
      category_code: category,
      paidBy: getMemberNameById(paidBy),
      splitType,
      splitWith,
      customSplitAmounts: splitType === "custom" ? customSplitAmounts : undefined,
      notes: notes.trim() || undefined,
      receiptFile: receiptFile || undefined,
      // Preserve existing receipt URL when editing and no new file uploaded
      existingReceiptUrl: (isEditMode && !receiptFile && receiptPreview) ? receiptPreview : undefined,
      date: formatDateForPayload(expenseDate),
      // Multi-currency fields
      originalCurrency: currency,
      fxRateToHome: conversion.available ? conversion.rate : undefined,
      convertedAmountHome: conversion.available ? conversion.amount : undefined,
      homeCurrency: homeCurrency,
    };

    if (isEditMode && onEditExpense && editingExpense) {
      onEditExpense(editingExpense.id, expense);
    } else {
      onAddExpense(expense);
    }
    
    resetForm();
    onOpenChange(false);
  };

  // Calculate totals for validation
  const totalCustomAmount = splitWith.reduce((sum, memberId) => {
    return sum + (parseFloat(customAmounts[memberId] || "0") || 0);
  }, 0);
  
  const totalAmount = parseAmountInput(amount);
  const customAmountDifference = totalAmount - totalCustomAmount;
  const customSplitProgress = totalAmount > 0
    ? Math.min((totalCustomAmount / totalAmount) * 100, 100)
    : 0;

  const allSelected = members.length > 0 && splitWith.length === members.length;
  const noneSelected = splitWith.length === 0;

  const settlementSummary = useMemo(() => {
    if (splitWith.length === 0 || totalAmount <= 0) {
      return { text: "Nothing to settle yet", colorClass: "text-muted-foreground" };
    }

    const userIsPayer = paidBy === currentUserId;
    const userInSplit = splitWith.includes(currentUserId);
    const payerName = getMemberNameById(paidBy);

    let userShare = 0;
    if (userInSplit) {
      if (splitType === "custom") {
        userShare = parseAmountInput(customAmounts[currentUserId] || "0");
      } else {
        userShare = totalAmount / splitWith.length;
      }
    }

    if (userIsPayer) {
      const getBack = totalAmount - userShare;
      if (getBack > 0) {
        const getBackHome = currency !== homeCurrency && conversion.available
          ? getBack * conversion.rate
          : getBack;
        return {
          text: `You get back ${formatCurrencySpaced(getBackHome, homeCurrency)}`,
          colorClass: "text-emerald-600 dark:text-emerald-400 font-semibold"
        };
      }
      return {
        text: "You paid for yourself",
        colorClass: "text-muted-foreground"
      };
    }

    if (userInSplit) {
      return {
        text: `You owe ${payerName} ${getCurrencySymbol(currency)} ${formatAmountDisplay(userShare)}`,
        colorClass: "text-rose-600 dark:text-rose-400 font-semibold"
      };
    }

    return {
      text: "You're not part of this split",
      colorClass: "text-muted-foreground"
    };
  }, [totalAmount, splitWith, paidBy, currentUserId, splitType, customAmounts, currency, homeCurrency, conversion, getMemberNameById]);

  const isValid = 
    title.trim() && 
    totalAmount > 0 && 
    category && 
    splitWith.length > 0 &&
    (splitType === "equal" || Math.abs(customAmountDifference) < 0.01);

  const perPersonAmount =
    splitWith.length > 0 && totalAmount > 0 && splitType === "equal"
      ? formatAmountDisplay(totalAmount / splitWith.length)
      : "0.00";

  // Shared overrides so no field shows a dark/animated focus ring, border, or shadow
  const fieldFocusReset =
    "outline-none ring-0 ring-offset-0 shadow-none transition-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:border-border focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none focus-visible:border-border [-webkit-tap-highlight-color:transparent]";
  const buttonFocusReset =
    "outline-none ring-0 ring-offset-0 shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [-webkit-tap-highlight-color:transparent]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-[560px] h-[92vh] sm:h-auto sm:max-h-[92vh] w-[calc(100%-1rem)] sm:w-full rounded-[28px] p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none border-b border-border/60 px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              {isEditMode ? (
                <>
                  <Pencil className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  Edit shared expense
                </>
              ) : (
                <>
                  <Receipt className="h-5 w-5 text-foreground" strokeWidth={1.75} />
                  Add shared expense
                </>
              )}
            </DialogTitle>
            <button 
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [-webkit-tap-highlight-color:transparent]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-5 py-3 space-y-2.5 sm:px-6">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title" className="text-xs font-medium text-foreground">Expense title *</Label>
            <Input
              id="title"
              placeholder="e.g., Group dinner, Ferry tickets"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className={cn("h-10 rounded-xl text-sm", fieldFocusReset)}
            />
          </div>

          {/* Amount with Currency */}
          {availableCurrencies.length > 1 ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs font-medium text-foreground">Amount *</Label>
                <div className="relative flex h-10 items-center rounded-xl border border-border bg-background px-3">
                  <span className="pointer-events-none mr-2 shrink-0 border-r border-border pr-2 text-sm font-semibold text-muted-foreground">
                    {getCurrencySymbol(currency)}
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                    onFocus={() => setAmount((prev) => prev.replace(/,/g, ""))}
                    onBlur={() => setAmount((prev) => formatAmountInput(prev) || prev)}
                    className={cn("h-full border-0 p-0 text-base font-semibold tabular-nums", fieldFocusReset)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="currency-select" className="text-xs font-medium text-foreground">Currency</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger id="currency-select" className={cn("h-10 rounded-xl text-sm", fieldFocusReset)}>
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold">{getCurrencySymbol(currency)}</span>
                      <span>{currency}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableCurrencies.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="rounded-lg text-xs">
                        <span className="flex items-center justify-between gap-2 w-full">
                          <span>{c.symbol} {c.code}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">
                            {c.code === homeCurrency ? "home" : "travel"}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs font-medium text-foreground">Amount *</Label>
              <div className="relative flex h-10 items-center rounded-xl border border-border bg-background px-3">
                <span className="pointer-events-none mr-2 shrink-0 border-r border-border pr-2 text-sm font-semibold text-muted-foreground">
                  {getCurrencySymbol(currency)}
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                  onFocus={() => setAmount((prev) => prev.replace(/,/g, ""))}
                  onBlur={() => setAmount((prev) => formatAmountInput(prev) || prev)}
                  className={cn("h-full border-0 p-0 text-base font-semibold tabular-nums", fieldFocusReset)}
                />
              </div>
            </div>
          )}

          {showConversion && (
            <div className="-mt-1">
              {isLoadingConversion ? (
                <p className="text-[11px] text-muted-foreground animate-pulse">Fetching live rate...</p>
              ) : conversion.available ? (
                <div>
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatCurrencySpaced(conversion.amount, homeCurrency)}
                    <span className="ml-1 text-[10px] text-green-600">● Live rate</span>
                  </p>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Live rate for reference only. Rates may vary over time and across providers. Settlement amounts are calculated using the rate shown at the time of entry.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Conversion unavailable (using fallback)
                </p>
              )}
            </div>
          )}

          {/* Category + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-foreground">Category *</Label>
              <Select value={category} onValueChange={setCategory} disabled={expenseCategoriesLoading || expenseCategories.length === 0}>
                <SelectTrigger className={cn("h-10 rounded-xl text-sm", fieldFocusReset)}>
                  {category ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden pr-2">
                      <span className="text-sm shrink-0">
                        {expenseCategories.find(c => c.code === category)?.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {expenseCategories.find(c => c.code === category)?.name}
                      </span>
                    </div>
                  ) : expenseCategoriesLoading ? (
                    <span className="text-muted-foreground">Loading categories...</span>
                  ) : expenseCategories.length === 0 ? (
                    <span className="text-muted-foreground">No categories available</span>
                  ) : (
                    <span className="text-muted-foreground">Select category</span>
                  )}
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.code} value={cat.code} className="rounded-lg text-xs">
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="expense-date" className="text-xs font-medium text-foreground">Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="expense-date"
                    type="button"
                    variant="outline"
                    className={cn("h-10 w-full rounded-xl justify-between font-normal text-sm", buttonFocusReset)}
                  >
                    <span>{formatDateForDisplay(expenseDate)}</span>
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateInputToDate(expenseDate)}
                    onSelect={(selectedDate) => {
                      if (!selectedDate) return;
                      setExpenseDate(toDateInputValue(selectedDate));
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Paid By */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-foreground">Paid By</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className={cn("h-10 rounded-xl text-sm", fieldFocusReset)}>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={members.find(m => m.id === paidBy)?.imageUrl || members.find(m => m.id === paidBy)?.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {getMemberNameById(paidBy).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {paidBy === currentUserId ? `${getMemberNameById(paidBy)} (You)` : getMemberNameById(paidBy)}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id} className="rounded-lg text-xs">
                    <span className="flex items-center gap-2">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={member.imageUrl || member.avatar} />
                        <AvatarFallback className="text-[10px]">
                          {member.name ? member.name.charAt(0) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.id === currentUserId ? `${member.name} (You)` : member.name || "Unknown"}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Type Selector */}
          <div className="space-y-1 pt-0.5">
            <div className="flex rounded-full bg-secondary/70 p-0.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleSplitTypeChange("equal")}
                className={cn(
                  "flex-1 h-9 rounded-full text-sm font-medium transition-all",
                  buttonFocusReset,
                  splitType === "equal"
                    ? "bg-background text-foreground shadow-sm hover:bg-background font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Equally
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleSplitTypeChange("custom")}
                className={cn(
                  "flex-1 h-9 rounded-full text-sm font-medium transition-all",
                  buttonFocusReset,
                  splitType === "custom"
                    ? "bg-background text-foreground shadow-sm hover:bg-background font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Custom
              </Button>
            </div>
          </div>

          {/* Split With Members */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium text-foreground">Split with ({splitWith.length} selected)</Label>
              <div className="flex shrink-0 rounded-full bg-secondary p-0.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={cn(
                    "min-w-12 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer text-center",
                    allSelected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className={cn(
                    "min-w-12 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer text-center",
                    noneSelected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  None
                </button>
              </div>
            </div>

            {/* "You" row card */}
            {currentMember && (
              <div 
                onClick={() => toggleMemberSplit(currentMember.id)}
                className={cn(
                  "rounded-xl border-2 p-2 transition-all cursor-pointer select-none",
                  splitWith.includes(currentMember.id)
                    ? "border-foreground/70 bg-background shadow-sm"
                    : "border-border/60 bg-muted/20 opacity-60 hover:opacity-80"
                )}
              >
                <div className="flex min-h-10 items-center gap-2">
                  <span className={cn(
                    "h-4 w-4 rounded-md flex items-center justify-center shrink-0 transition-colors",
                    splitWith.includes(currentMember.id)
                      ? "bg-foreground text-background"
                      : "border-2 border-border bg-background"
                  )}>
                    {splitWith.includes(currentMember.id) && <Check className="h-3 w-3" strokeWidth={2.5} />}
                  </span>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={currentMember.imageUrl || currentMember.avatar} />
                    <AvatarFallback className="text-[10px] font-medium">
                      {currentMember.name ? currentMember.name.charAt(0) : "Y"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground truncate">
                        You
                      </p>
                      {paidBy === currentMember.id && (
                        <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded font-medium shrink-0">
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {splitWith.includes(currentMember.id)
                        ? totalAmount > 0
                          ? `${Math.round(((splitType === "custom" ? parseAmountInput(customAmounts[currentMember.id] || "") : (splitWith.length > 0 ? totalAmount / splitWith.length : 0)) / totalAmount) * 100)}% of total`
                          : "0% of total"
                        : "Not splitting"}
                    </p>
                  </div>

                  {splitWith.includes(currentMember.id) && (
                    splitType === "custom" ? (
                      <div className="flex h-8 w-[105px] shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">{getCurrencySymbol(currency)}</span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={customAmounts[currentMember.id] || ""}
                          onChange={(e) => handleCustomAmountChange(currentMember.id, e.target.value)}
                          className="h-full w-full min-w-0 border-0 p-0 text-right text-xs tabular-nums shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {totalAmount > 0 ? `${getCurrencySymbol(currency)} ${perPersonAmount}` : "-"}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Other members list */}
            {otherMembers.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="px-0.5 text-xs font-medium text-muted-foreground">
                  Other members
                </p>
                <div className="rounded-xl border border-border/60 bg-background divide-y divide-border/50 overflow-hidden">
                  {otherMembers.map((member) => {
                    const isSelected = splitWith.includes(member.id);
                    const isPayer = paidBy === member.id;
                    const memberShare = splitType === "custom"
                      ? parseAmountInput(customAmounts[member.id] || "")
                      : (splitWith.length > 0 ? totalAmount / splitWith.length : 0);
                    const sharePct = totalAmount > 0 ? Math.round((memberShare / totalAmount) * 100) : 0;

                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleMemberSplit(member.id)}
                        className={cn(
                          "flex min-h-12 items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer select-none hover:bg-secondary/40",
                          !isSelected && "opacity-50 bg-muted/20"
                        )}
                      >
                        <span className={cn(
                          "h-4 w-4 rounded-md flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-foreground text-background"
                            : "border-2 border-border bg-background"
                        )}>
                          {isSelected && <Check className="h-3 w-3" strokeWidth={2.5} />}
                        </span>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={member.imageUrl || member.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {member.name ? member.name.charAt(0) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-medium text-foreground">
                              {member.name}
                            </p>
                            {isPayer && (
                              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded font-medium shrink-0">
                                Paid
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {isSelected ? `${sharePct}% of total` : "Not splitting"}
                          </p>
                        </div>

                        {isSelected && (
                          splitType === "custom" ? (
                            <div className="flex h-8 w-[105px] shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2" onClick={(e) => e.stopPropagation()}>
                              <span className="text-xs text-muted-foreground">{getCurrencySymbol(currency)}</span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={customAmounts[member.id] || ""}
                                onChange={(e) => handleCustomAmountChange(member.id, e.target.value)}
                                className="h-full w-full min-w-0 border-0 p-0 text-right text-xs tabular-nums shadow-none outline-none ring-0 focus:outline-none focus:ring-0"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          ) : (
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                              {totalAmount > 0 ? `${getCurrencySymbol(currency)} ${perPersonAmount}` : "-"}
                            </span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Custom split progress block */}
            {splitType === "custom" && totalAmount > 0 && (
              <div className="rounded-xl bg-secondary/50 p-2.5 space-y-1.5 mt-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">Assigned</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {getCurrencySymbol(currency)} {formatAmountDisplay(totalCustomAmount)}{" "}
                    <span className="text-muted-foreground font-normal">of {getCurrencySymbol(currency)} {formatAmountDisplay(totalAmount)}</span>
                  </span>
                </div>
                <Progress value={customSplitProgress} className="h-1.5" />
                <div className="flex items-center justify-between gap-3 text-xs">
                  <p className={cn(
                    "tabular-nums font-medium",
                    Math.abs(customAmountDifference) < 0.01 ? "text-emerald-600 dark:text-emerald-400" : customAmountDifference < 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {Math.abs(customAmountDifference) < 0.01
                      ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" strokeWidth={2.5} />Balanced</span>
                      : customAmountDifference > 0
                        ? `${getCurrencySymbol(currency)} ${formatAmountDisplay(customAmountDifference)} remaining to assign`
                        : `${getCurrencySymbol(currency)} ${formatAmountDisplay(Math.abs(customAmountDifference))} over-assigned`}
                  </p>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {Math.round(customSplitProgress)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Notes & Receipts */}
          <div className="pt-0.5">
            {!showNotesAndReceipts ? (
              <button
                type="button"
                onClick={() => setShowNotesAndReceipts(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors py-1 outline-none ring-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add notes or receipt</span>
                {(notes || receiptPreview) && (
                  <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Added
                  </span>
                )}
              </button>
            ) : (
              <div className="space-y-3.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
                    Notes & Receipt
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowNotesAndReceipts(false)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Hide
                  </button>
                </div>

                {/* Notes Textarea */}
                <div className="space-y-1">
                  <Textarea
                    id="notes"
                    placeholder="Add any additional details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className={cn("min-h-[64px] resize-none rounded-xl text-xs bg-background", fieldFocusReset)}
                  />
                </div>

                {/* Receipt Upload */}
                <div className="space-y-1">
                  {receiptPreview ? (
                    <div className="relative border border-border rounded-xl p-2 bg-background">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-full h-28 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className={cn("absolute top-3 right-3 h-6 w-6 rounded-lg", buttonFocusReset)}
                        onClick={handleRemoveReceipt}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex h-[60px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/80 bg-background text-muted-foreground hover:bg-secondary/50 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span className="text-xs font-medium">Attach a photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReceiptUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions - Fixed Footer */}
        <div className="flex-none border-t border-border/50 bg-background px-5 py-2.5 sm:px-6">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>
                {formatCurrencySpaced(totalAmount, currency)} · split {splitWith.length} {splitWith.length === 1 ? "way" : "ways"}
              </span>
            </span>
            <span className={settlementSummary.colorClass}>
              {settlementSummary.text}
            </span>
          </div>

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              className={cn("h-9 flex-1 rounded-xl text-sm font-medium", buttonFocusReset)}
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn("h-9 flex-1 rounded-xl text-sm font-medium", buttonFocusReset)}
              onClick={handleSubmit}
              disabled={!isValid}
            >
              {isEditMode ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
