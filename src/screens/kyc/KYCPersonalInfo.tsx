import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow } from '../../constants/theme';

interface KYCPersonalInfoProps {
  onNext: () => void;
  onBack: () => void;
}

const ID_OPTIONS = [
  { id: 'passport', title: 'Passport', desc: 'International travel document', icon: 'book-outline' as const },
  { id: 'license', title: "Driver's License", desc: 'Government issued license', icon: 'car-outline' as const },
  { id: 'national_id', title: 'National ID', desc: 'Philippine Identification Card', icon: 'card-outline' as const },
  { id: 'umid', title: 'UMID', desc: 'Unified Multi-Purpose ID', icon: 'finger-print-outline' as const },
];

export default function KYCPersonalInfo({ onNext, onBack }: KYCPersonalInfoProps) {
  const [selectedId, setSelectedId] = useState<string>('national_id');

  // We are keeping state simple for now as per the mock
  const [name, setName] = useState('Alex Martinez');
  const [dob, setDob] = useState('May 15, 1990');
  const [nationality, setNationality] = useState('Philippines');
  const [mobile, setMobile] = useState('+63 917 123 4567');
  const [address, setAddress] = useState('123 Sunrise Avenue, Brgy. San Antonio, Makati City, Metro Manila, 1203');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Palette.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, styles.progressSegmentActive]} />
            <View style={styles.progressSegment} />
            <View style={styles.progressSegment} />
          </View>
          <Text style={styles.progressText}><Text style={{ color: Palette.accent }}>Step 1</Text> of 3</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Ionicons name="person-outline" size={20} color={Palette.textSecondary} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} />
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Ionicons name="calendar-outline" size={20} color={Palette.textSecondary} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <TextInput style={styles.fieldInput} value={dob} onChangeText={setDob} />
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Ionicons name="globe-outline" size={20} color={Palette.textSecondary} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Nationality</Text>
              <TextInput style={styles.fieldInput} value={nationality} onChangeText={setNationality} />
            </View>
            <Ionicons name="chevron-down" size={20} color={Palette.textSecondary} />
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Ionicons name="call-outline" size={20} color={Palette.textSecondary} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <TextInput style={styles.fieldInput} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Ionicons name="location-outline" size={20} color={Palette.textSecondary} style={styles.fieldIcon} />
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput style={styles.fieldInput} value={address} onChangeText={setAddress} multiline />
            </View>
            <Ionicons name="chevron-forward" size={20} color={Palette.textSecondary} />
          </View>
        </View>

        {/* ID Selection */}
        <Text style={styles.sectionTitle}>Select Valid ID</Text>
        <View style={styles.idList}>
          {ID_OPTIONS.map((opt) => {
            const isActive = selectedId === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.idOption, isActive && styles.idOptionActive]}
                onPress={() => setSelectedId(opt.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.idIconBox, isActive && styles.idIconBoxActive]}>
                  <Ionicons name={opt.icon} size={20} color={isActive ? Palette.white : Palette.accent} />
                </View>
                <View style={styles.idTextContent}>
                  <Text style={styles.idTitle}>{opt.title}</Text>
                  <Text style={styles.idDesc}>{opt.desc}</Text>
                </View>
                <View style={[styles.radioCircle, isActive && styles.radioCircleActive]}>
                  {isActive && <Ionicons name="checkmark" size={14} color={Palette.white} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notice */}
        <View style={styles.noticeContainer}>
          <View style={styles.noticeIconBox}>
            <Ionicons name="shield-checkmark" size={16} color={Palette.white} />
          </View>
          <Text style={styles.noticeText}>Make sure your information matches your ID.</Text>
        </View>

        <GradientButton title="Continue" onPress={onNext} style={styles.continueBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, // Using a slightly softer background from the mock
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Palette.textPrimary },
  headerRight: { width: 44 },
  
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  progressBar: { flex: 1, flexDirection: 'row', gap: 4, marginRight: Spacing.md },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Palette.border },
  progressSegmentActive: { backgroundColor: Palette.accent },
  progressText: { fontSize: 13, color: Palette.textSecondary, fontWeight: '600' },

  card: { backgroundColor: Palette.white, borderRadius: Radii.card, ...CardShadow, marginBottom: Spacing.xl, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  fieldIcon: { marginRight: Spacing.md },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 12, color: Palette.textSecondary, marginBottom: 2 },
  fieldInput: { fontSize: 15, fontWeight: '500', color: Palette.textPrimary, padding: 0 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 48 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.md },
  
  idList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  idOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.white, borderRadius: Radii.card, padding: Spacing.md, ...CardShadow, borderWidth: 1, borderColor: 'transparent' },
  idOptionActive: { backgroundColor: '#F0F5FF', borderColor: Palette.accent },
  idIconBox: { width: 40, height: 40, borderRadius: Radii.card, backgroundColor: '#F0F5FF', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  idIconBoxActive: { backgroundColor: Palette.accent },
  idTextContent: { flex: 1 },
  idTitle: { fontSize: 15, fontWeight: '600', color: Palette.textPrimary, marginBottom: 2 },
  idDesc: { fontSize: 12, color: Palette.textSecondary },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },

  noticeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl, paddingHorizontal: Spacing.sm },
  noticeIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: Palette.accent, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  noticeText: { fontSize: 13, color: Palette.textSecondary },

  continueBtn: { marginTop: Spacing.sm },
});
