import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Animated,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  
  const { signInWithGoogle } = useAuth();
  const navigation = useNavigation<any>();
  const scale = useRef(new Animated.Value(1)).current;

  const demoAccounts = [
    { name: 'Kiel Arthur', email: 'kiel.dev@gmail.com', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
    { name: 'Clara Design', email: 'clara.design@gmail.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
    { name: 'Carlos User', email: 'carlos.user@gmail.com', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80' },
  ];

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handleGoogleSignIn = async (name: string, email: string, avatar?: string) => {
    setModalVisible(false);
    setLoading(true);
    try {
      await signInWithGoogle(email.toLowerCase().trim(), name.trim(), avatar);
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An error occurred during Google authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    if (!customName.trim() || !customEmail.trim()) {
      Alert.alert('Validation Error', 'Please fill in both Name and Email.');
      return;
    }
    if (!customEmail.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    handleGoogleSignIn(customName, customEmail);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="wallet-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>SplitPay</Text>
          <Text style={styles.subtitle}>Split expenses. Settle up on Stellar testnet.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get Started</Text>
          <Text style={styles.cardSubtitle}>Sign in to SplitPay to access your custodial Stellar wallet.</Text>

          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={[styles.googleButtonContainer, loading && styles.buttonDisabled]}
            onPress={() => setModalVisible(true)}
            disabled={loading}
          >
            <Animated.View style={[styles.googleButton, { transform: [{ scale }] }]}>
              {loading ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <View style={styles.googleButtonContent}>
                  <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Google Account Chooser Simulator Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setShowCustomForm(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="logo-google" size={24} color="#4285F4" />
              <Text style={styles.modalTitle}>Sign in with Google</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setShowCustomForm(false);
                }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Choose an account to continue to SplitPay</Text>

            {!showCustomForm ? (
              <View style={styles.accountsList}>
                {demoAccounts.map((account, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.accountItem}
                    onPress={() => handleGoogleSignIn(account.name, account.email, account.avatar)}
                  >
                    <Image source={{ uri: account.avatar }} style={styles.accountAvatar} />
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountEmail}>{account.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={16} color={Colors.textLight} />
                  </TouchableOpacity>
                ))}

                <TouchableOpacity 
                  style={[styles.accountItem, styles.useAnotherAccountItem]}
                  onPress={() => setShowCustomForm(true)}
                >
                  <View style={styles.addAccountIconContainer}>
                    <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.useAnotherAccountText}>Use another account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.customForm}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textLight}
                  value={customName}
                  onChangeText={setCustomName}
                />

                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textLight}
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <View style={styles.formActions}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => setShowCustomForm(false)}
                  >
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleCustomSubmit}
                  >
                    <Text style={styles.submitButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#1A2320',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  googleButtonContainer: {
    width: '100%',
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 380,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  accountsList: {
    gap: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
  },
  accountDetails: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  accountEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  useAnotherAccountItem: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  addAccountIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  useAnotherAccountText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Custom Form Styles
  customForm: {
    gap: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: -4,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
