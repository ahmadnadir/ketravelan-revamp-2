import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Loader2, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchHelpArticle, type HelpArticle } from "@/lib/help";
import { SEOHead } from "@/components/seo/SEOHead";

export default function HelpArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const loadArticle = async () => {
      setIsLoading(true);
      setError(false);
      const data = await fetchHelpArticle(slug);
      if (data) {
        setArticle(data);
      } else {
        setError(true);
      }
      setIsLoading(false);
    };

    loadArticle();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <>
        <SEOHead 
          title="Article Not Found | Ketravelan" 
          description="This help article could not be found."
        />
        <div className="min-h-dvh bg-background">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Article Not Found</h1>
              <p className="text-muted-foreground">
                This help article doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate("/help-center")}>
                Back to Help Center
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const formattedDate = new Date(article.updated_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <SEOHead
        title={`${article.title} | Help Center`}
        description={article.excerpt || `Learn about ${article.title.toLowerCase()} on Ketravelan.`}
      />

      <div className="app-shell bg-white">
        <div className="app-shell-top">
          <header className="h-full bg-white/95 backdrop-blur-sm border-b border-border/50 safe-x">
            <div className="h-[var(--safe-top)]" />
            <div className="max-w-3xl mx-auto px-4 h-[var(--header-height)] flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/help-center")}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">
                  <Link to="/help-center" className="hover:underline">
                    Help Center
                  </Link>
                  {" / "}
                  {article.category}
                </div>
                <h1 className="text-base font-semibold truncate">{article.title}</h1>
              </div>
            </div>
          </header>
        </div>

        <div className="app-shell-content" style={{ paddingTop: "var(--header-total-height)", paddingBottom: "1rem" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <article className="space-y-8 sm:space-y-10">
            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Updated {formattedDate}</span>
              </div>
            </div>

            {/* Article Content */}
            <div className="rounded-2xl bg-muted/40 border-2 border-border/60 p-5 sm:p-7">
              <div
                className="prose prose-sm sm:prose-base max-w-none
                  prose-headings:font-semibold prose-headings:text-foreground prose-headings:tracking-tight
                  prose-headings:mt-12 prose-headings:mb-4
                  prose-h3:text-base sm:prose-h3:text-lg
                  prose-p:text-sm sm:prose-p:text-base prose-p:text-muted-foreground prose-p:leading-7 sm:prose-p:leading-5
                  prose-p:mt-0 prose-p:mb-5 sm:prose-p:mb-5 prose-p:[word-spacing:0.02em]
                  [&>p:empty]:h-2 sm:[&>p:empty]:my-2
                  prose-ul:text-sm sm:prose-ul:text-base prose-ul:text-muted-foreground prose-ul:my-5
                  prose-ol:text-sm sm:prose-ol:text-base prose-ol:text-muted-foreground prose-ol:my-5
                  prose-li:my-2 sm:prose-li:my-2.5
                  prose-strong:text-foreground prose-strong:font-semibold
                  dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: article.content_html }}
              />
            </div>

            {/* Help Footer */}
            <div className="pt-8 mt-8 border-t-2 border-border/60">
              <div className="bg-white rounded-xl p-6 text-center space-y-3 border-2 border-border/60">
                <p className="text-sm font-medium">Still need help?</p>
                <p className="text-xs text-muted-foreground">
                  Can't find what you're looking for? Send us feedback and we'll help you out.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/feedback")}
                  className="rounded-full"
                >
                  Send Feedback
                </Button>
              </div>
            </div>
          </article>
          </div>
        </div>
      </div>
    </>
  );
}
