import React, { useState } from 'react';
import { AuthClient } from '../../services/AuthClient';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function VerificationModal({ isOpen, onClose, email }: VerificationModalProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const authClient = new AuthClient();

  if (!isOpen) return null;

  const handleResendEmail = async () => {
    if (isResending || countdown > 0) return;

    setIsResending(true);
    setResendStatus('idle');
    setMessage('');

    try {
      const response = await authClient.resendConfirmationEmail(email);

      if (response.status === 'success') {
        setResendStatus('success');
        setMessage('Verification email sent! Please check your inbox.');
        
        // Start countdown for rate limiting (60 seconds)
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setResendStatus('error');
        setMessage(response.message || 'Failed to send verification email. Please try again.');
      }
    } catch (error: any) {
      setResendStatus('error');
      
      // Handle rate limiting error
      if (error.response?.status === 429) {
        setMessage('Please wait before requesting another email.');
        
        // Extract time from error message if available
        const timeMatch = error.response?.data?.message?.match(/(\d+)/);
        if (timeMatch && timeMatch[1]) {
          const seconds = parseInt(timeMatch[1], 10);
          setCountdown(seconds);
          
          const timer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        setMessage('An error occurred. Please try again later.');
      }
      
      console.error('Resend verification error:', error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} 
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: 'var(--surface)',
          color: 'var(--text-primary)',
          borderRadius: '8px',
          padding: '24px',
          width: '400px',
          maxWidth: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <h2 style={{ marginTop: 0, color: 'var(--accent)' }}>Verify Your Email</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <p>
            We've sent a verification email to <strong>{email}</strong>. 
            Please check your inbox and click the verification link to activate your account.
          </p>
          <p>
            If you don't see the email, please check your spam folder.
          </p>
        </div>
        
        {resendStatus === 'success' && (
          <div style={{ 
            backgroundColor: 'rgba(0, 255, 0, 0.1)', 
            color: 'green', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            {message}
          </div>
        )}
        
        {resendStatus === 'error' && (
          <div style={{ 
            backgroundColor: 'rgba(255, 0, 0, 0.1)', 
            color: 'red', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            {message}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
          
          <button
            onClick={handleResendEmail}
            disabled={isResending || countdown > 0}
            style={{
              padding: '10px 16px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isResending || countdown > 0 ? 'var(--accent-disabled)' : 'var(--accent)',
              color: 'white',
              cursor: isResending || countdown > 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {isResending ? 'Sending...' : countdown > 0 ? `Resend (${countdown}s)` : 'Resend Email'}
          </button>
        </div>
      </div>
    </div>
  );
} 