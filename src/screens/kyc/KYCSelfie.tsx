import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow } from '../../constants/theme';
import { Logo } from '../../components';

interface KYCSelfieProps {
  onNext: () => void; // Final submit
  onBack: () => void;
}

export default function KYCSelfie({ onNext, onBack }: KYCSelfieProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleTakeSelfie = () => {
    // In a real app, this takes the photo and starts the upload process
    // For now, we simulate success
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {!submitted && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={Palette.textPrimary} />
          </TouchableOpacity>
        )}
        {submitted && <View style={styles.backBtn} />}
        <Logo />
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Selfie Verification</Text>
        <Text style={styles.stepText}>Step 3 of 3</Text>
        
        <Text style={styles.instruction}>Align your face within the frame</Text>

        {/* Camera Frame */}
        <View style={styles.cameraFrame}>
          {/* Decorative Corner Brackets */}
          <View style={[styles.bracket, styles.bracketTL]} />
          <View style={[styles.bracket, styles.bracketTR]} />
          <View style={[styles.bracket, styles.bracketBL]} />
          <View style={[styles.bracket, styles.bracketBR]} />
          
          {/* Mock Camera Feed / Face Silhouette */}
          <View style={styles.faceSilhouette}>
            <Ionicons name="person" size={160} color="#cbd5e1" style={{ marginTop: 40 }} />
          </View>
        </View>

        {/* Tips Chips */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Ionicons name="sunny-outline" size={16} color={Palette.accent} style={styles.chipIcon} />
            <Text style={styles.chipText}>Good lighting</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="glasses-outline" size={16} color={Palette.accent} style={styles.chipIcon} />
            <Text style={styles.chipText}>Remove{'\n'}hats/glasses</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="person-outline" size={16} color={Palette.accent} style={styles.chipIcon} />
            <Text style={styles.chipText}>Look straight{'\n'}ahead</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.takePhotoBtn} onPress={handleTakeSelfie} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={24} color={Palette.white} style={{ marginRight: Spacing.sm }} />
          <Text style={styles.takePhotoText}>Take Selfie</Text>
        </TouchableOpacity>

        {/* Submission Success State */}
        {submitted && (
          <View style={styles.submittedOverlay}>
            <View style={styles.submittedCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color={Palette.white} />
                {/* Decorative sparkles */}
                <View style={[styles.sparkle, { top: 0, left: 10, width: 4, height: 4 }]} />
                <View style={[styles.sparkle, { top: -10, right: -10, width: 6, height: 6 }]} />
                <View style={[styles.sparkle, { bottom: 10, right: -20, width: 4, height: 4 }]} />
                <View style={[styles.sparkle, { bottom: -10, left: -10, width: 5, height: 5 }]} />
              </View>
              
              <Text style={styles.submittedTitle}>Verification Submitted</Text>
              <Text style={styles.submittedDesc}>
                Your KYC review is in progress.{'\n'}We'll notify you once approved.
              </Text>
              
              <View style={styles.timePill}>
                <Ionicons name="time-outline" size={16} color={Palette.positive} />
                <Text style={styles.timePillText}>Usually within 24 hours.</Text>
              </View>

              <GradientButton title="Done" onPress={onNext} style={{ marginTop: Spacing.xl, width: '100%' }} />
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, zIndex: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerRight: { width: 44 },
  
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontSize: 24, fontWeight: '800', color: Palette.textPrimary, textAlign: 'center', marginBottom: 4 },
  stepText: { fontSize: 14, fontWeight: '700', color: Palette.accent, textAlign: 'center', marginBottom: Spacing.xl },
  instruction: { fontSize: 15, color: Palette.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },

  cameraFrame: { height: 320, backgroundColor: '#E2E8F0', borderRadius: Radii.card, marginBottom: Spacing.xl, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', borderWidth: 1, borderColor: Palette.border },
  
  bracket: { position: 'absolute', width: 40, height: 40, borderColor: Palette.accent, borderWidth: 3 },
  bracketTL: { top: 20, left: 20, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16 },
  bracketTR: { top: 20, right: 20, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16 },
  bracketBL: { bottom: 20, left: 20, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 16 },
  bracketBR: { bottom: 20, right: 20, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 16 },

  faceSilhouette: { width: 200, height: 260, borderTopLeftRadius: 100, borderTopRightRadius: 100, borderWidth: 2, borderColor: 'white', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' },

  chipsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xxl },
  chip: { flex: 1, backgroundColor: Palette.white, borderRadius: Radii.card, padding: Spacing.sm, alignItems: 'center', marginHorizontal: 4, ...CardShadow },
  chipIcon: { marginBottom: 4 },
  chipText: { fontSize: 10, color: Palette.textSecondary, textAlign: 'center', fontWeight: '500' },

  takePhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.accent, borderRadius: Radii.button, paddingVertical: 16, ...CardShadow },
  takePhotoText: { fontSize: 16, fontWeight: '700', color: Palette.white },

  // Submitted State Overlay
  submittedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248, 250, 252, 0.95)', zIndex: 100, padding: Spacing.lg, justifyContent: 'center' },
  submittedCard: { backgroundColor: Palette.white, borderRadius: Radii.card, padding: Spacing.xl, alignItems: 'center', ...CardShadow },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Palette.positive, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, ...CardShadow },
  sparkle: { position: 'absolute', backgroundColor: '#a7f3d0', borderRadius: 4 },
  submittedTitle: { fontSize: 20, fontWeight: '800', color: Palette.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  submittedDesc: { fontSize: 14, color: Palette.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
  timePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill },
  timePillText: { fontSize: 13, fontWeight: '600', color: Palette.positive, marginLeft: 6 },
});
