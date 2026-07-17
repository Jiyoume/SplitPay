import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GradientButton from '../components/GradientButton';
import Logo from '../components/Logo';
import { Palette, Radii, Spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/RootNavigator';
import { login, register } from '../services/api';
import { setSession } from '../services/session';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

const CardShadow = {
  shadowColor: Palette.navy,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 3,
};

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
        <View style={styles.header}>
          <Logo size={24} />
        </View>

        <Text style={styles.title}>{isCreateAccount ? 'Create an account' : 'Welcome back'}</Text>
        <Text style={styles.subTitle}>
          {isCreateAccount 
            ? 'Join us today and start splitting expenses effortlessly.' 
            : 'Enter your details below to securely access your account.'}
        </Text>

        <View style={styles.formContainer}>
          {isCreateAccount && (
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={Palette.textMuted} style={styles.inputIcon} />
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
            <Ionicons name="mail-outline" size={20} color={Palette.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={Palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={Palette.textMuted} style={styles.inputIcon} />
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
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.altRow}>
          <TouchableOpacity style={styles.altCard}>
            <Ionicons name="finger-print-outline" size={24} color={Palette.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.altCard}>
            <Ionicons name="logo-google" size={24} color={Palette.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.altCard}>
            <Ionicons name="logo-apple" size={24} color={Palette.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.footer} onPress={() => setIsCreateAccount((v) => !v)}>
          <Text style={styles.footerText}>
            {isCreateAccount ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.footerLink}>{isCreateAccount ? 'Sign In' : 'Create Account'}</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.secureCaption}>🔒 Secure & Encrypted</Text>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  subTitle: {
    fontSize: 15,
    color: Palette.textSecondary,
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: Spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.card,
    borderRadius: Radii.input,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 54,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...CardShadow,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Palette.textPrimary,
    paddingVertical: Spacing.sm,
    fontWeight: '500',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.accent,
  },
  cta: {
    marginTop: Spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textMuted,
  },
  altRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  altCard: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.border,
    ...CardShadow,
  },
  footer: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  footerText: {
    fontSize: 15,
    color: Palette.textSecondary,
  },
  footerLink: {
    color: Palette.accent,
    fontWeight: '700',
  },
  secureCaption: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
  },
});
