import React from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import BalanceSummary from "@/components/BalanceSummary";
import ExpenseItem from "@/components/ExpenseItem";
import Avatar from "@/components/Avatar";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { expenses, notifications, netBalanceForUser, currentUserId } from "@/data/mockData";
import { spacing, fontSize, radius } from "@/constants/theme";

export default function Home() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { owedToMe, iOwe } = netBalanceForUser(currentUserId);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const recent = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
  const pendingReminders = notifications.filter((n) => n.type === "reminder" && !n.read);

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Avatar name={user?.name ?? "Guest"} size={44} />
          <View>
            <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>Kumusta,</Text>
            <Text style={{ color: theme.textPrimary, fontSize: fontSize.lg, fontWeight: "700" }}>{user?.name ?? "Guest"}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/notifications")} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
          {unreadCount > 0 && (
            <View style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.danger }} />
          )}
        </Pressable>
      </View>

      <BalanceSummary owedToMe={owedToMe} iOwe={iOwe} />

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <Pressable
          onPress={() => router.push("/(tabs)/groups")}
          style={{ flex: 1, backgroundColor: theme.primary, borderRadius: radius.md, padding: spacing.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm }}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.primaryText} />
          <Text style={{ color: theme.primaryText, fontWeight: "600", fontSize: fontSize.sm }}>Create group</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/add-expense")}
          style={{ flex: 1, backgroundColor: theme.accent, borderRadius: radius.md, padding: spacing.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm }}
        >
          <Ionicons name="receipt-outline" size={18} color={theme.accentText} />
          <Text style={{ color: theme.accentText, fontWeight: "600", fontSize: fontSize.sm }}>Add expense</Text>
        </Pressable>
      </View>

      {pendingReminders.length > 0 && (
        <View style={{ backgroundColor: theme.dangerBg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xl }}>
          <Text style={{ color: theme.danger, fontWeight: "600", fontSize: fontSize.sm, marginBottom: 2 }}>
            <Ionicons name="alert-circle-outline" size={14} /> {pendingReminders.length} paalala sa pagbabayad
          </Text>
          <Text style={{ color: theme.danger, fontSize: fontSize.xs }}>{pendingReminders[0].body}</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.lg, fontWeight: "700" }}>Kamakailang gastos</Text>
        <Pressable onPress={() => router.push("/(tabs)/groups")}>
          <Text style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: "600" }}>Tingnan lahat</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, paddingHorizontal: spacing.lg }}>
        {recent.map((e) => <ExpenseItem key={e.id} expense={e} />)}
      </View>
    </ScreenContainer>
  );
}
