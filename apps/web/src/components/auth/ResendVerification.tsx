import React, { useState } from 'react';

import { AuthClient } from '../../services/AuthClient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';

// Define response type
interface VerificationResponse {
  status: 'success' | 'error';
  message?: string;
}

interface ApiResponse {
  success: boolean;
  error?: string;
}

// Define error response type
interface ApiError {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  message: string;
}

/**
 * ResendVerification component
 * Allows users to request a new verification email
 */
export const ResendVerification: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const authClient = new AuthClient();

  const handleSubmitAsync = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Sending verification email...');

      const response = (await authClient.resendConfirmationEmail(email)) as ApiResponse;
      const typedResponse: VerificationResponse = {
        status: response.success ? 'success' : 'error',
      };

      if (typedResponse.status === 'success') {
        setStatus('success');
        setMessage('Verification email sent! Please check your inbox.');

        // Start countdown for rate limiting (60 seconds)
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setStatus('error');
        setMessage(response.error || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      const err = error as ApiError;
      setStatus('error');

      // Handle rate limiting error
      if (err.response?.status === 429) {
        setMessage('Please wait before requesting another email.');

        // Extract time from error message if available
        const timeMatch = err.response?.data?.message?.match(/(\d+)/);
        if (timeMatch && timeMatch[1]) {
          const seconds = parseInt(timeMatch[1], 10);
          setCountdown(seconds);

          const timer = setInterval(() => {
            setCountdown((prev) => {
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

      console.error('Resend verification error:', err);
    }
  };

  // Wrapper function that returns void
  const handleSubmit = (e: React.FormEvent): void => {
    void handleSubmitAsync(e);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Resend Verification Email</h1>
          <p className="text-gray-600 mt-2">
            Enter your email address to receive a new verification link
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading' || countdown > 0}
              required
            />
          </div>

          {status === 'error' && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{message}</div>
          )}

          {status === 'success' && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={status === 'loading' || countdown > 0}
          >
            {status === 'loading' ? (
              <div className="mr-2">
                <Spinner size="sm" />
              </div>
            ) : countdown > 0 ? (
              `Resend (${countdown}s)`
            ) : (
              'Send Verification Email'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};
