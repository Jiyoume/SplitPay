import React from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSize, radius } from "@/constants/theme";

export default function Settings() {
  const { theme, mode, setMode } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: spacing.lg }}>
      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginBottom: spacing.sm }}>Appearance</Text>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, marginBottom: spacing.xl }}>
        {(["light", "dark", "system"] as const).map((m, i) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={{ flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: i === 2 ? 0 : 1, borderBottomColor: theme.border }}
          >
            <Text style={{ flex: 1, color: theme.textPrimary, fontSize: fontSize.md, textTransform: "capitalize" }}>{m}</Text>
            {mode === m && <Ionicons name="checkmark" size={20} color={theme.primary} />}
          </Pressable>
        ))}
      </View>

      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginBottom: spacing.sm }}>Notifications</Text>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, marginBottom: spacing.xl }}>
        {[
          { label: "Paalala sa hindi pa bayad", value: true },
          { label: "Bagong gastos sa grupo", value: true },
          { label: "Naitalang bayad", value: false },
        ].map((row, i) => (
          <View key={row.label} style={{ flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: i === 2 ? 0 : 1, borderBottomColor: theme.border }}>
            <Text style={{ flex: 1, color: theme.textPrimary, fontSize: fontSize.md }}>{row.label}</Text>
            <Switch value={row.value} trackColor={{ true: theme.primary, false: theme.border }} />
          </View>
        ))}
      </View>

      <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, textAlign: "center" }}>AmbagKo v1.0.0</Text>
    </View>
  );
}
