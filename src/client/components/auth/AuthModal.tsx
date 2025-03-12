import React, { useState } from 'react';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { VerificationModal } from './VerificationModal';
import { useAuth } from './AuthContext';

export type AuthModalType = 'login' | 'register' | null;

interface AuthModalProps {
  isOpen: boolean;
  modalType: AuthModalType;
  onClose: () => void;
}

export function AuthModal({ isOpen, modalType, onClose }: AuthModalProps) {
  const [activeModal, setActiveModal] = useState<AuthModalType>(modalType);
  const { 
    login, 
    register, 
    showVerificationModal, 
    setShowVerificationModal, 
    verificationEmail 
  } = useAuth();
  
  // Reset active modal when props change
  React.useEffect(() => {
    setActiveModal(modalType);
  }, [modalType]);
  
  const handleSwitchToLogin = () => {
    setActiveModal('login');
  };
  
  const handleSwitchToRegister = () => {
    setActiveModal('register');
  };
  
  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      onClose();
    } catch (error) {
      // Error is handled in the AuthContext
      console.error('Login failed:', error);
    }
  };
  
  const handleRegister = async (username: string, firstName: string, lastName: string, email: string, password: string) => {
    try {
      await register(username, firstName, lastName, email, password);
      // Don't close the modal if verification is needed
      // The verification modal will be shown instead
      if (!showVerificationModal) {
        onClose();
      }
    } catch (error) {
      // Error is handled in the AuthContext
      console.error('Registration failed:', error);
    }
  };
  
  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    onClose();
  };
  
  if (!isOpen && !showVerificationModal) return null;
  
  return (
    <>
      <LoginModal 
        isOpen={activeModal === 'login' && isOpen} 
        onClose={onClose}
        onSwitchToRegister={handleSwitchToRegister}
        onLogin={handleLogin}
      />
      
      <RegisterModal 
        isOpen={activeModal === 'register' && isOpen} 
        onClose={onClose}
        onSwitchToLogin={handleSwitchToLogin}
        onRegister={handleRegister}
      />
      
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={handleCloseVerificationModal}
        email={verificationEmail}
      />
    </>
  );
} 