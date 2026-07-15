import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAppTheme } from "@/context/ThemeContext";
import { groups } from "@/data/mockData";
import { spacing, fontSize, radius } from "@/constants/theme";

const categories = ["Food", "Lodging", "Transport", "Utilities", "Gift", "Other"];

export default function AddExpense() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { theme } = useAppTheme();
  const [selectedGroup, setSelectedGroup] = useState(groupId ?? groups[0]?.id);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ title?: string; amount?: string }>({});

  function handleContinue() {
    const nextErrors: typeof errors = {};
    if (!title.trim()) nextErrors.title = "Kailangan ng pangalan ng gastos.";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) nextErrors.amount = "Maglagay ng valid na halaga.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    router.push({
      pathname: "/split-expense",
      params: { groupId: selectedGroup, title, amount, category },
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.xs, fontWeight: "600" }}>Grupo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setSelectedGroup(g.id)}
              style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: selectedGroup === g.id ? theme.primary : theme.surfaceMuted }}
            >
              <Text style={{ color: selectedGroup === g.id ? theme.primaryText : theme.textSecondary, fontSize: fontSize.xs, fontWeight: "600" }}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Input label="Pamagat ng gastos" value={title} onChangeText={setTitle} placeholder="hal. Grocery run" error={errors.title} />
      <Input label="Halaga (₱)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />

      <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.xs, fontWeight: "600" }}>Kategorya</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
        {categories.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: category === c ? theme.accent : theme.surfaceMuted }}>
            <Text style={{ color: category === c ? theme.accentText : theme.textSecondary, fontSize: fontSize.xs, fontWeight: "600" }}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Idagdag ang detalye" multiline style={{ minHeight: 80, textAlignVertical: "top" }} />

      <Pressable style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: theme.surfaceMuted, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl }}>
        <Ionicons name="camera-outline" size={20} color={theme.textSecondary} />
        <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm }}>Mag-attach ng resibo</Text>
      </Pressable>

      <Button label="Ipagpatuloy sa splitting" onPress={handleContinue} />
    </ScrollView>
  );
}
