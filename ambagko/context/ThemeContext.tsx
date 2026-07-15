import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, Theme } from "@/constants/theme";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const resolved = mode === "system" ? system ?? "light" : mode;
  const theme = resolved === "dark" ? darkTheme : lightTheme;

  const value = useMemo(() => ({ theme, mode, setMode }), [theme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
