import React from "react";
import { View } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

export default function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const { theme } = useAppTheme();
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ height: 6, backgroundColor: theme.surfaceMuted, borderRadius: 3, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: color ?? theme.primary }} />
    </View>
  );
}
