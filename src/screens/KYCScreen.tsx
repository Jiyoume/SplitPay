import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { getKycStatus, submitKyc, KycStatusResponse, KycSubmission } from '../services/kycService';
import { PH_ID_TYPES } from '../models/kyc';

const statusColor = (s?: string) => {
  switch (s) {
    case 'ACCEPTED':
      return Colors.success;
    case 'PROCESSING':
      return Colors.secondary;
    case 'NEEDS_INFO':
      return Colors.warning;
    case 'REJECTED':
      return Colors.error;
    default:
      return Colors.textSecondary;
  }
};

export default function KYCScreen() {
  const { user: currentUser } = useAuth();

  const [status, setStatus] = useState<KycStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [idType, setIdType] = useState<string>('philsys_id');
  const [idNumber, setIdNumber] = useState('');

  useEffect(() => {
    loadStatus();
    if (currentUser?.name) {
      const parts = currentUser.name.trim().split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
    if (currentUser?.email) setEmail(currentUser.email);
    if (currentUser?.phone) setMobileNumber(currentUser.phone);
  }, []);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getKycStatus();
      setStatus(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load verification status.');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'First and last name are required.');
      return;
    }

    setSubmitting(true);
    try {
      const hasAddress = !!(street.trim() || city.trim() || province.trim() || postalCode.trim());
      const profile: KycSubmission = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
        birthDate: birthDate.trim() || undefined,
        address: hasAddress
          ? {
              street: street.trim() || undefined,
              city: city.trim() || undefined,
              province: province.trim() || undefined,
              postalCode: postalCode.trim() || undefined,
              countryCode: 'PHL',
            }
          : undefined,
        idType: idNumber.trim() ? idType : undefined,
        idNumber: idNumber.trim() || undefined,
      };
      const result = await submitKyc(profile);
      setStatus(result);
      Alert.alert(
        result.status === 'ACCEPTED' ? 'Verification Approved' : 'Submitted',
        result.status === 'ACCEPTED'
          ? 'Your identity has been verified.'
          : `Current status: ${result.status.replace('_', ' ')}.`
      );
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'Could not submit your verification details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Verification Status</Text>
              {loadingStatus ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={[styles.statusValue, { color: statusColor(status?.status) }]}>
                  {(status?.status || 'NOT_STARTED').replace('_', ' ')}
                </Text>
              )}
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{(status?.level || 'none').toUpperCase()}</Text>
            </View>
          </View>
          {status?.customerId && <Text style={styles.customerId}>Customer ID: {status.customerId}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Basic Information</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={Colors.textLight}
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={Colors.textLight}
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={Colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="Mobile number (+639...)"
            placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad"
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="Birth date (YYYY-MM-DD)"
            placeholderTextColor={Colors.textLight}
            editable={!submitting}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Address (for higher limits)</Text>
          <TextInput
            style={styles.input}
            value={street}
            onChangeText={setStreet}
            placeholder="Street"
            placeholderTextColor={Colors.textLight}
            editable={!submitting}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={Colors.textLight}
              editable={!submitting}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={province}
              onChangeText={setProvince}
              placeholder="Province"
              placeholderTextColor={Colors.textLight}
              editable={!submitting}
            />
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="Postal code"
            placeholderTextColor={Colors.textLight}
            keyboardType="number-pad"
            editable={!submitting}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Government ID</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {PH_ID_TYPES.map((t) => {
              const isSelected = idType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.idPill, isSelected ? styles.idPillSelected : styles.idPillUnselected]}
                  onPress={() => setIdType(t.value)}
                  disabled={submitting}
                >
                  <Text
                    style={[styles.idPillText, isSelected ? styles.idPillTextSelected : styles.idPillTextUnselected]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TextInput
            style={styles.input}
            value={idNumber}
            onChangeText={setIdNumber}
            placeholder="ID number"
            placeholderTextColor={Colors.textLight}
            editable={!submitting}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Verification</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContainer: { padding: 16, flexGrow: 1, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statusValue: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  levelBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  customerId: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    padding: 14,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  idPill: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
  },
  idPillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.border,
  },
  idPillUnselected: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  idPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  idPillTextSelected: {
    color: Colors.primary,
  },
  idPillTextUnselected: {
    color: Colors.textSecondary,
  },
  submitButton: {
    borderRadius: 6,
    overflow: 'hidden',
    height: 52,
    marginTop: 4,
    marginBottom: 20,
  },
  submitButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
