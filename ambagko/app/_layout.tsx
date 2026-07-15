import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useAppTheme } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

function Root() {
  const { theme } = useAppTheme();
  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group/[id]" options={{ headerShown: true, title: "Group" }} />
        <Stack.Screen name="add-expense" options={{ headerShown: true, title: "Add expense", presentation: "modal" }} />
        <Stack.Screen name="split-expense" options={{ headerShown: true, title: "Split expense" }} />
        <Stack.Screen name="payment-confirmation" options={{ headerShown: true, title: "Payment", presentation: "modal" }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: "Notifications" }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings" }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
}
