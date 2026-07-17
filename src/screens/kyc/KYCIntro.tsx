import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow } from '../../constants/theme';
import { Logo } from '../../components';

interface KYCIntroProps {
  onStart: () => void;
  onLater: () => void;
}

const STEPS = [
  { icon: 'person-outline' as const, title: '1. Personal Information', desc: 'Provide your basic details' },
  { icon: 'card-outline' as const, title: '2. Valid ID Upload', desc: 'Upload a valid government ID' },
  { icon: 'scan-outline' as const, title: '3. Selfie Verification', desc: 'Take a quick selfie to verify' },
];

export default function KYCIntro({ onStart, onLater }: KYCIntroProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Logo />
        <TouchableOpacity style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={24} color={Palette.accent} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          Complete KYC to unlock secure payments and higher transaction limits.
        </Text>

        {/* Hero Graphic (Stylized Mock) */}
        <View style={styles.heroGraphic}>
          {/* Background decorative elements */}
          <View style={styles.heroBgCircle} />
          <View style={styles.heroLeftCard}>
            <View style={styles.heroCardHeader} />
            <View style={styles.heroCardLine} />
            <View style={styles.heroCardLineShort} />
            <Ionicons name="person" size={32} color={Palette.accent} style={{ marginTop: 8 }} />
          </View>
          <View style={styles.heroRightCard}>
            <Ionicons name="scan-outline" size={48} color={Palette.textPrimary} />
            <Ionicons name="person" size={24} color={Palette.accent} style={{ position: 'absolute' }} />
          </View>
          
          {/* Center Shield */}
          <View style={styles.shieldContainer}>
            <Ionicons name="shield" size={100} color={Palette.accent} />
            <Ionicons name="checkmark" size={48} color={Palette.white} style={{ position: 'absolute' }} />
          </View>

          {/* Floating Check */}
          <View style={styles.floatingCheck}>
            <Ionicons name="checkmark-circle" size={32} color={Palette.positive} />
          </View>
        </View>

        {/* Steps List */}
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <View key={step.title}>
              <View style={styles.stepRow}>
                <View style={styles.iconBox}>
                  <Ionicons name={step.icon} size={24} color={Palette.accent} />
                </View>
                <View style={styles.stepTextContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Palette.textMuted} />
              </View>
              {index < STEPS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <View style={styles.securityIconBox}>
            <Ionicons name="lock-closed" size={20} color={Palette.accent} />
          </View>
          <View style={styles.securityTextContent}>
            <Text style={styles.securityTitle}>Takes about 3–5 minutes</Text>
            <Text style={styles.securityDesc}>Your data is encrypted and securely processed.</Text>
          </View>
        </View>

        {/* Actions */}
        <GradientButton title="Start Verification" onPress={onStart} style={styles.startBtn} />
        <TouchableOpacity style={styles.laterBtn} onPress={onLater}>
          <Text style={styles.laterBtnText}>Do this later</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerLeft: { width: 44 },
  bellBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.negative },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontSize: 28, fontWeight: '800', color: Palette.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, color: Palette.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl, lineHeight: 22 },
  
  heroGraphic: { height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xxl },
  heroBgCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: Palette.border, opacity: 0.5 },
  shieldContainer: { alignItems: 'center', justifyContent: 'center', ...CardShadow },
  heroLeftCard: { position: 'absolute', left: 20, top: 40, width: 80, height: 100, backgroundColor: Palette.white, borderRadius: Radii.card, padding: Spacing.sm, ...CardShadow, transform: [{ rotate: '-10deg' }] },
  heroCardHeader: { width: 40, height: 8, backgroundColor: Palette.border, borderRadius: 4, marginBottom: Spacing.sm },
  heroCardLine: { width: '100%', height: 4, backgroundColor: Palette.border, borderRadius: 2, marginBottom: 4 },
  heroCardLineShort: { width: '60%', height: 4, backgroundColor: Palette.border, borderRadius: 2 },
  heroRightCard: { position: 'absolute', right: 20, bottom: 40, width: 80, height: 100, backgroundColor: Palette.white, borderRadius: Radii.card, alignItems: 'center', justifyContent: 'center', ...CardShadow, transform: [{ rotate: '10deg' }] },
  floatingCheck: { position: 'absolute', bottom: 10, right: 100, backgroundColor: Palette.white, borderRadius: 16 },

  stepsContainer: { backgroundColor: Palette.white, borderRadius: Radii.card, padding: Spacing.lg, ...CardShadow, marginBottom: Spacing.xl },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: Radii.pill, backgroundColor: '#F0F5FF', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  stepTextContent: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: Palette.textSecondary },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: Spacing.md, marginLeft: 64 },

  securityNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F5FF', padding: Spacing.lg, borderRadius: Radii.card, marginBottom: Spacing.xxl },
  securityIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.white, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md, ...CardShadow },
  securityTextContent: { flex: 1 },
  securityTitle: { fontSize: 14, fontWeight: '700', color: Palette.textPrimary, marginBottom: 2 },
  securityDesc: { fontSize: 13, color: Palette.textSecondary },

  startBtn: { marginBottom: Spacing.md },
  laterBtn: { paddingVertical: Spacing.md, alignItems: 'center' },
  laterBtnText: { fontSize: 16, fontWeight: '600', color: Palette.accent },
});
