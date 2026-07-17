import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow } from '../../constants/theme';
import { Logo } from '../../components';

interface KYCUploadIDProps {
  onNext: () => void;
  onBack: () => void;
}

export default function KYCUploadID({ onNext, onBack }: KYCUploadIDProps) {
  // Simulating the state where front is already uploaded as per the mockup
  const [frontUploaded, setFrontUploaded] = useState(true);
  const [backUploaded, setBackUploaded] = useState(false);

  const handleUploadBack = () => {
    // In a real app, this would open image picker or camera
    setBackUploaded(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Logo />
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Upload Your Valid ID</Text>
        
        {/* Progress Nodes */}
        <View style={styles.progressContainer}>
          <Text style={styles.stepText}>Step 2 of 3</Text>
          <View style={styles.nodesContainer}>
            <View style={[styles.node, styles.nodeCompleted]}>
              <Ionicons name="checkmark" size={14} color={Palette.white} />
            </View>
            <View style={[styles.nodeLine, styles.nodeLineCompleted]} />
            <View style={[styles.node, styles.nodeActive]}>
              <Text style={styles.nodeTextActive}>2</Text>
            </View>
            <View style={styles.nodeLine} />
            <View style={styles.node}>
              <Text style={styles.nodeText}>3</Text>
            </View>
          </View>
        </View>

        {/* Selected ID Type Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ID Type</Text>
          <View style={styles.idTypeRow}>
            <View style={styles.idIconBox}>
              <Ionicons name="card-outline" size={20} color={Palette.accent} />
            </View>
            <Text style={styles.idTypeText}>National ID</Text>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={12} color={Palette.white} />
            </View>
          </View>
        </View>

        {/* Front of ID */}
        <Text style={styles.sectionLabel}>Front of ID</Text>
        <View style={styles.card}>
          <View style={styles.uploadRow}>
            {frontUploaded ? (
              <View style={styles.mockIdImage}>
                {/* Mock image content to represent the uploaded ID */}
                <View style={styles.mockIdHeader}>
                  <View style={styles.mockFlag} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 6, fontWeight: 'bold' }}>REPUBLIKA NG PILIPINAS</Text>
                    <Text style={{ fontSize: 5 }}>PAMBANSANG PAGKAKAKILANLAN</Text>
                  </View>
                  <View style={styles.mockSeal} />
                </View>
                <View style={styles.mockIdBody}>
                  <View style={styles.mockPhoto} />
                  <View style={styles.mockDetails}>
                    <View style={styles.mockLine} />
                    <View style={styles.mockLineLong} />
                    <View style={styles.mockLine} />
                    <View style={styles.mockLineLong} />
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={24} color={Palette.accent} />
                <Text style={styles.uploadTitle}>Tap to upload</Text>
                <Text style={styles.uploadDesc}>Upload front of your ID</Text>
              </TouchableOpacity>
            )}
            
            {frontUploaded && (
              <View style={styles.uploadStatusBox}>
                <View style={styles.statusCheck}>
                  <Ionicons name="checkmark" size={14} color={Palette.white} />
                </View>
                <Text style={styles.statusText}>Uploaded</Text>
              </View>
            )}
          </View>
        </View>

        {/* Back of ID */}
        <Text style={styles.sectionLabel}>Back of ID</Text>
        <View style={[styles.card, !backUploaded && { backgroundColor: 'transparent', borderWidth: 0, shadowColor: 'transparent', elevation: 0, padding: 0 }]}>
          {backUploaded ? (
            <View style={styles.uploadRow}>
              <View style={[styles.mockIdImage, { backgroundColor: '#E2E8F0' }]}>
                {/* Mock back of ID */}
                <View style={{ height: 20, backgroundColor: '#cbd5e1', width: '100%', marginBottom: 10 }} />
                <View style={{ flex: 1, padding: 10 }}>
                  <View style={styles.mockLineLong} />
                  <View style={styles.mockLineLong} />
                </View>
              </View>
              <View style={styles.uploadStatusBox}>
                <View style={styles.statusCheck}>
                  <Ionicons name="checkmark" size={14} color={Palette.white} />
                </View>
                <Text style={styles.statusText}>Uploaded</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.dottedUploadBox} onPress={handleUploadBack} activeOpacity={0.7}>
              <View style={styles.cameraIconBox}>
                <Ionicons name="camera-outline" size={24} color={Palette.accent} />
              </View>
              <View>
                <Text style={styles.uploadTitle}>Tap to upload</Text>
                <Text style={styles.uploadDesc}>Upload back of your ID</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipRow}>
            <Ionicons name="sunny-outline" size={18} color={Palette.accent} style={styles.tipIcon} />
            <Text style={styles.tipText}>Use a clear photo</Text>
          </View>
          <View style={styles.tipDivider} />
          <View style={styles.tipRow}>
            <Ionicons name="ban-outline" size={18} color={Palette.accent} style={styles.tipIcon} />
            <Text style={styles.tipText}>Avoid glare and blur</Text>
          </View>
          <View style={styles.tipDivider} />
          <View style={styles.tipRow}>
            <Ionicons name="scan-outline" size={18} color={Palette.accent} style={styles.tipIcon} />
            <Text style={styles.tipText}>All corners must be visible</Text>
          </View>
        </View>

        {/* Actions */}
        <GradientButton title="Continue to Selfie" onPress={onNext} style={styles.continueBtn} />
        
        <View style={styles.secureNotice}>
          <View style={styles.secureCheck}>
            <Ionicons name="checkmark" size={10} color={Palette.white} />
          </View>
          <Text style={styles.secureText}>Documents are encrypted and securely stored.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerRight: { width: 44 },
  
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontSize: 24, fontWeight: '800', color: Palette.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  
  progressContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  stepText: { fontSize: 13, color: Palette.textSecondary, marginBottom: Spacing.md },
  nodesContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 200 },
  node: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  nodeCompleted: { backgroundColor: Palette.accent },
  nodeActive: { backgroundColor: Palette.white, borderWidth: 2, borderColor: Palette.accent },
  nodeText: { fontSize: 12, fontWeight: '700', color: Palette.textSecondary },
  nodeTextActive: { fontSize: 12, fontWeight: '700', color: Palette.accent },
  nodeLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0' },
  nodeLineCompleted: { backgroundColor: Palette.accent },

  card: { backgroundColor: Palette.white, borderRadius: Radii.card, padding: Spacing.lg, ...CardShadow, marginBottom: Spacing.lg },
  cardLabel: { fontSize: 12, color: Palette.textSecondary, marginBottom: Spacing.sm },
  idTypeRow: { flexDirection: 'row', alignItems: 'center' },
  idIconBox: { width: 36, height: 36, borderRadius: Radii.card, backgroundColor: '#F0F5FF', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  idTypeText: { flex: 1, fontSize: 16, fontWeight: '700', color: Palette.textPrimary },
  checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' }, // Light blue check

  sectionLabel: { fontSize: 15, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  
  uploadRow: { flexDirection: 'row', alignItems: 'center' },
  mockIdImage: { flex: 1, height: 120, backgroundColor: '#f1f5f9', borderRadius: Radii.card, overflow: 'hidden', padding: 8, borderWidth: 1, borderColor: Palette.border },
  mockIdHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  mockFlag: { width: 16, height: 10, backgroundColor: Palette.negative },
  mockSeal: { width: 16, height: 16, borderRadius: 8, backgroundColor: Palette.accent },
  mockIdBody: { flexDirection: 'row' },
  mockPhoto: { width: 40, height: 50, backgroundColor: '#cbd5e1', borderRadius: 4, marginRight: 10 },
  mockDetails: { flex: 1, justifyContent: 'center', gap: 4 },
  mockLine: { height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, width: '40%' },
  mockLineLong: { height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, width: '80%' },

  uploadStatusBox: { width: 80, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.md },
  statusCheck: { width: 32, height: 32, borderRadius: 16, backgroundColor: Palette.positive, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  statusText: { fontSize: 12, fontWeight: '600', color: Palette.positive },

  uploadBox: { flex: 1, height: 120, backgroundColor: '#F0F5FF', borderRadius: Radii.card, alignItems: 'center', justifyContent: 'center' },
  dottedUploadBox: { height: 120, borderRadius: Radii.card, borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.white },
  cameraIconBox: { width: 48, height: 48, borderRadius: Radii.card, backgroundColor: '#F0F5FF', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: Palette.textPrimary, marginBottom: 2 },
  uploadDesc: { fontSize: 13, color: Palette.textSecondary },

  tipsCard: { backgroundColor: Palette.white, borderRadius: Radii.card, padding: Spacing.md, ...CardShadow, marginBottom: Spacing.xl },
  tipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  tipIcon: { width: 24, textAlign: 'center', marginRight: Spacing.sm },
  tipText: { fontSize: 14, color: Palette.textSecondary },
  tipDivider: { height: 1, backgroundColor: Palette.border, marginLeft: 36 },

  continueBtn: { marginBottom: Spacing.md },

  secureNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md },
  secureCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: Palette.accent, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  secureText: { fontSize: 12, color: Palette.textSecondary },
});
