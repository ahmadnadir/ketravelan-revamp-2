import { useState } from 'react';
import { Ban, Flag, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import {
  REPORT_REASON_OPTIONS,
  type ReportReasonValue,
  type ReportType,
  blockUserViaApi,
  submitReport,
} from '@/lib/moderation';

interface ModerationMenuProps {
  reportType: ReportType;
  targetId: string;
  reportedUserId: string;
  targetLabel: string;
  reportLabel?: string;
  blockLabel?: string;
  align?: 'start' | 'end' | 'center';
  trigger?: React.ReactNode;
  onAfterBlock?: () => void;
  onAfterReport?: () => void;
}

export function ModerationMenu({
  reportType,
  targetId,
  reportedUserId,
  targetLabel,
  reportLabel,
  blockLabel = 'Block User',
  align = 'end',
  trigger,
  onAfterBlock,
  onAfterReport,
}: ModerationMenuProps) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmReportOpen, setConfirmReportOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reason, setReason] = useState<ReportReasonValue | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const canBlock = Boolean(user?.id && reportedUserId && user.id !== reportedUserId);

  const resetReportState = () => {
    setReason('');
    setDescription('');
    setConfirmReportOpen(false);
  };

  const handleSubmitReport = async () => {
    if (!reason) return;

    setIsSubmitting(true);
    try {
      await submitReport({
        reportType,
        targetId,
        reportedUserId,
        reason,
        description,
      });
      toast.success('Thank you. This report has been submitted.');
      setReportOpen(false);
      resetReportState();
      onAfterReport?.();
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!canBlock) return;

    setIsBlocking(true);
    try {
      await blockUserViaApi(reportedUserId);
      toast.success('User blocked. Future interaction has been limited.');
      setConfirmBlockOpen(false);
      onAfterBlock?.();
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to block user.');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={`${targetLabel} actions`}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem
            onSelect={(event) => {
              event.stopPropagation();
              setReportOpen(true);
            }}
          >
            <Flag className="mr-2 h-4 w-4" />
            {reportLabel || `Report ${targetLabel}`}
          </DropdownMenuItem>
          {canBlock && (
            <DropdownMenuItem
              onSelect={(event) => {
                event.stopPropagation();
                setConfirmBlockOpen(true);
              }}
            >
              <Ban className="mr-2 h-4 w-4" />
              {blockLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) {
            resetReportState();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reportLabel || `Report ${targetLabel}`}</DialogTitle>
            <DialogDescription>
              Help us keep the community safe by choosing a reason for this report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Reason</Label>
              <RadioGroup value={reason} onValueChange={(value) => setReason(value as ReportReasonValue)}>
                {REPORT_REASON_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`report-${targetId}-${option.value}`}
                    className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <RadioGroupItem value={option.value} id={`report-${targetId}-${option.value}`} />
                    <span className="text-sm text-foreground">{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`report-description-${targetId}`}>Additional details</Label>
              <Textarea
                id={`report-description-${targetId}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context for moderators if needed."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => setConfirmReportOpen(true)} disabled={!reason || isSubmitting}>
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReportOpen} onOpenChange={setConfirmReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to report this content?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={() => void handleSubmitReport()}>
              {isSubmitting ? 'Submitting...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocking prevents future messaging and interaction between both accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBlocking}
              onClick={() => void handleBlockUser()}
            >
              {isBlocking ? 'Blocking...' : 'Block User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}