import { useEffect, type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { configureIOSStatusBarForLightHeader } from "@/lib/capacitor";

function ThemeEffects() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    void configureIOSStatusBarForLightHeader();

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = resolvedTheme === "dark" ? "#1a1a1a" : "#f8f7f5";
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="ketravelan-theme-v2"
    >
      <ThemeEffects />
      {children}
    </NextThemesProvider>
  );
}