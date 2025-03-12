import React, { useState } from 'react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onRegister: (name: string, email: string, password: string) => void;
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin, onRegister }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    // Call the register function
    onRegister(name, email, password);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '400px',
          maxWidth: '90%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        <h2 style={{ marginTop: 0, color: 'var(--blue)' }}>Create Account</h2>
        
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(255, 0, 0, 0.1)', 
            color: 'red', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="name" 
              style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: 'bold' 
              }}
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
              placeholder="Enter your name"
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="email" 
              style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: 'bold' 
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
              placeholder="Enter your email"
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: 'bold' 
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
              placeholder="Create a password"
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="confirmPassword" 
              style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontWeight: 'bold' 
              }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
              placeholder="Confirm your password"
            />
          </div>
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--blue)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            Create Account
          </button>
        </form>
        
        <div style={{ textAlign: 'center' }}>
          <p>
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--blue)',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
                textDecoration: 'underline'
              }}
            >
              Log In
            </button>
          </p>
        </div>
        
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
} 