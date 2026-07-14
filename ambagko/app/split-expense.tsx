import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import { useAppTheme } from "@/context/ThemeContext";
import { groupById, userById } from "@/data/mockData";
import { SplitType } from "@/types";
import { spacing, fontSize, radius, peso } from "@/constants/theme";

const splitTypes: { key: SplitType; label: string }[] = [
  { key: "equal", label: "Pantay" },
  { key: "percentage", label: "Percentage" },
  { key: "exact", label: "Exact amount" },
  { key: "custom", label: "Custom share" },
];

export default function SplitExpense() {
  const { groupId, title, amount, category } = useLocalSearchParams<{ groupId: string; title: string; amount: string; category: string }>();
  const { theme } = useAppTheme();
  const group = groupById(groupId);
  const total = Number(amount) || 0;

  const [paidBy, setPaidBy] = useState(group?.memberIds[0] ?? "");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [included, setIncluded] = useState<Set<string>>(new Set(group?.memberIds ?? []));

  const shares = useMemo(() => {
    const ids = Array.from(included);
    if (ids.length === 0) return [];
    const per = total / ids.length;
    return ids.map((id) => ({ id, amount: per }));
  }, [included, total]);

  function toggleMember(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!group) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg }}>
        <Text style={{ color: theme.textPrimary, fontSize: fontSize.lg, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: theme.textMuted, fontSize: fontSize.sm, marginTop: 2 }}>{category} &middot; {group.name}</Text>
        <Text style={{ color: theme.primary, fontSize: fontSize.xxl, fontWeight: "700", marginTop: spacing.sm }}>{peso(total)}</Text>
      </View>

      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginBottom: spacing.sm }}>Sino ang nagbayad?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {group.memberIds.map((id) => {
            const u = userById(id);
            if (!u) return null;
            return (
              <Pressable key={id} onPress={() => setPaidBy(id)} style={{ alignItems: "center", opacity: paidBy === id ? 1 : 0.5 }}>
                <Avatar name={u.name} size={48} />
                <Text style={{ color: theme.textSecondary, fontSize: fontSize.xs, marginTop: 4, maxWidth: 64 }} numberOfLines={1}>{u.name.split(" ")[0]}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginBottom: spacing.sm }}>Paraan ng paghahati</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
        {splitTypes.map((s) => (
          <Pressable key={s.key} onPress={() => setSplitType(s.key)} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: splitType === s.key ? theme.primary : theme.surfaceMuted }}>
            <Text style={{ color: splitType === s.key ? theme.primaryText : theme.textSecondary, fontSize: fontSize.xs, fontWeight: "600" }}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginBottom: spacing.sm }}>Isama sa split</Text>
      <View style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.lg, marginBottom: spacing.xl }}>
        {group.memberIds.map((id, i) => {
          const u = userById(id);
          if (!u) return null;
          const isIn = included.has(id);
          const share = shares.find((s) => s.id === id);
          return (
            <Pressable
              key={id}
              onPress={() => toggleMember(id)}
              style={{ flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: i === group.memberIds.length - 1 ? 0 : 1, borderBottomColor: theme.border, opacity: isIn ? 1 : 0.4 }}
            >
              <Avatar name={u.name} size={36} />
              <Text style={{ flex: 1, marginLeft: spacing.md, color: theme.textPrimary, fontSize: fontSize.md }}>{u.name}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, fontWeight: "600" }}>{isIn ? peso(share?.amount ?? 0) : "—"}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="Kumpirmahin ang gastos"
        onPress={() => router.replace(`/group/${group.id}`)}
      />
    </ScrollView>
  );
}
