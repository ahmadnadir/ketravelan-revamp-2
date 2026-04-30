import { useState } from "react";
import { BellRing, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  debugNotificationPermissions,
  forceRefreshNotificationPermissions,
  getNotificationSettingsInstructions,
} from "@/lib/pushNotifications";

export function NotificationDebugHelper() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");

  const handleRefreshPermissions = async () => {
    setLoading(true);
    try {
      const refreshResult = await forceRefreshNotificationPermissions();
      const debugResult = await debugNotificationPermissions();
      setStatus(
        JSON.stringify(
          {
            refreshResult,
            debugResult,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleShowInstructions = async () => {
    try {
      const text = await getNotificationSettingsInstructions();
      setInstructions(text);
    } catch (err) {
      setInstructions(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Card className="overflow-hidden border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-base">Notification Debug</CardTitle>
        </div>
        <CardDescription>
          Use this to re-request permissions and inspect the current push notification state on device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleRefreshPermissions} disabled={loading} className="sm:flex-1">
            <RefreshCw className="h-4 w-4" />
            {loading ? "Checking..." : "Refresh Permissions"}
          </Button>
          <Button onClick={handleShowInstructions} variant="outline" className="sm:flex-1">
            <Wrench className="h-4 w-4" />
            Show Manual Fix
          </Button>
        </div>

        {status ? (
          <pre className="overflow-x-auto rounded-md bg-background/80 p-3 text-xs leading-5 text-foreground">
            {status}
          </pre>
        ) : null}

        {instructions ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-background/80 p-3 text-xs leading-5 text-foreground">
            {instructions}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}