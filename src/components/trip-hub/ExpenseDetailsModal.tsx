import { useState, useRef, useEffect } from "react";
import { Receipt, Users, User, Upload, CheckCircle, Download, Eye, ZoomIn, ZoomOut, Clock, ImageIcon, Bell, Camera, X, Check, Pencil, Maximize2, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseData } from "@/components/trip-hub/AddExpenseModal";
import { getCategoryById } from "@/lib/expenseCategories";
import { ExpensePayment } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { PaymentReviewModal } from "./PaymentReviewModal";
import { ReceiptsFromOthersModal } from "./ReceiptsFromOthersModal";
import { formatDisplayDate } from "@/lib/dateUtils";
import { CurrencyCode, formatCurrencySpaced } from "@/lib/currencyUtils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { sendPaymentReminderToMember, sendPaymentReminderToAll } from "@/lib/paymentReminders";

type TabType = "overview" | "payments";

interface ExpenseDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseData | null;
  currentUser?: string;
  initialTab?: TabType;
  viewCurrency?: "original" | "home";
  // Optional net amount owed to the payer across all expenses (home currency)
  pairNetAmount?: number;
  onMarkAsReceived?: (memberId: string) => void;
  onUploadProof?: (file: File, note?: string) => void;
  onUpdateProgress?: (newProgress: number) => void;
  onConfirmPaymentReceived?: (expenseId: string, memberId: string) => void;
  onSubmitPayment?: (expenseId: string, memberId: string, receiptFile?: File, payerNote?: string) => void;
  members: Array<{ id: string; name: string; imageUrl?: string; avatar?: string }>;
}

// Mock payment data for each member
interface MemberPayment {
  memberId: string;
  status: "pending" | "settled";
  receiptUrl?: string;
  uploadedAt?: string;
  payerNote?: string;
  confirmedByPayer?: boolean;
}

