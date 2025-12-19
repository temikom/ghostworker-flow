import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlanTier, Subscription, UsageStats, getPlanById } from '@/types/billing';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { billingApi, getErrorMessage } from '@/lib/api';

interface BillingContextType {
  subscription: Subscription | null;
  usage: UsageStats;
  isLoading: boolean;
  currentPlan: PlanTier;
  canUseFeature: (feature: keyof UsageStats) => boolean;
  getUsagePercent: (feature: keyof UsageStats) => number;
  isAtLimit: (feature: keyof UsageStats) => boolean;
  createCheckoutSession: (planId: PlanTier, yearly?: boolean) => Promise<void>;
  initializePaystackPayment: (amount: number, description: string) => Promise<void>;
  initializeCoinbasePayment: (amount: number, description: string, type?: 'subscription' | 'one_time', planId?: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  changePlan: (planId: string, billingCycle?: 'monthly' | 'yearly') => Promise<void>;
  refreshBilling: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

const DEFAULT_USAGE: UsageStats = {
  conversations: 0,
  messagesThisMonth: 0,
  integrations: 0,
  teamMembers: 1,
  apiCalls: 0,
  storageUsed: 0,
};

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats>(DEFAULT_USAGE);
  const [isLoading, setIsLoading] = useState(true);

  const currentPlan = (subscription?.planId || 'free') as PlanTier;

  const fetchBillingData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(DEFAULT_USAGE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [subscriptionData, usageData] = await Promise.all([
        billingApi.getSubscription().catch(() => null),
        billingApi.getUsageStats().catch(() => null),
      ]);

      if (subscriptionData) {
        setSubscription({
          id: subscriptionData.id,
          planId: subscriptionData.plan_id as PlanTier,
          status: subscriptionData.status,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: subscriptionData.current_period_end,
          cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
        });
      } else {
        // Default to free plan
        setSubscription({
          id: 'default',
          planId: 'free',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
        });
      }

      if (usageData) {
        setUsage({
          conversations: usageData.conversations_count,
          messagesThisMonth: usageData.messages_count,
          integrations: 0,
          teamMembers: 1,
          apiCalls: 0,
          storageUsed: usageData.storage_used_mb,
        });
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      // Set default free plan on error
      setSubscription({
        id: 'default',
        planId: 'free',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      });
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
    if (limit === -1) return true;
    return usage[feature] < limit;
  }, [currentPlan, usage]);

  const getUsagePercent = useCallback((feature: keyof UsageStats): number => {
    const plan = getPlanById(currentPlan);
    const limitKey = feature === 'messagesThisMonth' ? 'messagesPerMonth' : feature === 'storageUsed' ? 'storage' : feature;
    const limit = plan.limits[limitKey];
    if (limit === -1) return 0;
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
      const response = await billingApi.createSubscription({
        plan_id: planId,
        billing_cycle: yearly ? 'yearly' : 'monthly',
      });
      
      // Redirect to Paystack checkout
      if (response.authorization_url) {
        window.location.href = response.authorization_url;
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const initializePaystackPayment = async (amount: number, description: string) => {
    try {
      const response = await billingApi.initializePaystackPayment({
        amount,
        description,
      });
      
      if (response.authorization_url) {
        window.location.href = response.authorization_url;
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const initializeCoinbasePayment = async (
    amount: number, 
    description: string, 
    type: 'subscription' | 'one_time' = 'one_time',
    planId?: string
  ) => {
    try {
      const response = await billingApi.createCoinbaseCharge({
        amount,
        description,
        type,
        plan_id: planId,
      });
      
      if (response.hosted_url) {
        window.location.href = response.hosted_url;
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const openCustomerPortal = async () => {
    toast.info('Payment portal functionality - redirecting to billing settings');
  };

  const cancelSubscription = async () => {
    try {
      await billingApi.cancelSubscription();
      toast.success('Subscription will cancel at end of billing period');
      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: true } : null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const resumeSubscription = async () => {
    try {
      const response = await billingApi.resumeSubscription();
      toast.success('Subscription resumed successfully');
      setSubscription(prev => prev ? { 
        ...prev, 
        cancelAtPeriodEnd: false,
        status: response.status,
      } : null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const changePlan = async (planId: string, billingCycle?: 'monthly' | 'yearly') => {
    try {
      const response = await billingApi.changePlan({ plan_id: planId, billing_cycle: billingCycle });
      toast.success(response.message);
      await fetchBillingData();
    } catch (error) {
      toast.error(getErrorMessage(error));
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
        initializePaystackPayment,
        initializeCoinbasePayment,
        openCustomerPortal,
        cancelSubscription,
        resumeSubscription,
        changePlan,
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
