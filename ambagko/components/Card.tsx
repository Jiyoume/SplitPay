import React from "react";
import { View, ViewStyle } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { radius, spacing } from "@/constants/theme";

export default function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
