import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '@/contexts/BillingContext';
import { getPlanById, PLANS } from '@/types/billing';

interface UpgradePromptProps {
  feature?: string;
  compact?: boolean;
}

const UpgradePrompt = ({ feature, compact = false }: UpgradePromptProps) => {
  const navigate = useNavigate();
  const { currentPlan } = useBilling();
  
  // Find next plan tier
  const planIndex = PLANS.findIndex(p => p.id === currentPlan);
  const nextPlan = PLANS[planIndex + 1];
  
  if (!nextPlan || currentPlan === 'enterprise') return null;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {feature ? `Upgrade to use ${feature}` : `Unlock more with ${nextPlan.name}`}
          </span>
        </div>
        <Button size="sm" onClick={() => navigate('/pricing')}>
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              {feature ? `${feature} requires an upgrade` : `Upgrade to ${nextPlan.name}`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get {nextPlan.limits.conversations === -1 ? 'unlimited' : nextPlan.limits.conversations.toLocaleString()} conversations, 
              {nextPlan.limits.integrations === -1 ? ' unlimited' : ` ${nextPlan.limits.integrations}`} integrations, 
              and {nextPlan.limits.teamMembers === -1 ? 'unlimited' : nextPlan.limits.teamMembers} team members.
            </p>
            <Button onClick={() => navigate('/pricing')} className="gap-2">
              View Plans <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpgradePrompt;
