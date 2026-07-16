import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import GradientButton from '../components/GradientButton';
import { Palette, Radii, Spacing, CardShadow } from '../constants/theme';

type Step = 'intro' | 'personal' | 'id' | 'selfie' | 'submitted';

const INTRO_STEPS = [
  { icon: 'person-outline' as const, title: 'Personal Information', desc: 'Basic details to confirm who you are' },
  { icon: 'card-outline' as const, title: 'Valid ID Upload', desc: 'A government-issued ID (front & back)' },
  { icon: 'camera-outline' as const, title: 'Selfie Verification', desc: 'A quick selfie to match your ID' },
];

const ID_TYPES = ['PhilSys National ID', 'Passport', "Driver's License", 'UMID / SSS', "Voter's ID"];

const SELFIE_TIPS = ['☀️ Good lighting', '🚫 No sunglasses', '📐 Face centered'];

export default function KYCScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('intro');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');

  const goPersonal = () => setStep('personal');

  const goId = () => {
    if (!firstName || !lastName || !email || !phone) {
      Alert.alert('Required', 'Please fill in all required fields.');
      return;
    }
    setStep('id');
  };

  const goSelfie = () => setStep('selfie');

  const takeSelfie = () => {
    // Camera is stubbed on simulator; simulate a capture + submission.
    setStep('submitted');
  };

  const stepBack = () => {
    if (step === 'personal') setStep('intro');
    else if (step === 'id') setStep('personal');
    else if (step === 'selfie') setStep('id');
  };

  if (step === 'intro') {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 40 }}>
        <View style={s.introIconCircle}>
          <Ionicons name="shield-checkmark" size={40} color={Palette.accent} />
        </View>
        <Text style={s.introTitle}>Verify Your Identity</Text>
        <Text style={s.introDesc}>
          Complete KYC to unlock higher transaction limits and send payments to others.
        </Text>

        <View style={s.card}>
          {INTRO_STEPS.map((it, idx) => (
            <View key={it.title} style={[s.introRow, idx === INTRO_STEPS.length - 1 && { marginBottom: 0 }]}>
              <View style={s.introNum}><Text style={s.introNumText}>{idx + 1}</Text></View>
              <Ionicons name={it.icon} size={20} color={Palette.accent} style={{ marginRight: Spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={s.introRowTitle}>{it.title}</Text>
                <Text style={s.introRowDesc}>{it.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.timeNote}>
          <Ionicons name="time-outline" size={16} color={Palette.textMuted} />
          <Text style={s.timeNoteText}>Takes about 3–5 minutes</Text>
        </View>

        <GradientButton title="Start Verification" onPress={goPersonal} style={{ marginTop: Spacing.xl }} />
        <TouchableOpacity style={s.laterBtn} onPress={() => navigation.goBack()}>
          <Text style={s.laterText}>Do this later</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'submitted') {
    return (
      <View style={[s.container, { justifyContent: 'center', padding: Spacing.xl }]}>
        <View style={[s.card, { alignItems: 'center', paddingVertical: Spacing.xxl }]}>
          <Text style={s.submittedEmoji}>✅</Text>
          <Text style={s.submittedTitle}>Verification Submitted</Text>
          <Text style={s.submittedDesc}>
            KYC review in progress… Usually within 24 hours.
          </Text>
          <GradientButton title="Done" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.xl, width: '100%' }} />
        </View>
      </View>
    );
  }

  if (step === 'personal') {
    return (
      <ScrollView style={s.container}>
        <Header title="Personal Information" stepNum={1} onBack={stepBack} />
        <View style={{ padding: Spacing.lg }}>
          <View style={s.card}>
            <Field label="First Name *" value={firstName} onChangeText={setFirstName} placeholder="Juan" />
            <Field label="Last Name *" value={lastName} onChangeText={setLastName} placeholder="Dela Cruz" />
            <Field label="Email *" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone *" value={phone} onChangeText={setPhone} placeholder="+639171234567" keyboardType="phone-pad" />
            <Field label="Date of Birth" value={birthday} onChangeText={setBirthday} placeholder="YYYY-MM-DD" last />
          </View>
          <GradientButton title="Continue" onPress={goId} style={{ marginTop: Spacing.lg }} />
        </View>
      </ScrollView>
    );
  }

  if (step === 'id') {
    return (
      <ScrollView style={s.container}>
        <Header title="Valid ID Upload" stepNum={2} onBack={stepBack} />
        <View style={{ padding: Spacing.lg }}>
          <View style={s.card}>
            <Text style={s.label}>ID Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm, marginBottom: Spacing.md }}>
              {ID_TYPES.map((t) => (
                <TouchableOpacity key={t} onPress={() => setIdType(t)} style={[s.chip, idType === t && s.chipActive]}>
                  <Text style={[s.chipText, idType === t && s.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Field label="ID Number" value={idNumber} onChangeText={setIdNumber} placeholder="Enter ID number" last />
          </View>

          <View style={s.card}>
            <Text style={s.sectionTitle}>Upload Photos</Text>
            <View style={s.uploadRow}>
              <TouchableOpacity style={s.uploadBtn}>
                <Ionicons name="camera-outline" size={26} color={Palette.textSecondary} />
                <Text style={s.uploadLabel}>ID Front</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.uploadBtn}>
                <Ionicons name="camera-outline" size={26} color={Palette.textSecondary} />
                <Text style={s.uploadLabel}>ID Back</Text>
              </TouchableOpacity>
            </View>
          </View>

          <GradientButton title="Continue" onPress={goSelfie} style={{ marginTop: Spacing.sm }} />
        </View>
      </ScrollView>
    );
  }

  // step === 'selfie'
  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Header title="Selfie Verification" stepNum={3} onBack={stepBack} />
      <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
        <View style={s.faceFrame}>
          <Ionicons name="person-outline" size={72} color={Palette.textMuted} />
        </View>
        <View style={s.tipRow}>
          {SELFIE_TIPS.map((t) => (
            <View key={t} style={s.tipChip}><Text style={s.tipText}>{t}</Text></View>
          ))}
        </View>
        <GradientButton title="Take Selfie" onPress={takeSelfie} style={{ marginTop: Spacing.xl, width: '100%' }} />
      </View>
    </ScrollView>
  );
}

function Header({ title, stepNum, onBack }: { title: string; stepNum: number; onBack: () => void }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color={Palette.textPrimary} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle}>{title}</Text>
        <Text style={s.headerStep}>Step {stepNum} of 3</Text>
      </View>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
  last?: boolean;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, last }: FieldProps) {
  return (
    <View style={[s.field, last && { marginBottom: 0 }]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Palette.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 52 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Palette.textPrimary },
  headerStep: { fontSize: 12, color: Palette.textSecondary, marginTop: 2 },

  introIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Palette.card, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing.lg, ...CardShadow },
  introTitle: { fontSize: 22, fontWeight: '700', color: Palette.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  introDesc: { fontSize: 14, color: Palette.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },

  card: { backgroundColor: Palette.card, borderRadius: Radii.card, padding: Spacing.lg, marginBottom: Spacing.lg, ...CardShadow },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.lg },
  introNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Palette.background, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm, marginTop: 1 },
  introNumText: { fontSize: 11, fontWeight: '700', color: Palette.textSecondary },
  introRowTitle: { fontSize: 15, fontWeight: '600', color: Palette.textPrimary },
  introRowDesc: { fontSize: 12, color: Palette.textSecondary, marginTop: 2 },

  timeNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  timeNoteText: { fontSize: 13, color: Palette.textMuted, fontWeight: '500' },

  laterBtn: { alignItems: 'center', paddingVertical: Spacing.lg },
  laterText: { color: Palette.textSecondary, fontSize: 14, fontWeight: '600' },

  submittedEmoji: { fontSize: 40, marginBottom: Spacing.md },
  submittedTitle: { fontSize: 20, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.sm },
  submittedDesc: { fontSize: 14, color: Palette.textSecondary, textAlign: 'center', lineHeight: 20 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: Palette.textPrimary, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary, marginBottom: Spacing.xs },
  input: { backgroundColor: Palette.background, borderRadius: Radii.input, borderWidth: 1, borderColor: Palette.border, minHeight: 48, paddingHorizontal: Spacing.md, color: Palette.textPrimary, fontSize: 15 },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, backgroundColor: Palette.card, borderWidth: 1, borderColor: Palette.border, marginRight: Spacing.sm },
  chipActive: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: Palette.textSecondary },
  chipTextActive: { color: Palette.white },
  uploadRow: { flexDirection: 'row', gap: Spacing.md },
  uploadBtn: { flex: 1, paddingVertical: Spacing.xl, borderRadius: Radii.input, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Palette.border, alignItems: 'center', gap: Spacing.xs },
  uploadLabel: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary },

  faceFrame: { width: 220, height: 260, borderRadius: 120, borderWidth: 2, borderStyle: 'dashed', borderColor: Palette.border, backgroundColor: Palette.card, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, ...CardShadow },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  tipChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, backgroundColor: Palette.card, borderWidth: 1, borderColor: Palette.border },
  tipText: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary },
});
