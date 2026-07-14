import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "@/components/ScreenContainer";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useAppTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { spacing, fontSize } from "@/constants/theme";

export default function Login() {
  const { theme } = useAppTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("miguel@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(undefined);
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (res.ok) router.replace("/(tabs)/home");
    else setError(res.error);
  }

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textPrimary, fontSize: fontSize.xxl, fontWeight: "700", marginTop: spacing.xl, marginBottom: spacing.xs }}>Mag-log in</Text>
      <Text style={{ color: theme.textSecondary, fontSize: fontSize.md, marginBottom: spacing.xl }}>Maligayang pagbabalik sa AmbagKo.</Text>

      <Input label="Email o mobile number" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" error={error} />

      <Pressable onPress={() => {}} style={{ alignSelf: "flex-end", marginBottom: spacing.xl, marginTop: -spacing.sm }}>
        <Text style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: "600" }}>Nakalimutan ang password?</Text>
      </Pressable>

      <Button label="Log in" onPress={handleLogin} loading={loading} />

      <View style={{ flexDirection: "row", alignItems: "center", marginVertical: spacing.xl }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        <Text style={{ color: theme.textMuted, marginHorizontal: spacing.md, fontSize: fontSize.xs }}>o kaya</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
      </View>

      <Button
        label="Ipagpatuloy gamit ang Google"
        variant="outline"
        onPress={async () => { await signInWithGoogle(); router.replace("/(tabs)/home"); }}
        icon={<Ionicons name="logo-google" size={18} color={theme.primary} />}
      />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xxl }}>
        <Text style={{ color: theme.textSecondary, fontSize: fontSize.sm }}>Wala ka pang account? </Text>
        <Link href="/(auth)/register" style={{ color: theme.primary, fontSize: fontSize.sm, fontWeight: "600" }}>Mag-sign up</Link>
      </View>
    </ScreenContainer>
  );
}
