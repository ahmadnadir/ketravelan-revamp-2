import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchModerationReports,
  type ModerationReportRecord,
  updateModerationReportStatus,
} from '@/lib/moderation';

const FILTERS: Array<{ label: string; value: ModerationReportRecord['status'] | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
];

export default function ModerationReports() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [reports, setReports] = useState<ModerationReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('open');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const data = await fetchModerationReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load moderation reports:', error);
      toast.error('Failed to load moderation reports');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(reportId: string, status: ModerationReportRecord['status']) {
    setUpdatingId(reportId);
    try {
      await updateModerationReportStatus(reportId, status, notesById[reportId] || '');
      toast.success(`Report marked ${status.replace('_', ' ')}`);
      await loadReports();
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update report');
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredReports = useMemo(() => {
    if (filter === 'all') return reports;
    return reports.filter((report) => report.status === filter);
  }, [filter, reports]);

  if (!profile?.is_admin) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-md p-6 text-center border-border/50">
            <h1 className="text-lg font-semibold text-foreground">Moderator access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This screen is only available to moderation accounts.
            </p>
            <Button className="mt-4" onClick={() => navigate('/settings')}>
              Back to Settings
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full p-1 transition-colors hover:bg-accent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">Moderation Reports</h1>
          </div>
        </div>

        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={filter === item.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <Card className="p-6 border-border/50">
              <p className="text-sm text-muted-foreground">Loading reports...</p>
            </Card>
          ) : filteredReports.length === 0 ? (
            <Card className="p-6 border-border/50">
              <p className="text-sm text-muted-foreground">No reports in this view.</p>
            </Card>
          ) : (
            filteredReports.map((report) => {
              const reporterName = report.reporter?.full_name || report.reporter?.username || 'Unknown reporter';
              const reportedName = report.reportedUser?.full_name || report.reportedUser?.username || report.reportedUserId || 'Unknown user';
              return (
                <Card key={report.id} className="space-y-4 border-border/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {report.reportType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reported by {reporterName} against {reportedName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground">
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</p>
                    <p className="text-sm text-foreground">{report.reason.replace(/_/g, ' ')}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {report.description || 'No additional details provided.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Moderator Notes
                    </label>
                    <Textarea
                      value={notesById[report.id] || ''}
                      onChange={(event) =>
                        setNotesById((prev) => ({
                          ...prev,
                          [report.id]: event.target.value,
                        }))
                      }
                      placeholder="Add internal notes before resolving or dismissing."
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updatingId === report.id}
                      onClick={() => void handleStatusChange(report.id, 'under_review')}
                    >
                      Under Review
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={updatingId === report.id}
                      onClick={() => void handleStatusChange(report.id, 'resolved')}
                    >
                      Resolve
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={updatingId === report.id}
                      onClick={() => void handleStatusChange(report.id, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}