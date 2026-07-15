import React from "react";
import { View, Text } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { radius, fontSize } from "@/constants/theme";

export default function Badge({ label, tone = "neutral" }: { label: string; tone?: "success" | "danger" | "neutral" }) {
  const { theme } = useAppTheme();
  const bg = tone === "success" ? theme.successBg : tone === "danger" ? theme.dangerBg : theme.surfaceMuted;
  const color = tone === "success" ? theme.success : tone === "danger" ? theme.danger : theme.textSecondary;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      <Text style={{ color, fontSize: fontSize.xs, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
