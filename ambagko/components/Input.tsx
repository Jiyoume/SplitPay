import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { radius, spacing, fontSize } from "@/constants/theme";

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function Input({ label, error, style, ...rest }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.xs, fontWeight: "600" }}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textMuted}
        style={[
          {
            backgroundColor: theme.surfaceMuted,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? theme.danger : theme.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            color: theme.textPrimary,
            fontSize: fontSize.md,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={{ color: theme.danger, fontSize: fontSize.xs, marginTop: spacing.xs }}>{error}</Text> : null}
    </View>
  );
}
