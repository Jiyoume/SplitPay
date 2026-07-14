import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { spacing, fontSize, radius } from "@/constants/theme";

const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string }[] = [
  { icon: "card-outline", label: "Payment methods" },
  { icon: "notifications-outline", label: "Notifications", route: "/notifications" },
  { icon: "shield-checkmark-outline", label: "Privacy at seguridad" },
  { icon: "help-circle-outline", label: "Tulong at suporta" },
  { icon: "settings-outline", label: "Settings", route: "/settings" },
];

export default function Profile() {
  const { theme } = useAppTheme();
  const { user, signOut } = useAuth();

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textPrimary, fontSize: fontSize.xxl, fontWeight: "700", marginBottom: spacing.lg }}>Profile</Text>

      <Card style={{ alignItems: "center", marginBottom: spacing.xl }}>
        <Avatar name={user?.name ?? "Guest"} size={72} />
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.lg, fontWeight: "700", marginTop: spacing.md }}>{user?.name}</Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm }}>{user?.email}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, backgroundColor: theme.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill }}>
          <Ionicons name="wallet-outline" size={14} color={theme.textSecondary} />
          <Text style={{ color: theme.textSecondary, fontSize: fontSize.xs, textTransform: "capitalize" }}>{user?.preferredMethod ?? "cash"}</Text>
        </View>
      </Card>

      <Card style={{ padding: 0, marginBottom: spacing.xl }}>
        {rows.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={() => r.route && router.push(r.route as any)}
            style={{
              flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg,
              borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: theme.border,
            }}
          >
            <Ionicons name={r.icon} size={20} color={theme.textSecondary} />
            <Text style={{ flex: 1, color: theme.textPrimary, fontSize: fontSize.md }}>{r.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        ))}
      </Card>

      <Pressable
        onPress={async () => { await signOut(); router.replace("/(auth)/login"); }}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.md }}
      >
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <Text style={{ color: theme.danger, fontWeight: "600" }}>Mag-log out</Text>
      </Pressable>
    </ScreenContainer>
  );
}
