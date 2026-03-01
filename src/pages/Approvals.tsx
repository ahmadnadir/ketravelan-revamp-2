/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  UserPlus,
  Check,
  X,
  Clock,
  MapPin,
  Calendar,
  Receipt,
  ChevronRight,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchAllJoinRequestsForUser, approveJoinRequest, rejectJoinRequest, fetchTripInvitesForUser, acceptTripInvite, rejectTripInvite } from "@/lib/trips";
import { approveReceipt, fetchPendingReceiptApprovalsForUser, markParticipantsAsPaid, rejectReceipt } from "@/lib/expenses";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CurrencyCode, getCurrencySymbol } from "@/lib/currencyUtils";

// Types for approvals
type ApprovalStatus = "pending" | "approved" | "rejected";
type RequestType = "join_request" | "expense_approval" | "receipt_verification" | "trip_invite";

interface JoinRequest {
  id: string;
  type: "join_request";
  tripId: string;
  tripTitle: string;
  tripImage: string;
  tripDate: string;
  requester: {
    id: string;
    name: string;
    imageUrl?: string;
    bio?: string;
    tripsCount: number;
  };
  message?: string;
  requestedAt: string;
  status: ApprovalStatus;
}

interface ExpenseApproval {
  id: string;
  type: "expense_approval";
  tripId: string;
  tripTitle: string;
  expense: {
    title: string;
    amount: number;
    category: string;
    paidBy: string;
    paidByImage?: string;
  };
  requestedAt: string;
  status: ApprovalStatus;
}

interface ReceiptVerification {
  id: string;
  type: "receipt_verification";
  expenseId: string;
  tripId: string;
  tripTitle: string;
  expense: {
    title: string;
    amount: number;
    yourShare: number;
    currency?: string;
    homeCurrency?: string;
    convertedAmountHome?: number;
    yourShareHome?: number;
  };
  submittedBy: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  receiptUrl: string;
  note?: string;
  submittedAt: string;
  status: ApprovalStatus;
}

interface TripInvite {
  id: string;
  type: "trip_invite";
  tripId: string;
  tripTitle: string;
  tripImage: string;
  tripDate: string;
  inviter: {
    id: string;
    name: string;
    imageUrl?: string;
    bio?: string;
  };
  requestedAt: string;
  status: ApprovalStatus;
}

type ApprovalItem = JoinRequest | ExpenseApproval | ReceiptVerification | TripInvite;

const segmentOptions = [
  { value: "pending", label: "Pending" },
  { value: "history", label: "History" },
];

