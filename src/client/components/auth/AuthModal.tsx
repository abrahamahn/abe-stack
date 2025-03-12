import React, { useState } from 'react';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import { useAuth } from './AuthContext';
import './auth-modals.css';

export type AuthModalType = 'login' | 'register' | null;

interface AuthModalProps {
  isOpen: boolean;
  modalType: AuthModalType;
  onClose: () => void;
}

export function AuthModal({ isOpen, modalType, onClose }: AuthModalProps) {
  const [activeModal, setActiveModal] = useState<AuthModalType>(modalType);
  const { login, register } = useAuth();
  
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
  
  const handleRegister = async (name: string, email: string, password: string) => {
    try {
      await register(name, email, password);
      onClose();
    } catch (error) {
      // Error is handled in the AuthContext
      console.error('Registration failed:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <LoginModal 
        isOpen={activeModal === 'login'} 
        onClose={onClose}
        onSwitchToRegister={handleSwitchToRegister}
        onLogin={handleLogin}
      />
      
      <RegisterModal 
        isOpen={activeModal === 'register'} 
        onClose={onClose}
        onSwitchToLogin={handleSwitchToLogin}
        onRegister={handleRegister}
      />
    </>
  );
} 