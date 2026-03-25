import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ChevronLeft, BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { searchHelpArticles, fetchHelpCategories, type HelpArticle, type HelpCategory } from "@/lib/help";
import { SEOHead } from "@/components/seo/SEOHead";

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = useCallback(async () => {
    const results = await searchHelpArticles(searchQuery);
    setArticles(results);
    setSelectedCategory(null);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [handleSearch]);

  const loadData = async () => {
    setIsLoading(true);
    const [articlesData, categoriesData] = await Promise.all([
      searchHelpArticles(""),
      fetchHelpCategories(),
    ]);
    setArticles(articlesData);
    setCategories(categoriesData);
    setIsLoading(false);
  };

  const filteredArticles = selectedCategory
    ? articles.filter((a) => a.category === selectedCategory)
    : articles;

  const groupedArticles = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  return (
    <>
      <SEOHead
        title="Help Center | Ketravelan"
        description="Find answers to common questions about using Ketravelan. Learn how to create trips, manage expenses, and more."
      />
      
      <div className="app-shell bg-background">
        <div className="app-shell-top">
          <header className="h-full bg-background border-b border-border/50 safe-x">
            <div className="h-[var(--safe-top)]" />
            <div className="max-w-4xl mx-auto px-4 h-[var(--header-height)] flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Help Center</h1>
                <p className="text-xs text-muted-foreground">Find answers and support</p>
              </div>
            </div>
          </header>
        </div>

        <div className="app-shell-content" style={{ paddingTop: "var(--header-total-height)", paddingBottom: "1rem" }}>
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>

          {/* Categories */}
          {!searchQuery && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Browse by Category</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-full"
                >
                  All ({articles.length})
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.name}
                    variant={selectedCategory === category.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.name)}
                    className="rounded-full"
                  >
                    {category.name} ({category.count})
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Search Results */}
          {!isLoading && searchQuery && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            </div>
          )}

          {/* Articles */}
          {!isLoading && Object.keys(groupedArticles).length === 0 && (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No articles found. Try a different search." : "No articles available."}
              </p>
            </Card>
          )}

          {!isLoading && Object.entries(groupedArticles).map(([category, categoryArticles]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold">{category}</h2>
              <Card className="divide-y divide-border/50">
                {categoryArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/help-center/${article.slug}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1">{article.title}</h3>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3" />
                  </Link>
                ))}
              </Card>
            </div>
          ))}
          </div>
        </div>
      </div>
    </>
  );
}
