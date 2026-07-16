import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import GradientButton from '../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow, peso } from '../constants/theme';

export default function ScanReceiptScreen() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [progress, setProgress] = useState(0);

  const simulateScan = () => {
    setStatus('scanning');
    setProgress(0);
    const steps = [15, 35, 60, 80, 95, 100];
    let i = 0;
    const timer = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(timer);
        setStatus('done');
        return;
      }
      setProgress(steps[i]);
      i++;
    }, 500);
  };

  const handleUseData = () => {
    Alert.alert('Applied!', 'Receipt data applied to expense form.', [
      {
        text: 'OK',
        onPress: () => {
          // Navigate to AddExpense screen with the extracted data
          navigation.navigate('AddExpense' as any, {
            title: 'Jollibee - SM Megamall',
            amount: '1214.08',
            category: 'food',
          });
        }
      }
    ]);
  };

  if (status === 'idle') {
    return (
      <View style={s.container}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.center}>
          <View style={s.iconCircle}><Ionicons name="camera-outline" size={44} color={Palette.accent} /></View>
          <Text style={s.title}>Scan a Receipt</Text>
          <Text style={s.desc}>Take a photo or upload from gallery.{'\n'}AI will extract vendor, items, and total.</Text>
          <GradientButton title="Open Camera" onPress={simulateScan} style={{ width: '100%', marginBottom: Spacing.md }} />
          <TouchableOpacity style={s.galleryBtn} onPress={simulateScan}>
            <Ionicons name="images-outline" size={20} color={Palette.textPrimary} />
            <Text style={s.galleryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === 'scanning') {
    return (
      <View style={s.container}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={Palette.accent} style={{ marginBottom: Spacing.xl }} />
          <Text style={s.title}>Scanning receipt...</Text>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={s.progressText}>{progress}%</Text>
        </View>
      </View>
    );
  }

  // Done
  return (
    <View style={s.container}>
      <Header onBack={() => navigation.goBack()} />
      <View style={{ padding: Spacing.lg }}>
        <View style={s.resultCard}>
          <View style={s.successRow}>
            <Ionicons name="checkmark-circle" size={16} color={Palette.positive} />
            <Text style={s.successText}>Data extracted successfully</Text>
          </View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Vendor</Text><Text style={s.resultValue}>Jollibee - SM Megamall</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Date</Text><Text style={s.resultValue}>2026-07-14</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Items</Text><Text style={s.resultValue}>4 items</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>Subtotal</Text><Text style={s.resultValue}>{peso(1084)}</Text></View>
          <View style={s.resultRow}><Text style={s.resultLabel}>VAT (12%)</Text><Text style={s.resultValue}>{peso(130.08)}</Text></View>
          <View style={[s.resultRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{peso(1214.08)}</Text>
          </View>
        </View>

        <View style={s.aiCard}>
          <Text style={s.aiTitle}>🤖 AI Split Suggestion</Text>
          <Text style={s.aiText}>Equal Split — With 4 members: {peso(303.52)} each</Text>
        </View>

        <View style={s.actions}>
          <GradientButton title="Use this data" onPress={handleUseData} style={{ flex: 1 }} />
        </View>
        <TouchableOpacity style={s.retryBtn} onPress={() => setStatus('idle')}>
          <Ionicons name="refresh" size={16} color={Palette.textSecondary} />
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color={Palette.textPrimary} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>Scan Receipt</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 52 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Palette.textPrimary, textAlign: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingBottom: 60 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: Palette.card, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, ...CardShadow },
  title: { color: Palette.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: Spacing.sm },
  desc: { color: Palette.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radii.button, borderWidth: 1, borderColor: Palette.border, minHeight: 48 },
  galleryBtnText: { color: Palette.textPrimary, fontSize: 15, fontWeight: '600' },
  progressBar: { width: 200, height: 6, borderRadius: 3, backgroundColor: Palette.border, marginTop: Spacing.md, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Palette.accent, borderRadius: 3 },
  progressText: { color: Palette.textSecondary, fontSize: 13, marginTop: Spacing.sm },

  resultCard: { backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.lg, marginBottom: Spacing.lg, ...CardShadow },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  successText: { color: Palette.positive, fontSize: 13, fontWeight: '700' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  resultLabel: { color: Palette.textSecondary, fontSize: 13 },
  resultValue: { color: Palette.textPrimary, fontSize: 14, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Palette.textPrimary },
  totalValue: { color: Palette.accent, fontSize: 20, fontWeight: '700' },

  aiCard: { backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.lg, marginBottom: Spacing.xl, ...CardShadow },
  aiTitle: { fontSize: 14, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.sm },
  aiText: { fontSize: 13, color: Palette.textSecondary },

  actions: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, marginBottom: Spacing.xl },
  retryText: { color: Palette.textSecondary, fontSize: 14, fontWeight: '600' },
});
