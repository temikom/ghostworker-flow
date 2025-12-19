import { useState } from 'react';
import { CreditCard, ExternalLink, AlertCircle, FileText, Bitcoin, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBilling } from '@/contexts/BillingContext';
import { getPlanById, PLANS, PlanTier } from '@/types/billing';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { toast } from 'sonner';

type PaymentMethod = 'paystack' | 'coinbase';

const Billing = () => {
  const { 
    subscription, 
    usage, 
    isLoading, 
    currentPlan, 
    getUsagePercent, 
    isAtLimit,
    cancelSubscription,
    resumeSubscription,
    createCheckoutSession,
    initializePaystackPayment,
    initializeCoinbasePayment,
  } = useBilling();
  const navigate = useNavigate();
  const plan = getPlanById(currentPlan);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paystack');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const availablePlans = PLANS.filter(p => p.id !== 'free' && p.id !== currentPlan);

  const openUpgradeModal = (planId?: PlanTier) => {
    setSelectedPlan(planId || (availablePlans[0]?.id as PlanTier));
    setIsPaymentModalOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    const planDetails = getPlanById(selectedPlan);
    const amount = billingCycle === 'yearly' ? planDetails.priceYearly : planDetails.price;

    try {
      if (paymentMethod === 'paystack') {
        await createCheckoutSession(selectedPlan, billingCycle === 'yearly');
      } else {
        await initializeCoinbasePayment(
          amount,
          `${planDetails.name} Plan - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
          'subscription',
          selectedPlan
        );
      }
      setIsPaymentModalOpen(false);
    } catch (error) {
      toast.error('Failed to initialize payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSelectedPlanPrice = () => {
    if (!selectedPlan) return { monthly: 0, yearly: 0 };
    const planDetails = getPlanById(selectedPlan);
    return {
      monthly: planDetails.price,
      yearly: planDetails.priceYearly,
    };
  };

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
            <AlertDescription className="flex items-center justify-between">
              <span>
                Your subscription will cancel on {formatDate(subscription.currentPeriodEnd)}. 
                You'll be downgraded to Free after this date.
              </span>
              <Button variant="outline" size="sm" onClick={resumeSubscription}>
                Resume Subscription
              </Button>
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
              <Button onClick={() => openUpgradeModal()} className="w-full">
                {currentPlan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Choose your preferred payment method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-sm">Paystack</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Card, Bank Transfer, USSD</p>
                </div>
                <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Bitcoin className="h-5 w-5 text-orange-500" />
                    <span className="font-medium text-sm">Crypto</span>
                  </div>
                  <p className="text-xs text-muted-foreground">BTC, ETH, USDC & more</p>
                </div>
              </div>
              
              {currentPlan !== 'free' && (
                <Link to="/dashboard/invoices" className="block">
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

      {/* Payment Method Selection Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select your preferred payment method and billing cycle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Plan Selection */}
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <Select value={selectedPlan || ''} onValueChange={(v) => setSelectedPlan(v as PlanTier)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - ${p.price}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <RadioGroup value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span>Monthly</span>
                      <span className="font-semibold">${getSelectedPlanPrice().monthly}/mo</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg bg-primary/5 border-primary/20">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <span>Yearly</span>
                        <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
                      </div>
                      <span className="font-semibold">${Math.round(getSelectedPlanPrice().yearly / 12)}/mo</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <div 
                  className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'paystack' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setPaymentMethod('paystack')}
                >
                  <RadioGroupItem value="paystack" id="paystack" />
                  <Building2 className="h-6 w-6 text-green-600" />
                  <div className="flex-1">
                    <Label htmlFor="paystack" className="font-medium cursor-pointer">Paystack</Label>
                    <p className="text-xs text-muted-foreground">Card, Bank Transfer, USSD, Mobile Money</p>
                  </div>
                </div>
                <div 
                  className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'coinbase' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setPaymentMethod('coinbase')}
                >
                  <RadioGroupItem value="coinbase" id="coinbase" />
                  <Bitcoin className="h-6 w-6 text-orange-500" />
                  <div className="flex-1">
                    <Label htmlFor="coinbase" className="font-medium cursor-pointer">Coinbase Commerce</Label>
                    <p className="text-xs text-muted-foreground">Bitcoin, Ethereum, USDC, and more</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing || !selectedPlan}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${billingCycle === 'yearly' 
                  ? `$${getSelectedPlanPrice().yearly}` 
                  : `$${getSelectedPlanPrice().monthly}`
                }`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Billing;
