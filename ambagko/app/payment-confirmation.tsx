import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import { useAppTheme } from "@/context/ThemeContext";
import { PaymentMethod } from "@/types";
import { spacing, fontSize, radius, peso } from "@/constants/theme";

const methods: { key: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "gcash", label: "GCash", icon: "phone-portrait-outline" },
  { key: "maya", label: "Maya", icon: "wallet-outline" },
  { key: "bank", label: "Bank transfer", icon: "business-outline" },
  { key: "cash", label: "Cash", icon: "cash-outline" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

export default function PaymentConfirmation() {
  const { theme } = useAppTheme();
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: theme.successBg, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg }}>
          <Ionicons name="checkmark-circle" size={44} color={theme.success} />
        </View>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.xl, fontWeight: "700", marginBottom: spacing.xs }}>Naitala ang bayad</Text>
        <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, textAlign: "center", marginBottom: spacing.xl }}>
          Na-mark na ang iyong share bilang bayad na via {method}. Ma-notify ang grupo.
        </Text>
        <Button label="Bumalik sa grupo" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: spacing.lg }}>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", marginBottom: spacing.xl }}>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>Babayaran</Text>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.xxl, fontWeight: "700" }}>{peso(2000)}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>Airbnb - 2 nights &middot; Baguio Barkada Trip</Text>
      </View>

      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginBottom: spacing.sm }}>Paraan ng pagbabayad</Text>
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        {methods.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => setMethod(m.key)}
            style={{
              flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md,
              borderWidth: 1.5, borderColor: method === m.key ? theme.primary : theme.border, backgroundColor: method === m.key ? theme.surfaceMuted : theme.surface,
            }}
          >
            <Ionicons name={m.icon} size={20} color={method === m.key ? theme.primary : theme.textSecondary} />
            <Text style={{ flex: 1, color: theme.textPrimary, fontSize: fontSize.md }}>{m.label}</Text>
            {method === m.key && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
          </Pressable>
        ))}
      </View>

      <Button label="Markahan bilang bayad na" onPress={() => setConfirmed(true)} />
    </View>
  );
}
