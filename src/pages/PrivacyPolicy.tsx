import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { fetchPolicy, type Policy } from "@/lib/policies";
import { useAuth } from "@/contexts/AuthContext";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPolicy = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPolicy("privacy");
        if (data) {
          setPolicy(data);
        } else {
          setError("Failed to load privacy policy");
        }
      } catch (err) {
        setError("Error loading privacy policy");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, []);

  return (
    <AppLayout>
      {/* Page Header with Back Button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(isAuthenticated ? "/settings" : "/")}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : policy ? (
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-headings:font-bold prose-p:text-muted-foreground prose-ul:text-muted-foreground prose-li:text-muted-foreground">
          <div
            dangerouslySetInnerHTML={{ __html: policy.content_html }}
            className="space-y-4"
          />
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(policy.last_updated).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Privacy policy not found</p>
        </div>
      )}
    </AppLayout>
  );
}
