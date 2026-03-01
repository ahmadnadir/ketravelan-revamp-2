import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";

export default function MainPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect first-time visitors to welcome page
    const hasVisitedBefore = localStorage.getItem("ketravelan_visited");
    if (!hasVisitedBefore && !isAuthenticated && !loading) {
      navigate("/welcome", { replace: true });
    } else if (!hasVisitedBefore) {
      localStorage.setItem("ketravelan_visited", "true");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) return null; // or a spinner
  return isAuthenticated ? <Explore /> : <Home />;
}
