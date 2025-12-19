/**
 * Email verification page - handles token from email link
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { authApi, getErrorMessage } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';

type VerificationState = 'loading' | 'success' | 'expired' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setState('error');
        setErrorMessage('Invalid verification link.');
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setState('success');
      } catch (error) {
        const message = getErrorMessage(error);
        if (message.toLowerCase().includes('expired')) {
          setState('expired');
        } else {
          setState('error');
        }
        setErrorMessage(message);
      }
    };

    verify();
  }, [token]);

  const handleResend = async () => {
    if (!email) {
      navigate('/signup');
      return;
    }

    try {
      await authApi.resendVerification(email);
      setState('loading');
      setErrorMessage('');
      // Show a message that a new email was sent
      setTimeout(() => {
        setState('error');
        setErrorMessage('A new verification email has been sent. Please check your inbox.');
      }, 1000);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-ghost/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-ghost animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Verifying your email...
              </h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your email address.
              </p>
            </div>
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Email verified!
              </h2>
              <p className="text-muted-foreground">
                Your account is now active. You can sign in to access your dashboard.
              </p>
            </div>
            <Button variant="brand" className="w-full" size="lg" asChild>
              <Link to="/login">
                Sign in to your account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        );

      case 'expired':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
              <Mail className="w-10 h-10 text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Link expired
              </h2>
              <p className="text-muted-foreground">
                This verification link has expired. Links are valid for 15 minutes.
              </p>
            </div>
            <div className="space-y-3">
              {email ? (
                <Button variant="brand" className="w-full" size="lg" onClick={handleResend}>
                  Send new verification email
                </Button>
              ) : (
                <Button variant="brand" className="w-full" size="lg" asChild>
                  <Link to="/signup">Sign up again</Link>
                </Button>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Verification failed
              </h2>
              <p className="text-muted-foreground">
                {errorMessage || 'Something went wrong. Please try again.'}
              </p>
            </div>
            <div className="space-y-3">
              <Button variant="brand" className="w-full" size="lg" asChild>
                <Link to="/signup">Try signing up again</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <AuthLayout title="Email Verification" subtitle="">
      {renderContent()}
    </AuthLayout>
  );
}
