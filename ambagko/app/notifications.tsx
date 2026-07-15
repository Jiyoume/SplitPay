import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/context/ThemeContext";
import { notifications } from "@/data/mockData";
import { spacing, fontSize, radius } from "@/constants/theme";

const iconFor: Record<string, keyof typeof Ionicons.glyphMap> = {
  reminder: "alert-circle-outline",
  new_expense: "receipt-outline",
  payment_recorded: "checkmark-circle-outline",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "ngayon lang";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Notifications() {
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: spacing.lg }}>
      {notifications.map((n) => (
        <View
          key={n.id}
          style={{
            flexDirection: "row", gap: spacing.md, backgroundColor: n.read ? theme.surface : theme.surfaceMuted,
            borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={iconFor[n.type]} size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.textPrimary, fontSize: fontSize.sm, fontWeight: "600" }}>{n.title}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>{n.body}</Text>
            <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, marginTop: 4 }}>{timeAgo(n.createdAt)}</Text>
          </View>
          {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.danger, marginTop: 4 }} />}
        </View>
      ))}
    </View>
  );
}
