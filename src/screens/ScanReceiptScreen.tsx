import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
    Alert.alert('Applied!', 'Receipt data applied to expense form.');
    navigation.goBack();
  };

  if (status === 'idle') {
    return (
      <View style={s.container}>
        <View style={s.center}>
          <View style={s.iconCircle}><Text style={{ fontSize: 48 }}>📷</Text></View>
          <Text style={s.title}>Scan a Receipt</Text>
          <Text style={s.desc}>Take a photo or upload from gallery.{'\n'}AI will extract vendor, items, and total.</Text>
          <TouchableOpacity style={s.cameraBtn} onPress={simulateScan}>
            <Ionicons name="camera" size={22} color="#000" />
            <Text style={s.cameraBtnText}>Open Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.galleryBtn} onPress={simulateScan}>
            <Ionicons name="images" size={20} color="#fff" />
            <Text style={s.galleryBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (status === 'scanning') {
    return (
      <View style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0A84FF" style={{ marginBottom: 20 }} />
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
      <View style={s.resultCard}>
        <Text style={{ color: '#30D158', fontSize: 14, fontWeight: '700', marginBottom: 12 }}>✅ Data extracted successfully</Text>
        <View style={s.resultRow}><Text style={s.resultLabel}>Vendor</Text><Text style={s.resultValue}>Jollibee - SM Megamall</Text></View>
        <View style={s.resultRow}><Text style={s.resultLabel}>Date</Text><Text style={s.resultValue}>2026-07-14</Text></View>
        <View style={s.resultRow}><Text style={s.resultLabel}>Items</Text><Text style={s.resultValue}>4 items</Text></View>
        <View style={s.resultRow}><Text style={s.resultLabel}>Subtotal</Text><Text style={s.resultValue}>₱1,084.00</Text></View>
        <View style={s.resultRow}><Text style={s.resultLabel}>VAT (12%)</Text><Text style={s.resultValue}>₱130.08</Text></View>
        <View style={[s.resultRow, { borderTopWidth: 1, borderTopColor: '#3A3A3C', paddingTop: 10, marginTop: 6 }]}>
          <Text style={[s.resultLabel, { fontWeight: '800', color: '#fff' }]}>Total</Text>
          <Text style={{ color: '#FFB800', fontSize: 20, fontWeight: '900' }}>₱1,214.08</Text>
        </View>
      </View>

      <View style={s.aiCard}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 6 }}>🤖 AI Split Suggestion</Text>
        <Text style={{ fontSize: 13, color: '#8E8E93' }}>🤝 Equal Split — With 4 members: ₱303.52 each</Text>
      </View>

      <View style={s.actions}>
        <TouchableOpacity style={s.useBtn} onPress={handleUseData}><Text style={s.useBtnText}>✓ Use this data</Text></TouchableOpacity>
        <TouchableOpacity style={s.retryBtn} onPress={() => setStatus('idle')}><Text style={s.retryText}>↺ Retry</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  desc: { color: '#8E8E93', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 16, backgroundColor: '#FFB800', borderRadius: 14, marginBottom: 12 },
  cameraBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#3A3A3C' },
  galleryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  progressBar: { width: 200, height: 6, borderRadius: 3, backgroundColor: '#2C2C2E', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0A84FF', borderRadius: 3 },
  progressText: { color: '#8E8E93', fontSize: 13, marginTop: 8 },
  resultCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 18, marginBottom: 14 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  resultLabel: { color: '#8E8E93', fontSize: 13 },
  resultValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  aiCard: { backgroundColor: '#0A84FF15', borderWidth: 1, borderColor: '#0A84FF30', borderRadius: 14, padding: 16, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  useBtn: { flex: 1, padding: 16, backgroundColor: '#30D158', borderRadius: 14, alignItems: 'center' },
  useBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  retryBtn: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#3A3A3C', alignItems: 'center', paddingHorizontal: 20 },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
