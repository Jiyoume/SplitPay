import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function KYCScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');

  const idTypes = ['PhilSys National ID', 'Passport', "Driver's License", 'UMID / SSS', "Voter's ID"];

  const handleSubmit = () => {
    if (!firstName || !lastName || !email || !phone) {
      Alert.alert('Required', 'Please fill in all required fields.');
      return;
    }
    Alert.alert('KYC Submitted', 'Your identity verification is being processed. This typically takes 1-2 business days.');
  };

  return (
    <ScrollView style={s.container}>
      {/* Status */}
      <View style={s.statusCard}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>🛡️</Text>
        <Text style={s.statusTitle}>Identity Verification</Text>
        <Text style={s.statusDesc}>Complete KYC to unlock higher transaction limits and send payments to others.</Text>
        <View style={s.steps}>
          <View style={[s.step, s.stepDone]} /><View style={[s.step, s.stepDone]} /><View style={[s.step, s.stepActive]} /><View style={s.step} />
        </View>
        <Text style={s.stepText}>✅ Basic • ✅ Phone verified • ⏳ ID pending • ○ Enhanced</Text>
      </View>

      {/* Form */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Personal Information</Text>
        <View style={s.field}><Text style={s.label}>First Name *</Text><TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="Juan" placeholderTextColor="#636366" /></View>
        <View style={s.field}><Text style={s.label}>Last Name *</Text><TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Dela Cruz" placeholderTextColor="#636366" /></View>
        <View style={s.field}><Text style={s.label}>Email *</Text><TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor="#636366" keyboardType="email-address" autoCapitalize="none" /></View>
        <View style={s.field}><Text style={s.label}>Phone *</Text><TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+639171234567" placeholderTextColor="#636366" keyboardType="phone-pad" /></View>
        <View style={s.field}><Text style={s.label}>Date of Birth</Text><TextInput style={s.input} value={birthday} onChangeText={setBirthday} placeholder="YYYY-MM-DD" placeholderTextColor="#636366" /></View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Government ID</Text>
        <View style={s.field}><Text style={s.label}>ID Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {idTypes.map(t => (
              <TouchableOpacity key={t} onPress={() => setIdType(t)} style={[s.chip, idType === t && s.chipActive]}>
                <Text style={[s.chipText, idType === t && s.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={s.field}><Text style={s.label}>ID Number</Text><TextInput style={s.input} value={idNumber} onChangeText={setIdNumber} placeholder="Enter ID number" placeholderTextColor="#636366" /></View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Document Upload</Text>
        <View style={s.uploadRow}>
          <TouchableOpacity style={s.uploadBtn}><Text style={s.uploadIcon}>📸</Text><Text style={s.uploadLabel}>ID Front</Text></TouchableOpacity>
          <TouchableOpacity style={s.uploadBtn}><Text style={s.uploadIcon}>🤳</Text><Text style={s.uploadLabel}>Selfie</Text></TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit}>
        <Text style={s.submitText}>Submit Verification</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  statusCard: { margin: 16, padding: 24, backgroundColor: '#1C1C1E', borderRadius: 20, alignItems: 'center' },
  statusTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  statusDesc: { color: '#8E8E93', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  steps: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  step: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3A3A3C' },
  stepDone: { backgroundColor: '#30D158' },
  stepActive: { backgroundColor: '#FFB800' },
  stepText: { color: '#8E8E93', fontSize: 11 },
  card: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: '#1C1C1E', borderRadius: 16 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { color: '#8E8E93', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#2C2C2E', borderRadius: 10, padding: 14, color: '#fff', fontSize: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#2C2C2E', marginRight: 8 },
  chipActive: { backgroundColor: '#0A84FF' },
  chipText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  uploadRow: { flexDirection: 'row', gap: 12 },
  uploadBtn: { flex: 1, padding: 24, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#3A3A3C', alignItems: 'center', gap: 6 },
  uploadIcon: { fontSize: 28 },
  uploadLabel: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  submitBtn: { marginHorizontal: 16, padding: 16, backgroundColor: '#0A84FF', borderRadius: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
