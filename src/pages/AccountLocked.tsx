/**
 * Account locked page - shown after too many failed login attempts
 */
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authApi, getErrorMessage } from '@/lib/api';
import { Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function AccountLocked() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(email);
      setEmailSent(true);
    } catch (error) {
      toast({
        title: 'Failed to send reset email',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthLayout title="Check your email" subtitle="">
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
              Password reset email sent
            </h2>
            <p className="text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>, 
              you'll receive a password reset link shortly.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              The link expires in 15 minutes. Check your spam folder if you don't see it.
            </p>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign in
            </Link>
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Account Locked" subtitle="">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Too many failed attempts
          </h2>
          <p className="text-muted-foreground">
            Your account has been temporarily locked for security. 
            Reset your password to regain access.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-sm text-warning font-medium">
            Why did this happen?
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            After 5 failed login attempts, accounts are locked to prevent unauthorized access.
          </p>
        </div>

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg" variant="brand" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending reset email...
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link 
            to="/login" 
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
