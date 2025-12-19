import { useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PLANS, PlanTier } from '@/types/billing';
import { useBilling } from '@/contexts/BillingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';

const Pricing = () => {
  const [yearly, setYearly] = useState(false);
  const { createCheckoutSession, currentPlan } = useBilling();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = async (planId: PlanTier) => {
    if (!user) {
      navigate('/signup');
      return;
    }
    if (planId === currentPlan) return;
    await createCheckoutSession(planId, yearly);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            {user ? (
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <motion.h1 
            className="text-4xl font-bold text-foreground mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p 
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Start free, scale as you grow. No hidden fees, cancel anytime.
          </motion.p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-12">
          <Label htmlFor="billing-toggle" className={yearly ? 'text-muted-foreground' : 'text-foreground'}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={yearly}
            onCheckedChange={setYearly}
          />
          <Label htmlFor="billing-toggle" className={yearly ? 'text-foreground' : 'text-muted-foreground'}>
            Yearly
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Save 17%
            </span>
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative h-full flex flex-col ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    {plan.price === -1 ? (
                      <div className="text-3xl font-bold text-foreground">Custom</div>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-foreground">
                          ${yearly ? Math.round(plan.priceYearly / 12) : plan.price}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                        {yearly && plan.price > 0 && (
                          <div className="text-sm text-muted-foreground mt-1">
                            ${plan.priceYearly} billed yearly
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={plan.id === currentPlan}
                  >
                    {plan.id === currentPlan
                      ? 'Current Plan'
                      : plan.price === -1
                      ? 'Contact Sales'
                      : plan.price === 0
                      ? 'Get Started'
                      : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            All plans include SSL encryption, 99.9% uptime SLA, and GDPR compliance.
          </p>
          <p className="text-sm text-muted-foreground">
            Need help choosing? <a href="mailto:support@ghostworker.app" className="text-primary hover:underline">Contact us</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
