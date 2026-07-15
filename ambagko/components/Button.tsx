import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { radius, spacing, fontSize } from "@/constants/theme";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export default function Button({ label, onPress, variant = "primary", loading, disabled, style, icon }: Props) {
  const { theme } = useAppTheme();

  const bg =
    variant === "primary" ? theme.primary :
    variant === "danger" ? theme.danger :
    variant === "secondary" ? theme.accent :
    "transparent";

  const textColor =
    variant === "primary" ? theme.primaryText :
    variant === "danger" ? "#FFFFFF" :
    variant === "secondary" ? theme.accentText :
    theme.primary;

  const borderColor = variant === "outline" ? theme.primary : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor, borderWidth: variant === "outline" ? 1.5 : 0, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: fontSize.md, fontWeight: "600" },
});
