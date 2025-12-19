import { AlertCircle, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/contexts/BillingContext';
import { UsageStats, getPlanById } from '@/types/billing';
import { useNavigate } from 'react-router-dom';

interface UsageLimitBannerProps {
  feature: keyof UsageStats;
  showProgress?: boolean;
}

const UsageLimitBanner = ({ feature, showProgress = true }: UsageLimitBannerProps) => {
  const { getUsagePercent, usage, currentPlan, isAtLimit } = useBilling();
  const navigate = useNavigate();
  const percent = getUsagePercent(feature);
  const plan = getPlanById(currentPlan);

  const featureConfig: Record<keyof UsageStats, { label: string; limitKey: keyof typeof plan.limits }> = {
    conversations: { label: 'conversations', limitKey: 'conversations' },
    messagesThisMonth: { label: 'messages', limitKey: 'messagesPerMonth' },
    integrations: { label: 'integrations', limitKey: 'integrations' },
    teamMembers: { label: 'team members', limitKey: 'teamMembers' },
    apiCalls: { label: 'API calls', limitKey: 'apiCalls' },
    storageUsed: { label: 'storage (MB)', limitKey: 'storage' },
  };

  const config = featureConfig[feature];
  const limit = plan.limits[config.limitKey];
  const current = usage[feature];

  // Don't show for unlimited features
  if (limit === -1) return null;

  // Show warning at 80%, critical at 95%
  if (percent < 80) return null;

  const isCritical = percent >= 95;
  const isOver = isAtLimit(feature);

  return (
    <Alert variant={isOver ? 'destructive' : 'default'} className={isCritical && !isOver ? 'border-yellow-500 bg-yellow-500/10' : ''}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium">
            {isOver 
              ? `You've reached your ${config.label} limit`
              : `You're running low on ${config.label}`
            }
          </p>
          {showProgress && (
            <div className="mt-2 space-y-1">
              <Progress 
                value={Math.min(100, percent)} 
                className={`h-2 ${isOver ? '[&>div]:bg-destructive' : isCritical ? '[&>div]:bg-yellow-500' : ''}`}
              />
              <p className="text-xs text-muted-foreground">
                {current.toLocaleString()} / {limit.toLocaleString()} used ({percent}%)
              </p>
            </div>
          )}
        </div>
        <Button 
          size="sm" 
          onClick={() => navigate('/pricing')}
          className="shrink-0"
        >
          <TrendingUp className="w-4 h-4 mr-1" />
          Upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default UsageLimitBanner;
