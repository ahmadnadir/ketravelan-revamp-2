import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface CommunityCTAProps {
  mode: "stories" | "discussions";
  onAskQuestion: () => void;
}

export function CommunityCTA({ mode, onAskQuestion }: CommunityCTAProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-5xl mx-auto px-4 py-3">
        {mode === "stories" ? (
          <Button 
            onClick={() => navigate("/create-story")}
            className="w-full"
          >
            Share Your Story
          </Button>
        ) : (
          <Button 
            onClick={onAskQuestion}
            className="w-full"
          >
            Ask a Question
          </Button>
        )}
      </div>
    </div>
  );
}
