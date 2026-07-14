import React, { useState } from "react";
import { View, Text } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { spacing, fontSize } from "@/constants/theme";

export default function Register() {
  const { theme } = useAppTheme();
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = "Kailangan ng pangalan.";
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Maglagay ng valid na email.";
    if (password.length < 6) nextErrors.password = "Dapat 6+ characters ang password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const res = await signUp(name, email, password);
    setLoading(false);
    if (res.ok) router.replace("/(tabs)/home");
  }

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textPrimary, fontSize: fontSize.xxl, fontWeight: "700", marginTop: spacing.xl, marginBottom: spacing.xs }}>Gumawa ng account</Text>
      <Text style={{ color: theme.textSecondary, fontSize: fontSize.md, marginBottom: spacing.xl }}>Sumali sa AmbagKo para sa mas malinaw na ambagan.</Text>

      <Input label="Buong pangalan" value={name} onChangeText={setName} placeholder="Juan Dela Cruz" error={errors.name} />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" error={errors.email} />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Kahit anong 6+ characters" error={errors.password} />

      <Button label="Mag-sign up" onPress={handleRegister} loading={loading} />

      <View style={{ flexDirection: "row", alignItems: "center", marginVertical: spacing.xl }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        <Text style={{ color: theme.textMuted, marginHorizontal: spacing.md, fontSize: fontSize.xs }}>o kaya</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      </View>

      <Button
        label="Mag-sign up gamit ang Google"
        variant="outline"
        onPress={async () => { await signInWithGoogle(); router.replace("/(tabs)/home"); }}
        icon={<Ionicons name="logo-google" size={18} color={theme.primary} />}
      />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xxl }}>
        <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm }}>May account ka na? </Text>
        <Link href="/(auth)/login" style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: "600" }}>Mag-log in</Link>
      </View>
    </ScreenContainer>
  );
}
