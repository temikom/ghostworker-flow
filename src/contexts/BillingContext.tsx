import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlanTier, Subscription, UsageStats, getPlanById, PLANS } from '@/types/billing';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface BillingContextType {
  subscription: Subscription | null;
  usage: UsageStats;
  isLoading: boolean;
  currentPlan: PlanTier;
  canUseFeature: (feature: keyof UsageStats) => boolean;
  getUsagePercent: (feature: keyof UsageStats) => number;
  isAtLimit: (feature: keyof UsageStats) => boolean;
  createCheckoutSession: (planId: PlanTier, yearly?: boolean) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refreshBilling: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

// Mock data for development
const MOCK_SUBSCRIPTION: Subscription = {
  id: 'sub_mock_123',
  planId: 'free',
  status: 'active',
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
};

const MOCK_USAGE: UsageStats = {
  conversations: 45,
  messagesThisMonth: 320,
  integrations: 1,
  teamMembers: 1,
  apiCalls: 156,
  storageUsed: 25,
};

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats>(MOCK_USAGE);
  const [isLoading, setIsLoading] = useState(true);

  const currentPlan = subscription?.planId || 'free';

  const fetchBillingData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Replace with real API call when Stripe is configured
      // const response = await api.get('/billing/subscription');
      // setSubscription(response.data.subscription);
      // setUsage(response.data.usage);
      
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 500));
      setSubscription(MOCK_SUBSCRIPTION);
      setUsage(MOCK_USAGE);
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const canUseFeature = useCallback((feature: keyof UsageStats): boolean => {
    const plan = getPlanById(currentPlan);
    const limit = plan.limits[feature === 'messagesThisMonth' ? 'messagesPerMonth' : feature === 'storageUsed' ? 'storage' : feature];
    if (limit === -1) return true; // Unlimited
    return usage[feature] < limit;
  }, [currentPlan, usage]);

  const getUsagePercent = useCallback((feature: keyof UsageStats): number => {
    const plan = getPlanById(currentPlan);
    const limitKey = feature === 'messagesThisMonth' ? 'messagesPerMonth' : feature === 'storageUsed' ? 'storage' : feature;
    const limit = plan.limits[limitKey];
    if (limit === -1) return 0; // Unlimited shows as 0%
    return Math.min(100, Math.round((usage[feature] / limit) * 100));
  }, [currentPlan, usage]);

  const isAtLimit = useCallback((feature: keyof UsageStats): boolean => {
    return getUsagePercent(feature) >= 100;
  }, [getUsagePercent]);

  const createCheckoutSession = async (planId: PlanTier, yearly = false) => {
    if (planId === 'enterprise') {
      toast.info('Contact us for Enterprise pricing');
      return;
    }

    try {
      // TODO: Replace with real Stripe checkout
      // const response = await api.post('/billing/checkout', { planId, yearly });
      // window.location.href = response.data.checkoutUrl;
      
      toast.info('Stripe checkout will open when configured. Set VITE_STRIPE_PUBLISHABLE_KEY in your environment.');
      console.log('Would create checkout for:', planId, yearly ? 'yearly' : 'monthly');
    } catch (error) {
      toast.error('Failed to start checkout');
    }
  };

  const openCustomerPortal = async () => {
    try {
      // TODO: Replace with real Stripe portal
      // const response = await api.post('/billing/portal');
      // window.location.href = response.data.portalUrl;
      
      toast.info('Stripe portal will open when configured');
    } catch (error) {
      toast.error('Failed to open billing portal');
    }
  };

  const cancelSubscription = async () => {
    try {
      // TODO: Replace with real API call
      // await api.post('/billing/cancel');
      
      toast.success('Subscription will cancel at end of billing period');
      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: true } : null);
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  return (
    <BillingContext.Provider
      value={{
        subscription,
        usage,
        isLoading,
        currentPlan,
        canUseFeature,
        getUsagePercent,
        isAtLimit,
        createCheckoutSession,
        openCustomerPortal,
        cancelSubscription,
        refreshBilling: fetchBillingData,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
