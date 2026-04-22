import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { isNativePlatform } from "@/lib/capacitor";
import { Preferences } from "@capacitor/preferences";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";

const VISITED_KEY = "ketravelan_visited";

async function getVisitedFlag(): Promise<boolean> {
  if (isNativePlatform()) {
    const { value } = await Preferences.get({ key: VISITED_KEY });
    return value === "true";
  }
  return localStorage.getItem(VISITED_KEY) === "true";
}

export async function setVisitedFlag() {
  if (isNativePlatform()) {
    await Preferences.set({ key: VISITED_KEY, value: "true" });
  } else {
    localStorage.setItem(VISITED_KEY, "true");
  }
}

export default function MainPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [visitChecked, setVisitChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    getVisitedFlag().then((hasVisitedBefore) => {
      if (!hasVisitedBefore && !isAuthenticated) {
        navigate("/welcome", { replace: true });
      } else if (!hasVisitedBefore && isAuthenticated) {
        // Logged-in user on fresh install  mark as visited, skip welcome
        setVisitedFlag();
      }
      setVisitChecked(true);
    });
  }, [isAuthenticated, loading, navigate]);

  if (loading || !visitChecked) return null;
  return isAuthenticated ? <Explore /> : <Home />;
}