export default function Approvals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSegment, setActiveSegment] = useState("pending");
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAvatarUrl = (name?: string, imageUrl?: string) => {
    const trimmed = String(imageUrl || "").trim();
    if (trimmed) return trimmed;
    const seed = encodeURIComponent((name || "user").trim() || "user");
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}`;
  };

  const loadApprovals = useCallback(async () => {
    try {
      setIsLoading(true);
      const [requests, receiptApprovals, tripInvites] = await Promise.all([
        fetchAllJoinRequestsForUser(),
        fetchPendingReceiptApprovalsForUser(),
        fetchTripInvitesForUser(),
      ]);

      const transformedRequests: JoinRequest[] = requests.map((req: any) => ({
        id: req.id,
        type: "join_request" as const,
        tripId: req.trip?.id || '',
        tripTitle: req.trip?.title || '',
        tripImage: req.trip?.cover_image || '',
        tripDate: req.trip?.start_date && req.trip?.end_date
          ? `${format(new Date(req.trip.start_date), 'MMM d')}-${format(new Date(req.trip.end_date), 'd, yyyy')}`
          : 'Date TBD',
        requester: {
          id: req.user?.id || '',
          name: req.user?.full_name || req.user?.username || 'Unknown',
          imageUrl: req.user?.avatar_url,
          bio: req.user?.bio,
          tripsCount: req.user?.tripsCount || 0,
        },
        message: req.message,
        requestedAt: formatRelativeTime(req.created_at),
        status: req.status as ApprovalStatus,
      }));

      const transformedReceipts: ReceiptVerification[] = (receiptApprovals || []).map((item: any) => {
        const trip = item.expense?.trip;
        const submittedByName = item.participant_profile?.full_name || item.participant_profile?.username || "Unknown";
        const expenseAmount = Number(item.expense?.amount || 0);
        const participantShare = Number(item.participant_share || 0);
        const convertedAmountHome = Number(item.expense?.converted_amount_home ?? 0);
        const hasConversion = convertedAmountHome > 0 && expenseAmount > 0;
        const yourShareHome = hasConversion
          ? (participantShare * (convertedAmountHome / expenseAmount))
          : undefined;
        return {
          id: item.id,
          type: "receipt_verification" as const,
          expenseId: item.expense_id || "",
          tripId: item.expense?.trip_id || "",
          tripTitle: trip?.title || "",
          expense: {
            title: item.expense?.description || "Expense",
            amount: expenseAmount,
            yourShare: participantShare,
            currency: item.expense?.currency || undefined,
            homeCurrency: item.expense?.home_currency || undefined,
            convertedAmountHome: hasConversion ? convertedAmountHome : undefined,
            yourShareHome,
          },
          submittedBy: {
            id: item.participant_id || "",
            name: submittedByName,
            imageUrl: item.participant_profile?.avatar_url,
          },
          receiptUrl: item.receipt_url,
          note: item.description || undefined,
          submittedAt: formatRelativeTime(item.created_at),
          status: item.status as ApprovalStatus,
        };
      });

      const transformedInvites: TripInvite[] = (tripInvites || []).map((invite: any) => ({
        id: invite.id,
        type: "trip_invite" as const,
        tripId: invite.trip?.id || '',
        tripTitle: invite.trip?.title || '',
        tripImage: invite.trip?.cover_image || '',
        tripDate: invite.trip?.start_date && invite.trip?.end_date
          ? `${format(new Date(invite.trip.start_date), 'MMM d')}-${format(new Date(invite.trip.end_date), 'd, yyyy')}`
          : 'Date TBD',
        inviter: {
          id: invite.inviter?.id || '',
          name: invite.inviter?.full_name || invite.inviter?.username || 'Unknown',
          imageUrl: invite.inviter?.avatar_url,
          bio: invite.inviter?.bio,
        },
        requestedAt: formatRelativeTime(invite.created_at),
        status: invite.status as ApprovalStatus,
      }));

      setApprovals([...transformedRequests, ...transformedReceipts, ...transformedInvites]);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      toast({
        title: "Failed to load requests",
        description: "Could not load approvals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return format(date, 'MMM d, yyyy');
  };

  const filteredApprovals = useMemo(() => {
    if (activeSegment === "pending") {
      return approvals.filter((item) => item.status === "pending");
    }
    return approvals.filter((item) => item.status !== "pending");
  }, [approvals, activeSegment]);

  const pendingCount = useMemo(() => {
    return approvals.filter((item) => item.status === "pending").length;
  }, [approvals]);

  const handleApprove = async (id: string) => {
    try {
      await approveJoinRequest(id);

      setApprovals((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "approved" as ApprovalStatus } : item
        )
      );

      toast({
        title: "Request approved",
        description: "The user has been added to the trip.",
      });
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast({
        title: "Failed to approve",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectJoinRequest(id);

      setApprovals((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "rejected" as ApprovalStatus } : item
        )
      );

      toast({
        title: "Request declined",
        description: "The join request has been declined.",
      });
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast({
        title: "Failed to decline",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Unified handlers to match new UI API while preserving existing integrations
  const handleApproveItem = async (item: ApprovalItem) => {
    switch (item.type) {
      case "join_request":
        await handleApprove(item.id);
        break;
      case "expense_approval": {
        // Placeholder: mark as approved locally; integrate API when available
        setApprovals((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "approved" as ApprovalStatus } : i))
        );
        toast({ title: "Expense acknowledged", description: "Marked as acknowledged." });
        break;
      }
      case "receipt_verification": {
        await approveReceipt(item.id);
        if (item.expenseId) {
          await markParticipantsAsPaid([item.expenseId], item.submittedBy.id);
        }
        setApprovals((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "approved" as ApprovalStatus } : i))
        );
        toast({ title: "Receipt confirmed", description: "Payment has been confirmed." });
        break;
      }
      case "trip_invite": {
        await acceptTripInvite(item.id);
        setApprovals((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "approved" as ApprovalStatus } : i))
        );
        toast({ title: "Invite accepted", description: "You have joined the trip." });
        break;
      }
    }
  };

  const handleRejectItem = async (item: ApprovalItem) => {
    switch (item.type) {
      case "join_request":
        await handleReject(item.id);
        break;
      case "expense_approval": {
        // Placeholder: mark as rejected locally; integrate API when available
        setApprovals((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "rejected" as ApprovalStatus } : i))
        );
        toast({ title: "Expense disputed", description: "Marked as disputed." });
        break;
      }
      case "receipt_verification": {
        await rejectReceipt(item.id, "Rejected in approvals");
        setApprovals((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "rejected" as ApprovalStatus } : i))
        );
        toast({ title: "Receipt rejected", description: "Receipt has been rejected." });
        break;
      }
      case "trip_invite": {
        await rejectTripInvite(item.id);
        setApprovals((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "rejected" as ApprovalStatus } : i))
        );
        toast({ title: "Invite declined", description: "The invite has been declined." });
        break;
      }
    }
  };

  const getTypeIcon = (type: RequestType) => {
    switch (type) {
      case "join_request":
        return <UserPlus className="h-4 w-4" />;
      case "expense_approval":
        return <Receipt className="h-4 w-4" />;
      case "receipt_verification":
        return <FileText className="h-4 w-4" />;
      case "trip_invite":
        return <Users className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: RequestType) => {
    switch (type) {
      case "join_request":
        return "Join Request";
      case "expense_approval":
        return "Expense Added";
      case "receipt_verification":
        return "Receipt Submitted";
      case "trip_invite":
        return "Trip Invite";
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-stat-green/10 text-stat-green border-0 text-xs">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const renderJoinRequest = (item: JoinRequest) => (
    <Card key={item.id} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {getTypeIcon(item.type)}
          <span>{getTypeLabel(item.type)}</span>
          <span>•</span>
          <span>{item.requestedAt}</span>
        </div>
        {item.status !== "pending" && getStatusBadge(item.status)}
      </div>

      {/* Trip Info */}
      <div 
        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
        onClick={() => navigate(`/trip/${item.tripId}`)}
      >
        <img 
          src={item.tripImage} 
          alt={item.tripTitle}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{item.tripTitle}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{item.tripDate}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Requester Info */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarUrl(item.requester.name, item.requester.imageUrl)} />
          <AvatarFallback>{item.requester.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{item.requester.name}</p>
            <Badge variant="secondary" className="text-xs">
              {item.requester.tripsCount} trips
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{item.requester.bio}</p>
        </div>
      </div>

      {/* Message */}
      {item.message && (
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-sm text-foreground">{item.message}</p>
        </div>
      )}

      {/* Actions */}
      {item.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleRejectItem(item)}
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleApproveItem(item)}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </div>
      )}
    </Card>
  );

  const renderTripInvite = (item: TripInvite) => (
    <Card key={item.id} className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {getTypeIcon(item.type)}
          <span>{getTypeLabel(item.type)}</span>
          <span>•</span>
          <span>{item.requestedAt}</span>
        </div>
        {item.status !== "pending" && getStatusBadge(item.status)}
      </div>

      <div
        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
        onClick={() => navigate(`/trip/${item.tripId}`)}
      >
        <img
          src={item.tripImage}
          alt={item.tripTitle}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{item.tripTitle}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{item.tripDate}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarUrl(item.inviter.name, item.inviter.imageUrl)} />
          <AvatarFallback>{item.inviter.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{item.inviter.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">Invited you to join this trip</p>
        </div>
      </div>

      {item.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleRejectItem(item)}
          >
            <X className="h-4 w-4 mr-1" />
            Decline
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleApproveItem(item)}
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
        </div>
      )}
    </Card>
  );

  const renderExpenseApproval = (item: ExpenseApproval) => (
    <Card key={item.id} className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {getTypeIcon(item.type)}
          <span>{getTypeLabel(item.type)}</span>
          <span>•</span>
          <span>{item.requestedAt}</span>
        </div>
        {item.status !== "pending" && getStatusBadge(item.status)}
      </div>

      {/* Trip context */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span>{item.tripTitle}</span>
      </div>

      {/* Expense Info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarUrl(item.expense.paidBy, item.expense.paidByImage)} />
          <AvatarFallback>{item.expense.paidBy.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{item.expense.title}</p>
          <p className="text-xs text-muted-foreground">
            Paid by {item.expense.paidBy} • {item.expense.category}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm">RM {item.expense.amount}</p>
        </div>
      </div>

      {/* Actions */}
      {item.status === "pending" && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleRejectItem(item)}
          >
            <X className="h-4 w-4 mr-1" />
            Dispute
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleApproveItem(item)}
          >
            <Check className="h-4 w-4 mr-1" />
            Acknowledge
          </Button>
        </div>
      )}
    </Card>
  );

  const renderReceiptVerification = (item: ReceiptVerification) => {
    const displayCurrency = (item.expense.homeCurrency || item.expense.currency || "MYR") as CurrencyCode;
    const displayAmount = item.expense.yourShareHome ?? item.expense.yourShare;

    return (
      <Card key={item.id} className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {getTypeIcon(item.type)}
            <span>{getTypeLabel(item.type)}</span>
            <span>•</span>
            <span>{item.submittedAt}</span>
          </div>
          {item.status !== "pending" && getStatusBadge(item.status)}
        </div>

        {/* Trip context */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{item.tripTitle}</span>
        </div>

        {/* Expense & Submitter Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getAvatarUrl(item.submittedBy.name, item.submittedBy.imageUrl)} />
            <AvatarFallback>{item.submittedBy.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{item.submittedBy.name}</p>
            <p className="text-xs text-muted-foreground">
              Paid {getCurrencySymbol(displayCurrency)} {displayAmount.toFixed(2)} for "{item.expense.title}"
            </p>
          </div>
        </div>

        {/* Receipt Preview & Note */}
        <div className="flex gap-3">
          <img
            src={item.receiptUrl}
            alt="Receipt"
            className="w-16 h-20 rounded-lg object-cover border border-border"
          />
          {item.note && (
            <div className="flex-1 bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Note:</p>
              <p className="text-sm text-foreground">{item.note}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {item.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleRejectItem(item)}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => handleApproveItem(item)}
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm Payment
            </Button>
          </div>
        )}
      </Card>
    );
  };

  const renderApprovalItem = (item: ApprovalItem) => {
    switch (item.type) {
      case "join_request":
        return renderJoinRequest(item);
      case "expense_approval":
        return renderExpenseApproval(item);
      case "receipt_verification":
        return renderReceiptVerification(item);
      case "trip_invite":
        return renderTripInvite(item);
    }
  };

  return (
    <AppLayout>
      <div className="py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Approvals & Requests</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0 
              ? `You have ${pendingCount} pending item${pendingCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>

        {/* Segment Control */}
        <SegmentedControl
          options={segmentOptions}
          value={activeSegment}
          onChange={setActiveSegment}
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Clock className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
            <p className="text-muted-foreground text-sm">Loading requests...</p>
          </div>
        ) : (
          <>
            {/* Approval Items */}
            {filteredApprovals.length > 0 ? (
          <div className="space-y-4">
            {filteredApprovals.map(renderApprovalItem)}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              {activeSegment === "pending" ? (
                <Check className="h-8 w-8 text-stat-green" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {activeSegment === "pending" 
                ? "All caught up!" 
                : "No history yet"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {activeSegment === "pending"
                ? "You have no pending approvals or requests to review."
                : "Your approved and rejected items will appear here."}
            </p>
          </div>
        )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
