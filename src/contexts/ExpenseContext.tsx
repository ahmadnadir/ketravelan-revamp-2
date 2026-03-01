import React, { createContext, useContext, useReducer, ReactNode, useCallback } from "react";
import { mockExpenses as initialMockExpenses, ExpenseData, ExpensePayment } from "@/data/mockData";

// Action types
type ExpenseAction =
  | { type: "ADD_EXPENSE"; payload: ExpenseData }
  | { type: "UPDATE_EXPENSE"; payload: ExpenseData }
  | { type: "DELETE_EXPENSE"; payload: string }
  | { type: "UPDATE_PAYMENT_STATUS"; payload: { expenseId: string; memberId: string; status: ExpensePayment["status"]; receiptUrl?: string; payerNote?: string } }
  | { type: "SET_EXPENSES"; payload: ExpenseData[] };

// Reducer function
function expenseReducer(state: ExpenseData[], action: ExpenseAction): ExpenseData[] {
  switch (action.type) {
    case "ADD_EXPENSE":
      return [...state, action.payload];
    
    case "UPDATE_EXPENSE":
      return state.map(exp => 
        exp.id === action.payload.id ? action.payload : exp
      );
    
    case "DELETE_EXPENSE":
      return state.filter(exp => exp.id !== action.payload);
    
    case "UPDATE_PAYMENT_STATUS": {
      const { expenseId, memberId, status, receiptUrl, payerNote } = action.payload;
      return state.map(exp => {
        if (exp.id !== expenseId) return exp;
        
        const updatedPayments = exp.payments?.map(payment => {
          if (payment.memberId !== memberId) return payment;
          return {
            ...payment,
            status,
            ...(receiptUrl && { receiptUrl }),
            ...(payerNote && { payerNote }),
            ...(receiptUrl && { uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }),
          };
        }) || [];
        
        // Recalculate payment progress
        const settledCount = updatedPayments.filter(p => p.status === "settled").length;
        const totalCount = updatedPayments.length;
        const paymentProgress = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;
        
        return {
          ...exp,
          payments: updatedPayments,
          paymentProgress,
        };
      });
    }
    
    case "SET_EXPENSES":
      return action.payload;
    
    default:
      return state;
  }
}

// Context type
interface ExpenseContextType {
  expenses: ExpenseData[];
  addExpense: (expense: ExpenseData) => void;
  updateExpense: (expense: ExpenseData) => void;
  deleteExpense: (expenseId: string) => void;
  updatePaymentStatus: (expenseId: string, memberId: string, status: ExpensePayment["status"], receiptUrl?: string, payerNote?: string) => void;
  getExpenseById: (expenseId: string) => ExpenseData | undefined;
  getExpensesForTrip: (tripId: string) => ExpenseData[];
  getPendingExpensesForUser: (userId: string) => ExpenseData[];
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

// Provider component
export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, dispatch] = useReducer(expenseReducer, initialMockExpenses);

  const addExpense = useCallback((expense: ExpenseData) => {
    dispatch({ type: "ADD_EXPENSE", payload: expense });
  }, []);

  const updateExpense = useCallback((expense: ExpenseData) => {
    dispatch({ type: "UPDATE_EXPENSE", payload: expense });
  }, []);

  const deleteExpense = useCallback((expenseId: string) => {
    dispatch({ type: "DELETE_EXPENSE", payload: expenseId });
  }, []);

  const updatePaymentStatus = useCallback((
    expenseId: string, 
    memberId: string, 
    status: ExpensePayment["status"],
    receiptUrl?: string,
    payerNote?: string
  ) => {
    dispatch({ 
      type: "UPDATE_PAYMENT_STATUS", 
      payload: { expenseId, memberId, status, receiptUrl, payerNote } 
    });
  }, []);

  const getExpenseById = useCallback((expenseId: string) => {
    return expenses.find(exp => exp.id === expenseId);
  }, [expenses]);

  const getExpensesForTrip = useCallback((tripId: string) => {
    // For now, all expenses belong to trip "1" (Langkawi)
    // In a real app, expenses would have a tripId field
    return expenses;
  }, [expenses]);

  const getPendingExpensesForUser = useCallback((userId: string) => {
    return expenses.filter(exp => {
      // Find expenses where this user has a pending payment
      const userPayment = exp.payments?.find(p => p.memberId === userId);
      return userPayment?.status === "pending";
    });
  }, [expenses]);

  const value: ExpenseContextType = {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    updatePaymentStatus,
    getExpenseById,
    getExpensesForTrip,
    getPendingExpensesForUser,
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}

// Hook to use expense context
export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error("useExpenses must be used within an ExpenseProvider");
  }
  return context;
}
