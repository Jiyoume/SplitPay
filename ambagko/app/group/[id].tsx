import React, { useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import ExpenseItem from "@/components/ExpenseItem";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import { useAppTheme } from "@/context/ThemeContext";
import { groupById, expensesForGroup, userById, groupBalance } from "@/data/mockData";
import { spacing, fontSize, radius, peso } from "@/constants/theme";

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const group = groupById(id);
  const [tab, setTab] = useState<"expenses" | "members">("expenses");

  if (!group) {
    return (
      <ScreenContainer>
        <Text style={{ color: theme.textPrimary }}>Hindi nahanap ang grupo.</Text>
      </ScreenContainer>
    );
  }

  const groupExpenses = expensesForGroup(group.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const { total, settled, pending } = groupBalance(group.id);

  const memberBalances = group.memberIds.map((uid) => {
    const owed = groupExpenses.reduce((sum, e) => {
      const share = e.shares.find((s) => s.userId === uid);
      if (!share || share.paid) return sum;
      return e.paidByUserId === uid ? sum : sum - share.amount;
    }, 0);
    return { user: userById(uid), owed };
  });

  return (
    <ScreenContainer>
      <View style={{ backgroundColor: group.imageColor, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={{ color: "#fff", fontSize: fontSize.xl, fontWeight: "700", marginBottom: 4 }}>{group.name}</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: fontSize.sm, marginBottom: spacing.md, textTransform: "capitalize" }}>{group.category} &middot; {group.memberIds.length} miyembro</Text>
        <View style={{ flexDirection: "row", gap: spacing.lg }}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: fontSize.xs }}>Kabuuan</Text>
            <Text style={{ color: "#fff", fontSize: fontSize.lg, fontWeight: "700" }}>{peso(total)}</Text>
          </View>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: fontSize.xs }}>Nakabinbin</Text>
            <Text style={{ color: "#fff", fontSize: fontSize.lg, fontWeight: "700" }}>{peso(pending)}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: "/add-expense", params: { groupId: group.id } })}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: theme.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }}
      >
        <Ionicons name="add" size={18} color={theme.primaryText} />
        <Text style={{ color: theme.primaryText, fontWeight: "600" }}>Add expense</Text>
      </Pressable>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
        {(["expenses", "members"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: tab === t ? theme.primary : "transparent", alignItems: "center" }}>
            <Text style={{ color: tab === t ? theme.primary : theme.textMuted, fontWeight: "600", fontSize: fontSize.sm, textTransform: "capitalize" }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "expenses" ? (
        <View style={{ backgroundColor: theme.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, paddingHorizontal: spacing.lg }}>
          {groupExpenses.map((e) => <ExpenseItem key={e.id} expense={e} />)}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {memberBalances.map(({ user, owed }) => user && (
            <View key={user.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, padding: spacing.md }}>
              <Avatar name={user.name} size={40} />
              <Text style={{ flex: 1, marginLeft: spacing.md, color: theme.textPrimary, fontSize: fontSize.md, fontWeight: "600" }}>{user.name}</Text>
              <Badge label={owed === 0 ? "Bayad na" : `${peso(Math.abs(owed))} ${owed < 0 ? "utang" : ""}`} tone={owed === 0 ? "success" : "danger"} />
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
