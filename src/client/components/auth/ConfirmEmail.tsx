import React, { useEffect, useState } from 'react';
import { useRouter } from '../../services/Router';
import { AuthClient } from '../../services/AuthClient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

/**
 * Email confirmation component
 * Handles email verification using token from URL
 */
export const ConfirmEmail: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const router = useRouter();
  const authClient = new AuthClient();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. No token provided.');
          return;
        }

        // Call API to verify email
        const response = await authClient.confirmEmail(token);
        
        if (response.status === 'success') {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.navigate('/auth/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Failed to verify email. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
        console.error('Email verification error:', error);
      }
    };

    confirmEmail();
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-6">Email Verification</h1>
          
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Spinner size="lg" className="mb-4" />
              <p>{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <p className="mb-6">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to login page...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">✗</div>
              <p className="mb-6">{message}</p>
              <Button 
                onClick={() => router.navigate('/auth/login')}
                variant="primary"
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 