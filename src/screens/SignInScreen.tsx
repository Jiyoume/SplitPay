import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GradientButton from '../components/GradientButton';
import { Palette, Radii, Spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { login, register } from '../services/api';
import { setSession } from '../services/session';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isCreateAccount, setIsCreateAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goToTabs = () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = isCreateAccount
        ? await register({ name: name || 'New User', email, password })
        : await login({ email, password });
      setSession(res.token, { ...res.user, phone: res.user.phone ?? undefined });
    } catch {
      // Backend unreachable or credentials rejected — demo still proceeds to Tabs
      // rather than dead-ending, per the mock-fallback requirement.
    }
    setSubmitting(false);
    goToTabs();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isCreateAccount ? 'Create Account' : 'Welcome back'}</Text>

        {isCreateAccount && (
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={Palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={Palette.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={18} color={Palette.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Palette.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="lock-closed-outline" size={18} color={Palette.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Palette.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {!isCreateAccount && (
          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <GradientButton
          title={submitting ? 'Please wait…' : isCreateAccount ? 'Create Account' : 'Sign In'}
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.cta}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.altRow}>
          <TouchableOpacity style={styles.altCard}>
            <Ionicons name="finger-print-outline" size={20} color={Palette.accent} />
            <Text style={styles.altCardText}>Sign in with Biometrics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.altCard}>
            <Ionicons name="keypad-outline" size={20} color={Palette.accent} />
            <Text style={styles.altCardText}>Sign in with OTP</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.footer} onPress={() => setIsCreateAccount((v) => !v)}>
          <Text style={styles.footerText}>
            {isCreateAccount ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.footerLink}>{isCreateAccount ? 'Sign In' : 'Create Account →'}</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.secureCaption}>🔒 Secure & encrypted</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xxl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: Palette.border,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Palette.textPrimary,
    paddingVertical: Spacing.sm,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.accent,
  },
  cta: {
    marginTop: Spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textMuted,
  },
  altRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  altCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: Spacing.lg,
    minHeight: 76,
  },
  altCardText: {
    marginTop: Spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  footer: {
    marginTop: Spacing.xxl,
    minHeight: 44,
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: Palette.accent,
    fontWeight: '700',
  },
  secureCaption: {
    marginTop: Spacing.lg,
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
  },
});
