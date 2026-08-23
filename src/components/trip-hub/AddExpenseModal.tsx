/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Upload, Receipt, Users, UserCheck, Pencil, Info, Calendar as CalendarIcon, Wallet, Check } from "lucide-react";
import { expenseCategories } from "@/lib/expenseCategories";
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
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  hasReceipt?: boolean;
  receipt_url?: string;
  paymentProgress?: number;
  category?: string;
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
  }, [currentUser, members, getMemberIdByName, getLastUsedCurrency]);

  // Load editing expense data
  useEffect(() => {
    if (editingExpense && open) {
      setTitle(editingExpense.title);
      setAmount(formatAmountInput(editingExpense.amount.toString()));
      setExpenseDate(parseDateToInput(editingExpense.date));
      setCurrency(editingExpense.originalCurrency || "USD");
      setCategory(editingExpense.category || "other");
      setPaidBy(getMemberIdByName(editingExpense.paidBy));
      setSplitType(editingExpense.splitType || "equal");
      setSplitWith(editingExpense.splitWith || members.map((m) => m.id));
      setNotes(editingExpense.notes || "");
      
      // Load existing receipt if available
      if (editingExpense.receipt_url) {
        setReceiptPreview(editingExpense.receipt_url);
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
      <DialogContent className="max-w-lg sm:max-w-[520px] h-[90vh] sm:h-auto sm:max-h-[90vh] w-[calc(100%-2rem)] sm:w-full rounded-3xl p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none border-b border-border/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-[17px] font-medium">
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
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Expense title *</Label>
            <Input
              id="title"
              placeholder="e.g., Group dinner, Ferry tickets"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className={cn("h-12 rounded-xl text-[15px]", fieldFocusReset)}
            />
          </div>

          {/* Amount with Currency */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <div className="relative flex h-14 items-center rounded-xl border border-border bg-background px-3.5">
                  <span className="pointer-events-none text-[15px] text-muted-foreground">
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
                    className={cn("h-full border-0 pl-2 text-lg tabular-nums", fieldFocusReset, "focus:border-transparent focus-visible:border-transparent")}
                  />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="currency-select">Paid in</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger id="currency-select" className={cn("h-14 rounded-xl", fieldFocusReset)}>
                    <span className="flex items-center gap-1.5">
                      <span>{getCurrencySymbol(currency)}</span>
                      <span>{currency}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableCurrencies.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="rounded-lg">
                        <span className="flex items-center gap-1.5">
                          <span>{c.symbol}</span>
                          <span>{c.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currency === homeCurrency ? (
                  <p className="text-[10px] font-medium text-primary">Home</p>
                ) : (
                  <p className="text-[10px] font-medium text-muted-foreground">Travel</p>
                )}
              </div>
            </div>
            
            {/* Conversion preview */}
            {showConversion && isLoadingConversion && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Fetching live rate...
              </p>
            )}
            {showConversion && !isLoadingConversion && conversion.available && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  ≈ {formatCurrencySpaced(conversion.amount, homeCurrency)}
                  <span className="ml-1 text-[10px] text-green-600">● Live rate</span>
                </p>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Live rate for reference only. Rates may vary over time and across providers. Settlement amounts are calculated using the rate shown at the time of entry.
                </p>
              </div>
            )}
            {showConversion && !isLoadingConversion && !conversion.available && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Conversion unavailable (using fallback)
              </p>
            )}
          </div>

          {/* Category + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={cn("h-12 rounded-xl", fieldFocusReset)}>
                  {category ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden pr-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base">
                        {expenseCategories.find(c => c.id === category)?.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {expenseCategories.find(c => c.id === category)?.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select category</span>
                  )}
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <span className="text-base">{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="expense-date"
                    type="button"
                    variant="outline"
                    className={cn("h-12 w-full rounded-xl justify-between font-normal", buttonFocusReset)}
                  >
                    <span>{formatDateForDisplay(expenseDate)}</span>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
          <div className="space-y-2">
            <Label>Paid By</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className={cn("h-12 rounded-xl", fieldFocusReset)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id} className="rounded-lg">
                    <span className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.imageUrl || member.avatar} />
                        <AvatarFallback className="text-[10px]">
                          {member.name ? member.name.charAt(0) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name || "Unknown"}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Type */}
          <div className="space-y-1.5">
            <Label>Split type</Label>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleSplitTypeChange("equal")}
                className={cn(
                  "h-10 rounded-lg text-sm",
                  buttonFocusReset,
                  splitType === "equal" && "bg-background font-medium text-foreground shadow-sm hover:bg-background"
                )}
              >
                <Users className="mr-1.5 h-4 w-4" />
                Split equally
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleSplitTypeChange("custom")}
                className={cn(
                  "h-10 rounded-lg text-sm",
                  buttonFocusReset,
                  splitType === "custom" && "bg-background font-medium text-foreground shadow-sm hover:bg-background"
                )}
              >
                <UserCheck className="mr-1.5 h-4 w-4" />
                Custom split
              </Button>
            </div>
          </div>

          {/* Split With Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Split With ({splitWith.length} selected)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className={cn("h-7 text-xs rounded-lg", buttonFocusReset)}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className={cn("h-7 text-xs rounded-lg", buttonFocusReset)}
                >
                  None
                </Button>
              </div>
            </div>
            <div className="border-t border-border/60">
              {members.map((member) => {
                const isSelected = splitWith.includes(member.id);
                const memberShareAmount = splitType === "custom"
                  ? parseAmountInput(customAmounts[member.id] || "")
                  : splitWith.length > 0 ? totalAmount / splitWith.length : 0;
                const memberSharePercentage = totalAmount > 0
                  ? Math.round((memberShareAmount / totalAmount) * 100)
                  : null;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 border-b border-border/50 last:border-b-0"
                  >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={member.name || "Unknown"}
                    onClick={() => toggleMemberSplit(member.id)}
                    className="group -ml-2 flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-secondary outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [-webkit-tap-highlight-color:transparent]"
                  >
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-transparent transition-colors",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background group-hover:border-foreground/60"
                    )}>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <Avatar className={cn(
                      "h-9 w-9 shrink-0 transition-opacity",
                      !isSelected && "opacity-50"
                    )}>
                      <AvatarImage src={member.imageUrl || member.avatar} />
                      <AvatarFallback className="text-[10px]">
                        {member.name ? member.name.charAt(0) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className={cn(
                        "block truncate text-sm transition-colors",
                        isSelected ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>{member.name || "Unknown"}</span>
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {isSelected && memberSharePercentage !== null
                          ? `${memberSharePercentage}% of total`
                          : "Not splitting"}
                      </span>
                    </span>
                  </button>
                  
                  {isSelected && (
                    splitType === "custom" ? (
                      <div className="flex h-11 w-[132px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">{getCurrencySymbol(currency)}</span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={customAmounts[member.id] || ""}
                          onChange={(e) => handleCustomAmountChange(member.id, e.target.value)}
                          className="h-full w-full min-w-0 border-0 p-0 text-right text-sm tabular-nums shadow-none outline-none ring-0 transition-none focus:outline-none focus:ring-0 focus:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-[132px] shrink-0 items-center justify-end pr-3">
                        <span className={cn("text-sm tabular-nums", totalAmount > 0 ? "text-muted-foreground" : "text-border")}>
                          {totalAmount > 0 ? `${getCurrencySymbol(currency)} ${perPersonAmount}` : "-"}
                        </span>
                      </div>
                    )
                  )}
                  </div>
                );
              })}
            </div>
            
            {/* Summary */}
            {splitWith.length > 0 && totalAmount > 0 && (
              <div className="space-y-1.5">
                {splitType === "equal" ? (
                  <p className="text-[13px] text-muted-foreground">
                    Each person pays: <span className="font-medium text-foreground">{getCurrencySymbol(currency)} {perPersonAmount}</span>
                  </p>
                ) : (
                  <div className="mt-3 rounded-xl bg-secondary/50 p-3.5">
                    <div className="mb-2 flex items-baseline justify-between text-[13px]">
                      <span className="text-muted-foreground">Assigned</span>
                      <span className="tabular-nums text-foreground">
                        {getCurrencySymbol(currency)} {formatAmountDisplay(totalCustomAmount)}{" "}
                        <span className="text-muted-foreground">of {getCurrencySymbol(currency)} {formatAmountDisplay(totalAmount)}</span>
                      </span>
                    </div>
                    <Progress value={customSplitProgress} className="h-1.5" />
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <p className={cn(
                        "text-[13px] tabular-nums",
                        Math.abs(customAmountDifference) < 0.01 ? "text-green-600" : customAmountDifference < 0 ? "text-destructive" : "text-muted-foreground"
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
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className={cn("min-h-[80px] resize-none rounded-xl text-[15px]", fieldFocusReset)}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-1.5">
            <Label>Receipt</Label>
            {receiptPreview ? (
              <div className="relative border border-border rounded-xl p-2 bg-secondary/30">
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className={cn("absolute top-3 right-3 h-7 w-7 rounded-lg", buttonFocusReset)}
                  onClick={handleRemoveReceipt}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground hover:bg-secondary/50">
                <Upload className="h-[18px] w-[18px]" />
                <span className="text-[13px]">
                  Attach a photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptUpload}
                />
              </label>
            )}
          </div>

          {/* Actions - Fixed Footer */}
        </div>
        
        <div className="flex-none border-t border-border/50 bg-background px-6 py-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground">
            <Wallet className="h-[15px] w-[15px]" strokeWidth={1.75} />
            {splitWith.length > 0 && totalAmount > 0 ? (
              <span>
                <span className="font-medium tabular-nums text-foreground">
                  {getCurrencySymbol(currency)} {formatAmountDisplay(totalAmount)}
                </span>{" "}
                across {splitWith.length} {splitWith.length === 1 ? "person" : "people"}
                {splitType === "equal" && <> · {getCurrencySymbol(currency)} {perPersonAmount} each</>}
              </span>
            ) : (
              <span>Nothing to settle yet</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className={cn("h-12 flex-1 rounded-xl text-[15px] font-medium", buttonFocusReset)}
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={cn("h-12 flex-1 rounded-xl text-[15px] font-medium", buttonFocusReset)}
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
