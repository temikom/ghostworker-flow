import { useBilling } from '@/contexts/BillingContext';
import { UsageStats } from '@/types/billing';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const useFeatureGate = () => {
  const { canUseFeature, isAtLimit, getUsagePercent, currentPlan } = useBilling();
  const navigate = useNavigate();

  const checkFeature = useCallback((
    feature: keyof UsageStats,
    options?: { showToast?: boolean; redirect?: boolean }
  ): boolean => {
    const { showToast = true, redirect = false } = options || {};
    
    if (!canUseFeature(feature)) {
      if (showToast) {
        const featureNames: Record<keyof UsageStats, string> = {
          conversations: 'conversations',
          messagesThisMonth: 'messages',
          integrations: 'integrations',
          teamMembers: 'team members',
          apiCalls: 'API calls',
          storageUsed: 'storage',
        };
        
        toast.error(`You've reached your ${featureNames[feature]} limit`, {
          description: 'Upgrade your plan to continue',
          action: {
            label: 'Upgrade',
            onClick: () => navigate('/pricing'),
          },
        });
      }
      
      if (redirect) {
        navigate('/pricing');
      }
      
      return false;
    }
    
    return true;
  }, [canUseFeature, navigate]);

  const warnIfNearLimit = useCallback((
    feature: keyof UsageStats,
    threshold = 80
  ): void => {
    const percent = getUsagePercent(feature);
    
    if (percent >= threshold && percent < 100) {
      const featureNames: Record<keyof UsageStats, string> = {
        conversations: 'conversations',
        messagesThisMonth: 'messages',
        integrations: 'integrations',
        teamMembers: 'team members',
        apiCalls: 'API calls',
        storageUsed: 'storage',
      };
      
      toast.warning(`You're at ${percent}% of your ${featureNames[feature]} limit`, {
        description: 'Consider upgrading to avoid interruptions',
        action: {
          label: 'View Plans',
          onClick: () => navigate('/pricing'),
        },
      });
    }
  }, [getUsagePercent, navigate]);

  return {
    checkFeature,
    warnIfNearLimit,
    canUseFeature,
    isAtLimit,
    getUsagePercent,
    currentPlan,
  };
};
