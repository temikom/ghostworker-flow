import { CreditCard, ExternalLink, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBilling } from '@/contexts/BillingContext';
import { getPlanById, PLANS } from '@/types/billing';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';

const Billing = () => {
  const { 
    subscription, 
    usage, 
    isLoading, 
    currentPlan, 
    getUsagePercent, 
    isAtLimit,
    openCustomerPortal,
    cancelSubscription,
    createCheckoutSession
  } = useBilling();
  const navigate = useNavigate();
  const plan = getPlanById(currentPlan);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const usageItems = [
    { key: 'conversations', label: 'Conversations', current: usage.conversations, limit: plan.limits.conversations },
    { key: 'messagesThisMonth', label: 'Messages', current: usage.messagesThisMonth, limit: plan.limits.messagesPerMonth },
    { key: 'integrations', label: 'Integrations', current: usage.integrations, limit: plan.limits.integrations },
    { key: 'teamMembers', label: 'Team Members', current: usage.teamMembers, limit: plan.limits.teamMembers },
    { key: 'apiCalls', label: 'API Calls', current: usage.apiCalls, limit: plan.limits.apiCalls },
    { key: 'storageUsed', label: 'Storage (MB)', current: usage.storageUsed, limit: plan.limits.storage },
  ] as const;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading billing...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and usage</p>
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your subscription will cancel on {formatDate(subscription.currentPeriodEnd)}. 
              You'll be downgraded to Free after this date.
            </AlertDescription>
          </Alert>
        )}

        {isAtLimit('messagesThisMonth') && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your message limit. Upgrade your plan to continue sending messages.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Current Plan
                <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'}>
                  {plan.name}
                </Badge>
              </CardTitle>
              <CardDescription>
                {currentPlan === 'free' 
                  ? 'Upgrade to unlock more features'
                  : `$${plan.price}/month`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription && subscription.planId !== 'free' && (
                <div className="text-sm text-muted-foreground">
                  <p>Status: <span className="capitalize">{subscription.status}</span></p>
                  <p>Next billing: {formatDate(subscription.currentPeriodEnd)}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => navigate('/pricing')} variant="outline" className="flex-1">
                  {currentPlan === 'free' ? 'Upgrade' : 'Change Plan'}
                </Button>
                {currentPlan !== 'free' && (
                  <Button onClick={openCustomerPortal} variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Manage your payment details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlan === 'free' ? (
                <p className="text-sm text-muted-foreground">
                  No payment method required for Free plan
                </p>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                    VISA
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
              )}
              <Button onClick={openCustomerPortal} variant="outline" className="w-full">
                {currentPlan === 'free' ? 'Add Payment Method' : 'Update Payment'}
              </Button>
              {currentPlan !== 'free' && (
                <Link to="/dashboard/invoices" className="block mt-2">
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                    <FileText className="h-4 w-4 mr-2" />
                    View invoice history
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>
              Track your resource consumption against plan limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {usageItems.map((item) => {
                const percent = getUsagePercent(item.key);
                const isUnlimited = item.limit === -1;
                
                return (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground">
                        {item.current.toLocaleString()}
                        {!isUnlimited && ` / ${item.limit.toLocaleString()}`}
                        {isUnlimited && ' (Unlimited)'}
                      </span>
                    </div>
                    <Progress 
                      value={isUnlimited ? 0 : percent} 
                      className={percent >= 90 ? '[&>div]:bg-destructive' : percent >= 75 ? '[&>div]:bg-yellow-500' : ''}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {currentPlan !== 'free' && !subscription?.cancelAtPeriodEnd && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Cancel Subscription</CardTitle>
              <CardDescription>
                Your subscription will remain active until the end of your billing period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={cancelSubscription}
              >
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Billing;