export function ExpenseDetailsModal({
  open,
  onOpenChange,
  expense,
  currentUser = "User",
  initialTab = "overview",
  viewCurrency = "home",
  onMarkAsReceived,
  onUploadProof,
  onUpdateProgress,
  onConfirmPaymentReceived,
  onSubmitPayment,
  members,
  pairNetAmount,
}: ExpenseDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [zoom, setZoom] = useState(1);
  const [showFullReceipt, setShowFullReceipt] = useState(true);
  const [showFullScreenReceipt, setShowFullScreenReceipt] = useState(false);
  
  // Upload state for Payments tab
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  
  // Mock member payment statuses
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  
  // State for edit mode in AWAITING_CONFIRMATION state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNote, setEditNote] = useState("");
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);
  
  // Payment review modal state
  const [reviewingPayment, setReviewingPayment] = useState<{
    member: { id: string; name: string; imageUrl?: string; avatar?: string };
    payment: MemberPayment;
    amount: number;
  } | null>(null);

  // Receipts from others modal state
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Avatar cache to prevent Dicebear URL regeneration and blinking
  const avatarCache = useRef<Map<string, string>>(new Map());

  // Loading state for reminders
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Sync memberPayments with expense.payments when expense prop updates
  useEffect(() => {
    if (open && expense) {
      const splitMembers = expense.splitWith || members.map(m => m.id);
      const payerMember = members.find(m => m.name === expense.paidBy);
      
      if (expense.payments && expense.payments.length > 0) {
        setMemberPayments(expense.payments.map(p => ({
          memberId: p.memberId,
          status: p.status,
          receiptUrl: p.receiptUrl,
          uploadedAt: p.uploadedAt,
          payerNote: p.payerNote,
          confirmedByPayer: p.confirmedByPayer ?? false,
        })));
      } else {
        setMemberPayments(splitMembers.map(memberId => ({
          memberId,
          status: memberId === payerMember?.id ? "settled" : "pending",
        })));
      }
    }
  }, [expense, members, open]);

  // Reset UI state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && expense) {
      setActiveTab(initialTab);
      setUploadedFile(null);
      setUploadPreview(null);
      setUploadNote("");
      setZoom(1);
      setShowFullReceipt(true);
      setShowFullScreenReceipt(false);
      setReviewingPayment(null);
      setIsEditingNote(false);
      setIsEditingReceipt(false);
    }
    onOpenChange(newOpen);
  };

  if (!expense) return null;

  const category = getCategoryById(expense.category || "Other");

  // Generate gender-based default avatar using Notion style (cached to prevent blinking)
  const getDefaultAvatar = (userId: string, gender?: string) => {
    const cacheKey = `${userId}-${gender || 'neutral'}`;
    
    if (!avatarCache.current.has(cacheKey)) {
      let url: string;
      if (gender === "male") {
        url = `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-female`;
      } else if (gender === "female") {
        url = `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-male`;
      } else {
        url = `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}`;
      }
      avatarCache.current.set(cacheKey, url);
    }
    
    return avatarCache.current.get(cacheKey)!;
  };

  // Calculate split amounts
  const splitMembers = expense.splitWith || members.map(m => m.id);
  const memberCount = splitMembers.length;
  // Determine display currency and amounts based on viewCurrency
  const displayCurrencyCode: CurrencyCode = viewCurrency === "home"
    ? (expense.homeCurrency || "MYR")
    : (expense.originalCurrency || "USD");
  const totalDisplayAmount = viewCurrency === "home"
    ? (expense.convertedAmountHome ? parseFloat(expense.convertedAmountHome.toString()) : expense.amount)
    : expense.amount;

  const equalSplitAmount = totalDisplayAmount / memberCount;
  
  // Calculate payment progress if not provided
  const paymentProgress = expense.paymentProgress ?? (() => {
    const settledCount = expense.payments?.filter(p => p.status === 'settled').length || 0;
    const totalCount = expense.payments?.length || memberCount;
    return totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;
  })();
  
  const settledAmount = (paymentProgress / 100) * totalDisplayAmount;

  // Get member details
  const getMemberById = (id: string) => members.find(m => m.id === id);
  
  // Find current user's member ID
  const currentUserMember = members.find(m => m.name === currentUser);
  const currentUserId = currentUserMember?.id;
  
  // Determine user's role
  const payerMember = members.find(m => m.name === expense.paidBy);
  const isPayer = payerMember?.id === currentUserId;
  const isFullySettled = paymentProgress === 100;

  // Get receipt URL from expense data
  const receiptUrl = expense.receipt_url || undefined;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleDownload = () => {
    if (receiptUrl) {
      const link = document.createElement("a");
      link.href = receiptUrl;
      link.download = `receipt-${expense.title.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Payment status helpers
  const getPaymentStatus = () => {
    if (expense.paymentProgress === 100) return "Paid";
    if (expense.paymentProgress > 0) return "Partially Paid";
    return "Pending";
  };

  const getStatusBadgeVariant = () => {
    if (expense.paymentProgress === 100) return "default";
    if (expense.paymentProgress > 0) return "secondary";
    return "outline";
  };

  // Handle file upload for "I owe" case
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setUploadPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadPreview(null);
  };

  // Handle sending payment reminder to specific member
  const handleRemindMember = async (memberId: string) => {
    if (!expense?.id) return;
    
    setIsSendingReminder(true);
    try {
      const result = await sendPaymentReminderToMember(expense.id, memberId);
      const member = members.find(m => m.id === memberId);
      
      if (result.sent > 0) {
        toast({
          title: "Reminder sent",
          description: `${member?.name || 'Member'} has been notified about their pending payment.`,
        });
      } else {
        toast({
          title: "Failed to send reminder",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send payment reminder.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Handle sending payment reminder to all unpaid members
  const handleRemindAll = async () => {
    if (!expense?.id) return;
    
    setIsSendingReminder(true);
    try {
      const result = await sendPaymentReminderToAll(expense.id);
      
      if (result.sent > 0) {
        toast({
          title: "Reminders sent",
          description: `${result.sent} member(s) have been notified about their pending payment.`,
        });
      } else {
        toast({
          title: "No reminders sent",
          description: result.message || "All members have already paid.",
        });
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast({
        title: "Error",
        description: "Failed to send payment reminders.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSubmitProof = () => {
    // Capture values before reset
    const savedFile = uploadedFile;
    const savedPreview = uploadPreview;
    const savedNote = uploadNote;
    const submittedAt = new Date().toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
    
    // Update local state for immediate UI feedback - mark as settled but not confirmed
    setMemberPayments(prev => 
      prev.map(p => p.memberId === currentUserId 
        ? { 
            ...p, 
            status: "settled" as const,
            receiptUrl: savedPreview || undefined,
            payerNote: savedNote || undefined,
            uploadedAt: submittedAt,
            confirmedByPayer: false
          } 
        : p
      )
    );
    
    // Call parent callback to persist the payment status and upload file
    onSubmitPayment?.(
      expense.id, 
      currentUserId || "", 
      savedFile || undefined, 
      savedNote || undefined
    );
    
    toast({
      title: "Uploading payment proof...",
      description: `Please wait while we upload your receipt.`,
    });
    
    // Reset upload form state
    setUploadedFile(null);
    setUploadPreview(null);
    setUploadNote("");
  };


  // Handle marking a member's payment as settled
  const handleMarkMemberSettled = (memberId: string) => {
    setMemberPayments(prev => 
      prev.map(p => p.memberId === memberId ? { ...p, status: "settled" as const, confirmedByPayer: true } : p)
    );
    
    const member = getMemberById(memberId);
    
    // Calculate new progress based on amounts
    const getMemberShare = (mId: string) => {
      if (expense?.splitType === "custom" && expense?.customSplitAmounts) {
        return expense.customSplitAmounts.find(c => c.memberId === mId)?.amount || 0;
      }
      return (expense?.amount || 0) / memberCount;
    };
    
    const currentSettledAmount = memberPayments
      .filter(p => p.status === "settled")
      .reduce((sum, p) => sum + getMemberShare(p.memberId), 0);
    const newSettledAmount = currentSettledAmount + getMemberShare(memberId);
    const newProgress = Math.round((newSettledAmount / (expense?.amount || 1)) * 100);
    
    // Call the new confirmation handler if provided
    if (onConfirmPaymentReceived && expense) {
      onConfirmPaymentReceived(expense.id, memberId);
    }
    
    onMarkAsReceived?.(memberId);
    onUpdateProgress?.(newProgress);
    
    toast({
      title: "Payment settled",
      description: `${member?.name}'s payment has been marked as settled.`,
    });
  };

  // Handle viewing a payment for review
  const handleViewPayment = (member: { id: string; name: string; imageUrl?: string; avatar?: string }, payment: MemberPayment, amount: number) => {
    // Add mock receipt data for settled payments with receipts in demo
    const enhancedPayment = payment.status === "settled" && !payment.receiptUrl
      ? {
          ...payment,
          receiptUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop",
          uploadedAt: "Jan 16, 2025",
          payerNote: "Paid via TNG on Jan 16"
        }
      : payment;
    setReviewingPayment({ member, payment: enhancedPayment, amount });
  };

  // Handle confirming payment from review modal
  const handleConfirmFromReview = () => {
    if (!reviewingPayment) return;
    handleMarkMemberSettled(reviewingPayment.member.id);
    setReviewingPayment(null);
  };

  // Get current user's payment status
  const currentUserPayment = memberPayments.find(p => p.memberId === currentUserId);
  const currentUserOwesAmount = (() => {
    if (isPayer) return 0;
    if (expense.splitType === "custom" && expense.customSplitAmounts) {
      const customAmount = expense.customSplitAmounts.find(c => c.memberId === currentUserId);
      return customAmount?.amount || 0;
    }
    return equalSplitAmount;
  })();

  // Mock uploaded receipts for Receipts tab
  const uploadedReceipts = expense.hasReceipt ? [
    {
      id: "1",
      url: receiptUrl!,
      uploadedBy: expense.paidBy,
      uploadedAt: expense.date,
    }
  ] : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Fixed Header */}
        <div className="flex-none relative">
          {/* Custom Close Button */}
          <button 
            onClick={() => handleOpenChange(false)}
            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="sr-only">{expense.title} Details</DialogTitle>
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${category.color.split(' ')[0]}`}>
                <span className="text-2xl">{category.emoji}</span>
              </div>
              <div className="w-full space-y-2">
                <p className="text-lg sm:text-base font-semibold text-foreground">{expense.title}</p>
                {/* Progress bar with amount - under title */}
                <div className="space-y-2">
                  <span className={`text-xs font-medium ${paymentProgress === 100 ? "text-stat-green" : "text-amber-600"}`}>
                    {paymentProgress}% settled · {formatCurrencySpaced(Number(settledAmount.toFixed(2)), displayCurrencyCode)}/{formatCurrencySpaced(Number(totalDisplayAmount.toFixed(2)), displayCurrencyCode)}
                  </span>
                  <Progress 
                    value={paymentProgress} 
                    className="h-2 max-w-[200px] mx-auto"
                    autoVariant
                    animate 
                  />
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Fixed Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mx-4 mt-4" style={{ width: "calc(100% - 2rem)" }}>
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable Content - ONLY this scrolls */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
          <Tabs value={activeTab} className="w-full">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 space-y-4 mt-0">
            {/* Combined: Amount + Paid by in one card */}
            <Card className="p-4 border-border/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage 
                    src={payerMember?.imageUrl || payerMember?.avatar || getDefaultAvatar(payerMember?.id || 'unknown')} 
                    alt={expense.paidBy || "Payer"} 
                  />
                  <AvatarFallback>{(expense.paidBy || "P").split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] sm:text-xs text-muted-foreground">Paid by</p>
                  <p className="font-medium text-foreground text-[15px] sm:text-sm truncate">{expense.paidBy}</p>
                  <p className="text-[13px] sm:text-xs text-muted-foreground">{formatDisplayDate(expense.date)}</p>
                </div>
                
                <div className="text-right shrink-0 flex items-center">
                  <p className="text-xl font-bold text-foreground">{formatCurrencySpaced(totalDisplayAmount, displayCurrencyCode)}</p>
                </div>
              </div>
            </Card>

            {/* Receipts Section (elevated priority) */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[13px] sm:text-xs font-medium text-muted-foreground">Receipts</h3>
              </div>

              {uploadedReceipts.length > 0 ? (
                <div className="space-y-3">
                  {uploadedReceipts.map((receipt) => (
                    <Card key={receipt.id} className="overflow-hidden border-border/50">
                      {showFullReceipt ? (
                        <>
                          {/* Full Receipt View with Zoom */}
                          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomOut}
                                className="h-7 w-7"
                                disabled={zoom <= 0.5}
                              >
                                <ZoomOut className="h-3.5 w-3.5" />
                              </Button>
                              <span className="text-xs text-muted-foreground w-10 text-center">
                                {Math.round(zoom * 100)}%
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomIn}
                                className="h-7 w-7"
                                disabled={zoom >= 3}
                              >
                                <ZoomIn className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDownload}
                                className="h-7 w-7"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowFullScreenReceipt(true)}
                                className="h-7 text-xs gap-1"
                              >
                                <Maximize2 className="h-3 w-3" />
                                Expands
                              </Button>
                            </div>
                          </div>
                          <div className="max-h-[280px] overflow-auto scrollbar-hide">
                            <div
                              className="flex items-center justify-center p-2"
                              style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
                            >
                              <img
                                src={receipt.url}
                                alt="Receipt"
                                className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setShowFullScreenReceipt(true)}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Thumbnail View */
                        <div className="relative">
                          <img
                            src={receipt.url}
                            alt="Receipt thumbnail"
                            className="w-full h-64 object-contain"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-[13px] sm:text-[11px] text-foreground/80">{receipt.uploadedBy}</p>
                                <p className="text-[13px] sm:text-[11px] text-muted-foreground">{receipt.uploadedAt}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowFullReceipt(true)}
                                className="h-7 text-xs gap-1.5 flex-1"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={handleDownload}
                                className="h-7 w-7"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-4 text-center border-border/50">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-[15px] sm:text-sm text-muted-foreground">No receipts uploaded yet</p>
                </Card>
              )}
            </div>

            {/* Split Breakdown */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[13px] sm:text-xs font-medium text-muted-foreground">Split breakdown</h3>
                <Badge variant="secondary" className="text-[12px] sm:text-[10px] px-1.5">
                  {expense.splitType === "equal" ? "Equal" : "Custom"}
                </Badge>
              </div>

              <div className="space-y-2">
                {splitMembers.map((memberId) => {
                  const member = getMemberById(memberId);
                  if (!member) return null;

                  let amount = equalSplitAmount;
                  if (expense.splitType === "custom" && expense.customSplitAmounts) {
                    const customAmount = expense.customSplitAmounts.find(c => c.memberId === memberId);
                    const baseAmount = customAmount?.amount || (expense.amount / memberCount);
                    if (viewCurrency === "home" && expense.convertedAmountHome && expense.amount > 0) {
                      const ratio = parseFloat(expense.convertedAmountHome.toString()) / expense.amount;
                      amount = baseAmount * ratio;
                    } else {
                      amount = viewCurrency === "home" ? (totalDisplayAmount / memberCount) : baseAmount;
                    }
                  }

                  const isThisMemberPayer = member.name === expense.paidBy;
                  const memberPayment = memberPayments.find(p => p.memberId === memberId);
                  const isPaid = isThisMemberPayer || memberPayment?.status === "settled";
                  const isAwaitingConfirmation = memberPayment?.status === "settled" && !memberPayment?.confirmedByPayer;

                  // Determine status to display
                  let displayStatus: "pending" | "settled" | "awaiting" = "pending";
                  if (isThisMemberPayer) {
                    displayStatus = "settled"; // Payer is always settled
                  } else if (isAwaitingConfirmation) {
                    displayStatus = "awaiting"; // Receipt uploaded, awaiting confirmation
                  } else if (isPaid) {
                    displayStatus = "settled"; // Confirmed as paid
                  }

                  return (
                    <Card key={memberId} className="p-3 border-border/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage 
                            src={member.imageUrl || member.avatar || getDefaultAvatar(member.id)} 
                            alt={member.name || "Member"} 
                          />
                          <AvatarFallback className="text-[13px] sm:text-xs">
                            {(member.name || "M").split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <p className="flex-1 min-w-0 text-[15px] sm:text-sm font-medium text-foreground break-words">{member.name || "Unknown"}</p>
                        <p className="text-[15px] sm:text-sm font-semibold text-foreground whitespace-nowrap">
                          {formatCurrencySpaced(Number(amount.toFixed(2)), displayCurrencyCode)}
                        </p>
                        <StatusBadge 
                          status={displayStatus} 
                          className="shrink-0"
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Notes Section */}
            {expense.notes && expense.notes.trim() !== "" && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-[13px] sm:text-xs font-medium text-muted-foreground">Notes</h3>
                </div>
                <Card className="p-4 border-border/50">
                  <p className="text-[15px] sm:text-sm text-foreground whitespace-pre-wrap">
                    {expense.notes}
                  </p>
                </Card>
              </div>
            )}

          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="p-4 space-y-4 mt-0">
            {isFullySettled ? (
              /* Fully Settled State - Show payment history with receipts */
              <div className="space-y-4">
                <Card className="p-4 text-center border-border/50 bg-stat-green/5">
                  <CheckCircle className="h-10 w-10 mx-auto text-stat-green mb-2" />
                  <p className="font-medium text-foreground text-[15px] sm:text-sm">All payments settled</p>
                  <p className="text-[15px] sm:text-sm text-muted-foreground mt-1">
                    Everyone has paid their share for this expense.
                  </p>
                </Card>

                {/* Payment History List */}
                <div className="space-y-2">
                  <h3 className="text-[15px] sm:text-sm font-medium text-muted-foreground">Payment History</h3>
                  {splitMembers
                    .filter(memberId => {
                      const member = getMemberById(memberId);
                      return member && member.name !== expense.paidBy;
                    })
                    .map((memberId) => {
                      const member = getMemberById(memberId);
                      if (!member) return null;

                      let amount = equalSplitAmount;
                      if (expense.splitType === "custom" && expense.customSplitAmounts) {
                        const customAmount = expense.customSplitAmounts.find(c => c.memberId === memberId);
                        const baseAmount = customAmount?.amount || (expense.amount / memberCount);
                        if (viewCurrency === "home" && expense.convertedAmountHome && expense.amount > 0) {
                          const ratio = parseFloat(expense.convertedAmountHome.toString()) / expense.amount;
                          amount = baseAmount * ratio;
                        } else {
                          amount = viewCurrency === "home" ? (totalDisplayAmount / memberCount) : baseAmount;
                        }
                      }

                      const memberPayment = memberPayments.find(p => p.memberId === memberId);

                      return (
                        <Card key={memberId} className="p-4 rounded-3xl border border-border/60 bg-white shadow-sm">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage 
                                src={member.imageUrl || member.avatar || getDefaultAvatar(member.id)} 
                                alt={member.name || "Member"} 
                              />
                              <AvatarFallback className="text-[13px] sm:text-xs">
                                {(member.name || "M").split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm sm:text-sm truncate">{member.name || "Unknown"}</p>
                              <p className="text-[15px] font-semibold text-foreground">
                                {formatCurrencySpaced(Number(amount.toFixed(2)), displayCurrencyCode)}
                              </p>
                              <div className="mt-1">
                                <StatusBadge status="settled" />
                              </div>
                            </div>

                            <div className="flex w-[132px] shrink-0 flex-col gap-1.5">
                              <Button
                                size="sm"
                                disabled
                                className="h-8 rounded-full text-[11px]"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Received
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReviewingPayment({
                                    member,
                                    payment: memberPayment || { memberId, status: "settled" as const },
                                    amount
                                  });
                                }}
                                className="h-8 rounded-full border-border bg-white px-4 text-[11px] text-foreground hover:bg-secondary"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Receipt
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            ) : isPayer ? (
              /* Case B: Others owe me - Show pending payments */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-[13px] sm:text-sm font-semibold text-foreground">Pending Payments from Others</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemindAll}
                    disabled={isSendingReminder}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    {isSendingReminder ? "Sending..." : "Remind All"}
                  </Button>
                </div>

                <div className="space-y-2">
                  {splitMembers
                    .filter(memberId => {
                      const member = getMemberById(memberId);
                      return member && member.name !== expense.paidBy;
                    })
                    .map((memberId) => {
                      const member = getMemberById(memberId);
                      if (!member) return null;

                      let amount = equalSplitAmount;
                      if (expense.splitType === "custom" && expense.customSplitAmounts) {
                        const customAmount = expense.customSplitAmounts.find(c => c.memberId === memberId);
                        const baseAmount = customAmount?.amount || (expense.amount / memberCount);
                        if (viewCurrency === "home" && expense.convertedAmountHome && expense.amount > 0) {
                          const ratio = parseFloat(expense.convertedAmountHome.toString()) / expense.amount;
                          amount = baseAmount * ratio;
                        } else {
                          amount = viewCurrency === "home" ? (totalDisplayAmount / memberCount) : baseAmount;
                        }
                      }

                      const memberPayment = memberPayments.find(p => p.memberId === memberId);
                      const isSettled = memberPayment?.status === "settled";
                      const isAwaitingConfirmation = isSettled && !memberPayment?.confirmedByPayer;

                      // Get status badge with updated styling
                      const getStatusBadge = () => {
                        if (isAwaitingConfirmation) {
                          return <StatusBadge status="awaiting" />;
                        }
                        return <StatusBadge status={isSettled ? "settled" : "pending"} />;
                      };

                      return (
                        <Card key={memberId} className="p-4 rounded-3xl border border-border/60 bg-white shadow-sm">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage 
                                src={member.imageUrl || member.avatar || getDefaultAvatar(member.id)} 
                                alt={member.name || "Member"} 
                              />
                              <AvatarFallback className="text-[13px] sm:text-xs">
                                {(member.name || "M").split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm sm:text-sm truncate">{member.name || "Unknown"}</p>
                              <p className="text-[15px] font-semibold text-foreground">
                                {formatCurrencySpaced(Number(amount.toFixed(2)), displayCurrencyCode)}
                              </p>
                              <div className="mt-1">
                                {getStatusBadge()}
                              </div>
                            </div>

                            <div className="flex w-[132px] shrink-0 flex-col gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleMarkMemberSettled(memberId)}
                                disabled={isSettled}
                                className="h-8 rounded-full bg-slate-950 text-[11px] text-white hover:bg-black disabled:opacity-50"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Received
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReviewingPayment({
                                  member,
                                  payment: memberPayment || { memberId, status: "pending" as const },
                                  amount
                                })}
                                className="h-8 rounded-full border-border bg-white text-[11px] text-foreground hover:bg-secondary"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Receipt
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* Case A: I owe others - Show my payment status based on state */
              <div className="space-y-4">
                {/* Amount Display - Clean centered design */}
                <div className="bg-muted/50 rounded-2xl p-6 text-center">
                  <p className="text-[15px] sm:text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrencySpaced(Number(currentUserOwesAmount.toFixed(2)), displayCurrencyCode)}
                  </p>
                  {typeof pairNetAmount === 'number' && pairNetAmount >= 0 && (
                    <p className="text-[12px] sm:text-xs text-muted-foreground mt-2">
                      Net outstanding to {expense.paidBy}: {formatCurrencySpaced(Number(pairNetAmount.toFixed(2)), expense.homeCurrency || 'MYR')}
                    </p>
                  )}
                </div>

                {/* PENDING State - Show upload form (also handles undefined status for users who owe) */}
                {(!currentUserPayment || currentUserPayment.status === "pending") && !isPayer && (
                  <div className="space-y-4">
                    {/* Optional Note */}
                    <div className="space-y-2">
                      <label className="text-[15px] sm:text-sm font-medium text-foreground">
                        Add a note (optional)
                      </label>
                      <Textarea
                        value={uploadNote}
                        onChange={(e) => setUploadNote(e.target.value)}
                        placeholder="e.g., Paid via DuitNow"
                        className="resize-none h-20 rounded-xl text-sm"
                      />
                    </div>

                    {/* Receipt Upload */}
                    <div className="space-y-2">
                      <label className="text-[15px] sm:text-sm font-medium text-foreground">
                        Upload Payment Receipt
                      </label>

                      {uploadPreview ? (
                        <div className="relative">
                          <img
                            src={uploadPreview}
                            alt="Receipt preview"
                            className="w-full h-64 object-contain rounded-xl border border-border"
                          />
                          <button
                            onClick={handleRemoveFile}
                            className="absolute top-2 right-2 p-1.5 bg-background/90 rounded-full hover:bg-background transition-colors"
                          >
                            <X className="h-4 w-4 text-foreground" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl"
                            onClick={() => cameraInputRef.current?.click()}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Camera
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Confirm Payment Button */}
                    <Button 
                      className="w-full h-12 rounded-xl"
                      onClick={handleSubmitProof}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirm Payment
                    </Button>

                    <p className="text-[13px] sm:text-xs text-muted-foreground text-center">
                      {expense.paidBy} will be notified to confirm your payment.
                    </p>
                  </div>
                )}
                {/* SETTLED State - Final locked state */}
                {/* AWAITING CONFIRMATION State - For payer to review and confirm */}
                {currentUserPayment?.status === "settled" && !currentUserPayment?.confirmedByPayer && isPayer && (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex justify-center">
                      <Badge className="px-4 py-2 text-sm bg-blue-500/10 text-blue-600 border-blue-500/30">
                        <Clock className="h-4 w-4 mr-2" />
                        Awaiting Your Confirmation
                      </Badge>
                    </div>

                    {/* Payment Summary Card - Read Only */}
                    <Card className="p-4 border-border/50 bg-muted/30">
                      {currentUserPayment?.payerNote && (
                        <div className="mb-3">
                          <p className="text-[13px] sm:text-xs font-medium text-muted-foreground mb-1">Note</p>
                          <p className="text-[15px] sm:text-sm text-foreground">{currentUserPayment.payerNote}</p>
                        </div>
                      )}
                      {currentUserPayment?.receiptUrl && (
                        <div>
                          <p className="text-[13px] sm:text-xs font-medium text-muted-foreground mb-2">Receipt</p>
                          <img
                            src={currentUserPayment.receiptUrl}
                            alt="Payment receipt"
                            className="w-full h-64 object-contain rounded-xl border border-border"
                          />
                        </div>
                      )}
                    </Card>

                    {/* Confirm Payment Button */}
                    <Button 
                      className="w-full h-12 rounded-xl"
                      onClick={() => {
                        const currentMember = members.find(m => m.name === currentUser);
                        if (currentMember) {
                          handleMarkMemberSettled(currentMember.id);
                        }
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Payment Received
                    </Button>

                    <p className="text-[13px] sm:text-xs text-muted-foreground text-center">
                      Review the receipt and confirm that you have received the payment.
                    </p>
                  </div>
                )}
                
                {/* SETTLED State - Final locked state */}
                {currentUserPayment?.status === "settled" && currentUserPayment?.confirmedByPayer && (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex justify-center">
                      <Badge className="px-4 py-2 text-sm bg-stat-green/10 text-stat-green border-stat-green/30">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Settled
                      </Badge>
                    </div>

                    {/* Payment Summary Card - Read Only */}
                    <Card className="p-4 border-border/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Amount Paid</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatCurrencySpaced(Number(currentUserOwesAmount.toFixed(2)), displayCurrencyCode)}
                        </span>
                      </div>
                      
                      {currentUserPayment.payerNote && (
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">Payment Note</span>
                          <p className="text-sm font-medium text-foreground">{currentUserPayment.payerNote}</p>
                        </div>
                      )}

                      {currentUserPayment.confirmedByPayer ? (
                        <div className="text-xs text-stat-green">
                          Confirmed by {expense.paidBy}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {expense.paidBy} will review and acknowledge your payment
                        </div>
                      )}
                    </Card>

                    {/* Receipt Preview - Locked */}
                    {currentUserPayment.receiptUrl && (
                      <Card className="p-4 border-border/50">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Payment Receipt</h4>
                        <img 
                          src={currentUserPayment.receiptUrl} 
                          alt="Payment receipt" 
                          className="w-full h-64 object-contain rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setShowFullReceipt(true)}
                        />
                      </Card>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                      {currentUserPayment.confirmedByPayer 
                        ? `Payment confirmed by ${expense.paidBy}.`
                        : `Awaiting confirmation from ${expense.paidBy}.`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

        {/* Payment Review Modal */}
        <PaymentReviewModal
          open={!!reviewingPayment}
          onOpenChange={(open) => !open && setReviewingPayment(null)}
          member={reviewingPayment?.member || null}
          amount={reviewingPayment?.amount || 0}
          payment={reviewingPayment?.payment || null}
          onConfirmReceived={handleConfirmFromReview}
          onRemind={handleRemindMember}
          expenseId={expense.id}
          isLoading={isSendingReminder}
          currencyCode={displayCurrencyCode}
        />

        {/* Receipts From Others Modal */}
        <ReceiptsFromOthersModal
          open={showReceiptsModal}
          onOpenChange={setShowReceiptsModal}
          pendingMembers={splitMembers
            .filter(memberId => {
              const member = getMemberById(memberId);
              return member && member.name !== expense.paidBy;
            })
            .map(memberId => {
              const member = getMemberById(memberId)!;
              let amount = equalSplitAmount;
              if (expense.splitType === "custom" && expense.customSplitAmounts) {
                const customAmount = expense.customSplitAmounts.find(c => c.memberId === memberId);
                amount = customAmount?.amount || 0;
              }
              const payment = memberPayments.find(p => p.memberId === memberId);
              return { member, amount, payment };
            })}
          onMarkAsReceived={handleMarkMemberSettled}
          onSendReminder={(memberId, memberName) => {
            toast({
              title: "Reminder sent",
              description: `${memberName} has been notified about their pending payment.`,
            });
          }}
        />

        {/* Full-Screen Receipt Modal */}
        {showFullScreenReceipt && receiptUrl && (
          <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            {/* Header with Back button */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullScreenReceipt(false)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 3}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Full-screen image viewer */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
                <img
                  src={receiptUrl}
                  alt="Receipt full view"
                  className="max-w-full max-h-full rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
