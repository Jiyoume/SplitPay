import React from "react";
import { Pressable, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import { Group } from "@/types";
import { groupBalance } from "@/data/mockData";
import { radius, spacing, fontSize, peso } from "@/constants/theme";
import ProgressBar from "./ProgressBar";
import { Ionicons } from "@expo/vector-icons";

const categoryIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  trip: "airplane-outline",
  meals: "restaurant-outline",
  household: "home-outline",
  event: "gift-outline",
  project: "briefcase-outline",
};

export default function GroupCard({ group }: { group: Group }) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { total, settled } = groupBalance(group.id);
  const progress = total > 0 ? settled / total : 0;

  return (
    <Pressable
      onPress={() => router.push(`/group/${group.id}`)}
      style={{
        backgroundColor: theme.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border,
        padding: spacing.lg, marginBottom: spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: group.imageColor, alignItems: "center", justifyContent: "center", marginRight: spacing.md }}>
          <Ionicons name={categoryIcon[group.category] ?? "people-outline"} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textPrimary, fontSize: fontSize.md, fontWeight: "600" }}>{group.name}</Text>
          <Text style={{ color: theme.textMuted, fontSize: fontSize.xs }}>{group.memberIds.length} miyembro</Text>
        </View>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.sm, fontWeight: "600" }}>{peso(total)}</Text>
      </View>
      <ProgressBar progress={progress} color={theme.success} />
      <Text style={{ color: theme.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs }}>
        {peso(settled)} nabayaran ng {peso(total)}
      </Text>
    </Pressable>
  );
}
