import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Card from "@/components/Card";
import ProgressBar from "@/components/ProgressBar";
import { useAppTheme } from "@/context/ThemeContext";
import { expenses, groups } from "@/data/mockData";
import { spacing, fontSize, radius, peso } from "@/constants/theme";

export default function Reports() {
  const { theme } = useAppTheme();

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? amount / total : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, []);

  const totalSpent = expenses.reduce((a, e) => a + e.amount, 0);
  const totalPaid = expenses.reduce((a, e) => a + e.shares.filter((s) => s.paid).reduce((x, s) => x + s.amount, 0), 0);

  const monthly = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      const month = e.date.slice(0, 7);
      map[month] = (map[month] ?? 0) + e.amount;
    }
    return Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1));
  }, []);

  const colors = [theme.primary, theme.success, theme.warning, theme.danger, theme.accent];

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textPrimary, fontSize: fontSize.xxl, fontWeight: "700", marginBottom: spacing.lg }}>Reports</Text>

      <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>Kabuuang gastos</Text>
          <Text style={{ color: theme.textPrimary, fontSize: fontSize.lg, fontWeight: "700" }}>{peso(totalSpent)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>Nabayaran na</Text>
          <Text style={{ color: theme.success, fontSize: fontSize.lg, fontWeight: "700" }}>{peso(totalPaid)}</Text>
        </Card>
      </View>

      <Text style={{ color: theme.textPrimary, fontSize: fontSize.lg, fontWeight: "700", marginBottom: spacing.md }}>Breakdown ayon sa kategorya</Text>
      <Card style={{ marginBottom: spacing.xl }}>
        {byCategory.map((c, i) => (
          <View key={c.category} style={{ marginBottom: i === byCategory.length - 1 ? 0 : spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ color: theme.textPrimary, fontSize: fontSize.sm, fontWeight: "600" }}>{c.category}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm }}>{peso(c.amount)}</Text>
            </View>
            <ProgressBar progress={c.pct} color={colors[i % colors.length]} />
          </View>
        ))}
      </Card>

      <Text style={{ color: theme.textPrimary, fontSize: fontSize.lg, fontWeight: "700", marginBottom: spacing.md }}>Buwanang kontribusyon</Text>
      <Card style={{ marginBottom: spacing.xl }}>
        {monthly.map(([month, amount], i) => (
          <View key={month} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: i === monthly.length - 1 ? 0 : 1, borderBottomColor: theme.border }}>
            <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm }}>{month}</Text>
            <Text style={{ color: theme.textPrimary, fontSize: fontSize.sm, fontWeight: "600" }}>{peso(amount)}</Text>
          </View>
        ))}
      </Card>

      <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: theme.surfaceMuted, borderRadius: radius.md, padding: spacing.md }}>
        <Ionicons name="share-outline" size={18} color={theme.textPrimary} />
        <Text style={{ color: theme.textPrimary, fontWeight: "600", fontSize: fontSize.sm }}>I-share o i-download ang summary</Text>
      </Pressable>
    </ScreenContainer>
  );
}
