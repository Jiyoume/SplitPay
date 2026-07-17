import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import KYCIntro from './kyc/KYCIntro';
import KYCPersonalInfo from './kyc/KYCPersonalInfo';
import KYCUploadID from './kyc/KYCUploadID';
import KYCSelfie from './kyc/KYCSelfie';

type Step = 'intro' | 'personal' | 'id' | 'selfie';

export default function KYCScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('intro');

  const handleBack = () => {
    if (step === 'personal') setStep('intro');
    else if (step === 'id') setStep('personal');
    else if (step === 'selfie') setStep('id');
  };

  const handleDone = () => {
    // End of KYC flow, pop back to previous screen
    navigation.goBack();
  };

  switch (step) {
    case 'intro':
      return <KYCIntro onStart={() => setStep('personal')} onLater={() => navigation.goBack()} />;
    case 'personal':
      return <KYCPersonalInfo onNext={() => setStep('id')} onBack={handleBack} />;
    case 'id':
      return <KYCUploadID onNext={() => setStep('selfie')} onBack={handleBack} />;
    case 'selfie':
      return <KYCSelfie onNext={handleDone} onBack={handleBack} />;
    default:
      return <View />;
  }
}
