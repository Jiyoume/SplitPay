import React from "react";
import { View, ScrollView, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing } from "@/constants/theme";

export default function ScreenContainer({
  children, scroll = true, style,
}: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const { theme } = useAppTheme();
  const Wrapper = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <Wrapper
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? { padding: spacing.lg, paddingBottom: spacing.xxl } : undefined}
      >
        <View style={[!scroll && { flex: 1, padding: spacing.lg }, style]}>{children}</View>
      </Wrapper>
    </SafeAreaView>
  );
}
