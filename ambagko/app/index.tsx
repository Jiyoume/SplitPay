import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { fontSize, spacing } from "@/constants/theme";

export default function Splash() {
  const { theme } = useAppTheme();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      router.replace(user ? "/(tabs)/home" : "/onboarding");
    }, 900);
    return () => clearTimeout(t);
  }, [loading, user]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 34, fontWeight: "700", color: theme.accentText }}>₱</Text>
      </View>
      <Text style={{ color: "#fff", fontSize: fontSize.xxl, fontWeight: "700" }}>AmbagKo</Text>
      <Text style={{ color: theme.accent, fontSize: fontSize.sm, marginTop: 6 }}>Para malinaw ang ambagan</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: spacing.xl }} />
    </View>
  );
}
