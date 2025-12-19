import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { billingApi, getErrorMessage } from '@/lib/api';
import { useBilling } from '@/contexts/BillingContext';

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'cancelled';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshBilling } = useBilling();
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [message, setMessage] = useState('');

  // Get params from URL
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const provider = searchParams.get('provider') || 'paystack';
  const chargeId = searchParams.get('charge_id');
  const cancelled = searchParams.get('cancelled') === 'true';

  useEffect(() => {
    const verifyPayment = async () => {
      // Handle cancelled payment
      if (cancelled) {
        setStatus('cancelled');
        setMessage('Payment was cancelled. No charges were made.');
        return;
      }

      // Need reference or charge_id to verify
      if (!reference && !chargeId) {
        setStatus('failed');
        setMessage('Invalid payment reference. Please try again.');
        return;
      }

      try {
        if (provider === 'paystack' && reference) {
          // Verify Paystack payment
          const result = await billingApi.verifyPaystackPayment(reference);
          
          if (result.status === 'success') {
            setStatus('success');
            setMessage('Payment successful! Your subscription is now active.');
            await refreshBilling();
          } else {
            setStatus('failed');
            setMessage(result.message || 'Payment verification failed. Please contact support.');
          }
        } else if (provider === 'coinbase' && chargeId) {
          // Coinbase payments are verified via webhook
          // Just show success message as user was redirected back
          setStatus('success');
          setMessage('Payment initiated! Your subscription will be activated once the payment is confirmed on the blockchain.');
          await refreshBilling();
        } else {
          setStatus('failed');
          setMessage('Unknown payment provider. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(getErrorMessage(error));
      }
    };

    verifyPayment();
  }, [reference, chargeId, provider, cancelled, refreshBilling]);

  const statusConfig: Record<PaymentStatus, {
    icon: React.ReactNode;
    title: string;
    description: string;
    showButton: boolean;
    buttonText?: string;
    buttonAction?: () => void;
  }> = {
    verifying: {
      icon: <Loader2 className="h-16 w-16 text-primary animate-spin" />,
      title: 'Verifying Payment',
      description: 'Please wait while we verify your payment...',
      showButton: false,
    },
    success: {
      icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
      title: 'Payment Successful!',
      description: message,
      showButton: true,
      buttonText: 'Go to Dashboard',
      buttonAction: () => navigate('/dashboard'),
    },
    failed: {
      icon: <XCircle className="h-16 w-16 text-destructive" />,
      title: 'Payment Failed',
      description: message,
      showButton: true,
      buttonText: 'Try Again',
      buttonAction: () => navigate('/dashboard/billing'),
    },
    cancelled: {
      icon: <XCircle className="h-16 w-16 text-muted-foreground" />,
      title: 'Payment Cancelled',
      description: message,
      showButton: true,
      buttonText: 'Return to Billing',
      buttonAction: () => navigate('/dashboard/billing'),
    },
  };

  const config = statusConfig[status];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {config.icon}
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
          <CardDescription className="text-base">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.showButton && (
            <Button 
              onClick={config.buttonAction} 
              className="w-full"
              size="lg"
            >
              {config.buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                A receipt has been sent to your email address.
              </p>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                If you continue to experience issues, please{' '}
                <a href="mailto:support@ghostworker.app" className="text-primary hover:underline">
                  contact support
                </a>
              </p>
            </div>
          )}

          {(status === 'success' || status === 'failed') && reference && (
            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Reference: <span className="font-mono">{reference}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;
