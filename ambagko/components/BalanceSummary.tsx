import React from "react";
import { View, Text } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSize, radius, peso } from "@/constants/theme";

export default function BalanceSummary({ owedToMe, iOwe }: { owedToMe: number; iOwe: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      <View style={{ flex: 1, backgroundColor: theme.successBg, borderRadius: radius.lg, padding: spacing.lg }}>
        <Text style={{ color: theme.success, fontSize: fontSize.xs, fontWeight: "600", marginBottom: 4 }}>Utang sa iyo</Text>
        <Text style={{ color: theme.success, fontSize: fontSize.xl, fontWeight: "700" }}>{peso(owedToMe)}</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: theme.dangerBg, borderRadius: radius.lg, padding: spacing.lg }}>
        <Text style={{ color: theme.danger, fontSize: fontSize.xs, fontWeight: "600", marginBottom: 4 }}>Utang mo</Text>
        <Text style={{ color: theme.danger, fontSize: fontSize.xl, fontWeight: "700" }}>{peso(iOwe)}</Text>
      </View>
    </View>
  );
}
