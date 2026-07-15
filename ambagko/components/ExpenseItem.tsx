import React from "react";
import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import { Expense } from "@/types";
import { userById, currentUserId } from "@/data/mockData";
import { spacing, fontSize, radius, peso } from "@/constants/theme";
import Badge from "./Badge";

export default function ExpenseItem({ expense }: { expense: Expense }) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const payer = userById(expense.paidByUserId);
  const myShare = expense.shares.find((s) => s.userId === currentUserId);

  return (
    <Pressable
      onPress={() => router.push(`/group/${expense.groupId}`)}
      style={{
        flexDirection: "row", alignItems: "center", paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: theme.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.md, fontWeight: "600" }}>{expense.title}</Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
          Binayaran ni {payer?.name ?? "—"} &middot; {expense.category}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.md, fontWeight: "600" }}>{peso(expense.amount)}</Text>
        {myShare ? (
          <Badge label={myShare.paid ? "Bayad na" : "Hindi pa bayad"} tone={myShare.paid ? "success" : "danger"} />
        ) : null}
      </View>
    </Pressable>
  );
}
