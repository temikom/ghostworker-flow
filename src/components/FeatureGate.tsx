import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useBilling } from '@/contexts/BillingContext';
import { UsageStats, getPlanById, PLANS, PlanTier } from '@/types/billing';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGateProps {
  feature: keyof UsageStats;
  children: ReactNode;
  fallback?: ReactNode;
  requiredPlan?: PlanTier;
}

const FeatureGate = ({ feature, children, fallback, requiredPlan }: FeatureGateProps) => {
  const { canUseFeature, currentPlan } = useBilling();

  // Check if feature requires a specific plan
  if (requiredPlan) {
    const planOrder: PlanTier[] = ['free', 'pro', 'business', 'enterprise'];
    const currentPlanIndex = planOrder.indexOf(currentPlan);
    const requiredPlanIndex = planOrder.indexOf(requiredPlan);

    if (currentPlanIndex < requiredPlanIndex) {
      return fallback || (
        <UpgradePrompt feature={`${getPlanById(requiredPlan).name} features`} />
      );
    }
  }

  // Check usage limits
  if (!canUseFeature(feature)) {
    return fallback || (
      <UpgradePrompt feature={feature} />
    );
  }

  return <>{children}</>;
};

interface LockedFeatureOverlayProps {
  feature: string;
  children: ReactNode;
  locked?: boolean;
}

export const LockedFeatureOverlay = ({ feature, children, locked = false }: LockedFeatureOverlayProps) => {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {feature} is locked
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade to unlock this feature
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeatureGate;
