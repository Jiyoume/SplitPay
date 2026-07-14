import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import GroupCard from "@/components/GroupCard";
import { useAppTheme } from "@/context/ThemeContext";
import { groups } from "@/data/mockData";
import { spacing, fontSize, radius } from "@/constants/theme";

const categories = ["all", "trip", "meals", "household", "event", "project"] as const;

export default function Groups() {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("all");

  const filtered = groups.filter((g) => {
    const matchesQuery = g.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || g.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg }}>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.xxl, fontWeight: "700" }}>Mga grupo</Text>
        <Pressable style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="add" size={22} color={theme.primaryText} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surfaceMuted, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          placeholder="Maghanap ng grupo"
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          style={{ flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, color: theme.textPrimary, fontSize: fontSize.md }}
        />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
        {categories.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={{
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill,
              backgroundColor: category === c ? theme.primary : theme.surfaceMuted,
            }}
          >
            <Text style={{ color: category === c ? theme.primaryText : theme.textSecondary, fontSize: fontSize.xs, fontWeight: "600", textTransform: "capitalize" }}>{c}</Text>
          </Pressable>
        ))}
      </View>

      {filtered.map((g) => <GroupCard key={g.id} group={g} />)}
      {filtered.length === 0 && (
        <Text style={{ color: theme.textMuted, textAlign: "center", marginTop: spacing.xl }}>Walang grupong nahanap.</Text>
      )}
    </ScreenContainer>
  );
}
