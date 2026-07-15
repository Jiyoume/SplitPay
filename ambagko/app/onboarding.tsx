import React, { useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSize, radius } from "@/constants/theme";

const slides = [
  { icon: "people-outline" as const, title: "Gumawa ng grupo", body: "Mag-set up ng grupo para sa barkada trip, bahay-bahayan, o kahit anong bilihan." },
  { icon: "pie-chart-outline" as const, title: "Hatiin nang tama", body: "Pantay, by percentage, exact amount, o custom share — ikaw ang bahala." },
  { icon: "checkmark-done-outline" as const, title: "Malinaw na tracking", body: "Alamin kaagad kung sino ang nakabayad na at sino pang may balanse." },
];

export default function Onboarding() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <ScreenContainer scroll={false}>
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View />
        <View style={{ alignItems: "center" }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: theme.surfaceMuted, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl }}>
            <Ionicons name={slide.icon} size={52} color={theme.primary} />
          </View>
          <Text style={{ color: theme.textPrimary, fontSize: fontSize.xxl, fontWeight: "700", textAlign: "center", marginBottom: spacing.sm }}>{slide.title}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: fontSize.md, textAlign: "center", paddingHorizontal: spacing.lg }}>{slide.body}</Text>
        </View>
        <View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: spacing.xl }}>
            {slides.map((_, i) => (
              <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? theme.primary : theme.border }} />
            ))}
          </View>
          <Button
            label={isLast ? "Simulan" : "Susunod"}
            onPress={() => (isLast ? router.replace("/(auth)/login") : setStep(step + 1))}
          />
          {!isLast && (
            <Button label="Laktawan" variant="outline" onPress={() => router.replace("/(auth)/login")} style={{ marginTop: spacing.md }} />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
