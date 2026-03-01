import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseTitle: string;
  expenseAmount: number;
  onConfirm: () => void;
}

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expenseTitle,
  expenseAmount,
  onConfirm,
}: DeleteExpenseDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this expense?</p>
            <div className="bg-secondary/50 rounded-lg p-3 mt-2">
              <p className="font-medium text-foreground">{expenseTitle}</p>
              <p className="text-sm text-muted-foreground">RM {expenseAmount.toFixed(2)}</p>
            </div>
            <p className="text-sm text-destructive">
              This action cannot be undone. All split calculations will be updated.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Expense
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
