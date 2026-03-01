import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo } from "react";
import { useExpenses } from "./ExpenseContext";
import { mockMembers, ExpenseData } from "@/data/mockData";

// Types for approvals
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type RequestType = "join_request" | "expense_approval" | "receipt_verification";

export interface JoinRequest {
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

export interface ExpenseApproval {
  id: string;
  type: "expense_approval";
  tripId: string;
  tripTitle: string;
  expenseId: string; // Link to actual expense
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

export interface ReceiptVerification {
  id: string;
  type: "receipt_verification";
  tripId: string;
  tripTitle: string;
  expenseId: string; // Link to actual expense
  expense: {
    title: string;
    amount: number;
    yourShare: number;
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

export type ApprovalItem = JoinRequest | ExpenseApproval | ReceiptVerification;

// Static mock data for join requests (these don't link to expenses)
const staticJoinRequests: JoinRequest[] = [
  {
    id: "jr-1",
    type: "join_request",
    tripId: "1",
    tripTitle: "Langkawi Island Adventure",
    tripImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    tripDate: "Jan 15-18, 2025",
    requester: {
      id: "new-1",
      name: "Marcus Chen",
      imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
      bio: "Adventure seeker from KL, love water sports and hiking",
      tripsCount: 3,
    },
    message: "Hi! I've been wanting to visit Langkawi for ages. Would love to join!",
    requestedAt: "2 hours ago",
    status: "pending",
  },
  {
    id: "jr-2",
    type: "join_request",
    tripId: "1",
    tripTitle: "Langkawi Island Adventure",
    tripImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    tripDate: "Jan 15-18, 2025",
    requester: {
      id: "new-2",
      name: "Mei Ling",
      imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      bio: "Solo traveler, photographer, beach lover",
      tripsCount: 7,
    },
    message: "I can help with photography and know great hidden spots!",
    requestedAt: "5 hours ago",
    status: "pending",
  },
];

// Action types for join requests only (expense approvals are derived from expense context)
type ApprovalsAction =
  | { type: "UPDATE_JOIN_REQUEST_STATUS"; payload: { id: string; status: ApprovalStatus } }
  | { type: "UPDATE_EXPENSE_APPROVAL_STATUS"; payload: { expenseId: string; memberId: string; status: ApprovalStatus } };

// State only stores join request statuses and expense approval overrides
interface ApprovalsState {
  joinRequestStatuses: Record<string, ApprovalStatus>;
  // Track which expense approvals have been acknowledged by user
  acknowledgedExpenses: Record<string, ApprovalStatus>; // key = `${expenseId}-${memberId}`
}

function approvalsReducer(state: ApprovalsState, action: ApprovalsAction): ApprovalsState {
  switch (action.type) {
    case "UPDATE_JOIN_REQUEST_STATUS":
      return {
        ...state,
        joinRequestStatuses: {
          ...state.joinRequestStatuses,
          [action.payload.id]: action.payload.status,
        },
      };
    
    case "UPDATE_EXPENSE_APPROVAL_STATUS": {
      const key = `${action.payload.expenseId}-${action.payload.memberId}`;
      return {
        ...state,
        acknowledgedExpenses: {
          ...state.acknowledgedExpenses,
          [key]: action.payload.status,
        },
      };
    }
    
    default:
      return state;
  }
}

// Context type
interface ApprovalsContextType {
  approvals: ApprovalItem[];
  pendingCount: number;
  approveJoinRequest: (id: string) => void;
  rejectJoinRequest: (id: string) => void;
  acknowledgeExpense: (expenseId: string, memberId: string) => void;
  disputeExpense: (expenseId: string, memberId: string) => void;
  confirmReceipt: (expenseId: string, memberId: string) => void;
  rejectReceipt: (expenseId: string, memberId: string) => void;
  getApprovalStatus: (id: string) => ApprovalStatus;
}

const ApprovalsContext = createContext<ApprovalsContextType | undefined>(undefined);

// Current user ID (would come from auth in real app)
const CURRENT_USER_ID = "1";

// Provider component
export function ApprovalsProvider({ children }: { children: ReactNode }) {
  const { expenses, updatePaymentStatus } = useExpenses();
  
  const [state, dispatch] = useReducer(approvalsReducer, {
    joinRequestStatuses: {},
    acknowledgedExpenses: {},
  });

  // Generate expense approvals from pending expenses where current user owes money
  const expenseApprovals = useMemo((): ExpenseApproval[] => {
    const approvals: ExpenseApproval[] = [];
    
    expenses.forEach(expense => {
      // Check if current user has a pending payment for this expense
      const userPayment = expense.payments?.find(p => p.memberId === CURRENT_USER_ID);
      const payer = mockMembers.find(m => m.name === expense.paidBy);
      
      // Only show if user is in the split, has pending payment, and is not the payer
      if (userPayment && payer && payer.id !== CURRENT_USER_ID) {
        const approvalKey = `${expense.id}-${CURRENT_USER_ID}`;
        const overrideStatus = state.acknowledgedExpenses[approvalKey];
        
        // Determine status: settled payments = approved, acknowledged = approved, else pending
        let status: ApprovalStatus = "pending";
        if (userPayment.status === "settled") {
          status = "approved";
        } else if (overrideStatus) {
          status = overrideStatus;
        }
        
        approvals.push({
          id: `ea-${expense.id}`,
          type: "expense_approval",
          tripId: "1",
          tripTitle: "Langkawi Island Adventure",
          expenseId: expense.id,
          expense: {
            title: expense.title,
            amount: expense.amount,
            category: expense.category,
            paidBy: expense.paidBy,
            paidByImage: payer?.imageUrl,
          },
          requestedAt: expense.date,
          status,
        });
      }
    });
    
    return approvals;
  }, [expenses, state.acknowledgedExpenses]);

  // Generate receipt verifications for receipts submitted to current user
  const receiptVerifications = useMemo((): ReceiptVerification[] => {
    const verifications: ReceiptVerification[] = [];
    
    expenses.forEach(expense => {
      const payer = mockMembers.find(m => m.name === expense.paidBy);
      
      // Only if current user is the payer
      if (payer?.id === CURRENT_USER_ID) {
        expense.payments?.forEach(payment => {
          // Check if someone submitted a receipt
          if (payment.receiptUrl && payment.memberId !== CURRENT_USER_ID) {
            const member = mockMembers.find(m => m.id === payment.memberId);
            if (member) {
              const shareAmount = expense.splitType === "custom" 
                ? expense.customSplitAmounts?.find(c => c.memberId === payment.memberId)?.amount || 0
                : expense.amount / expense.splitWith.length;
              
              verifications.push({
                id: `rv-${expense.id}-${payment.memberId}`,
                type: "receipt_verification",
                tripId: "1",
                tripTitle: "Langkawi Island Adventure",
                expenseId: expense.id,
                expense: {
                  title: expense.title,
                  amount: expense.amount,
                  yourShare: shareAmount,
                },
                submittedBy: {
                  id: member.id,
                  name: member.name,
                  imageUrl: member.imageUrl,
                },
                receiptUrl: payment.receiptUrl,
                note: payment.payerNote,
                submittedAt: payment.uploadedAt || "Just now",
                status: payment.status === "settled" ? "approved" : "pending",
              });
            }
          }
        });
      }
    });
    
    return verifications;
  }, [expenses]);

  // Combine all approvals with status overrides
  const approvals = useMemo((): ApprovalItem[] => {
    const joinRequests = staticJoinRequests.map(jr => ({
      ...jr,
      status: state.joinRequestStatuses[jr.id] || jr.status,
    }));
    
    return [...joinRequests, ...expenseApprovals, ...receiptVerifications];
  }, [expenseApprovals, receiptVerifications, state.joinRequestStatuses]);

  const pendingCount = useMemo(() => {
    return approvals.filter(a => a.status === "pending").length;
  }, [approvals]);

  const approveJoinRequest = useCallback((id: string) => {
    dispatch({ type: "UPDATE_JOIN_REQUEST_STATUS", payload: { id, status: "approved" } });
  }, []);

  const rejectJoinRequest = useCallback((id: string) => {
    dispatch({ type: "UPDATE_JOIN_REQUEST_STATUS", payload: { id, status: "rejected" } });
  }, []);

  const acknowledgeExpense = useCallback((expenseId: string, memberId: string) => {
    // Mark as acknowledged in approvals
    dispatch({ 
      type: "UPDATE_EXPENSE_APPROVAL_STATUS", 
      payload: { expenseId, memberId, status: "approved" } 
    });
    // This doesn't settle the payment - just acknowledges the expense was added
  }, []);

  const disputeExpense = useCallback((expenseId: string, memberId: string) => {
    dispatch({ 
      type: "UPDATE_EXPENSE_APPROVAL_STATUS", 
      payload: { expenseId, memberId, status: "rejected" } 
    });
  }, []);

  const confirmReceipt = useCallback((expenseId: string, memberId: string) => {
    // Mark payment as settled in expense context
    updatePaymentStatus(expenseId, memberId, "settled");
  }, [updatePaymentStatus]);

  const rejectReceipt = useCallback((_expenseId: string, _memberId: string) => {
    // Keep payment as pending but could add a "rejected receipt" status
    // For now, just stays pending - no action needed
  }, []);

  const getApprovalStatus = useCallback((id: string): ApprovalStatus => {
    const approval = approvals.find(a => a.id === id);
    return approval?.status || "pending";
  }, [approvals]);

  const value: ApprovalsContextType = {
    approvals,
    pendingCount,
    approveJoinRequest,
    rejectJoinRequest,
    acknowledgeExpense,
    disputeExpense,
    confirmReceipt,
    rejectReceipt,
    getApprovalStatus,
  };

  return (
    <ApprovalsContext.Provider value={value}>
      {children}
    </ApprovalsContext.Provider>
  );
}

// Hook to use approvals context
export function useApprovals() {
  const context = useContext(ApprovalsContext);
  if (context === undefined) {
    throw new Error("useApprovals must be used within an ApprovalsProvider");
  }
  return context;
}
