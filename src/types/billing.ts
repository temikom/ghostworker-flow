export type PlanTier = 'free' | 'pro' | 'business' | 'enterprise';

export interface Plan {
  id: PlanTier;
  name: string;
  description: string;
  price: number;
  priceYearly: number;
  currency: string;
  features: string[];
  limits: PlanLimits;
  popular?: boolean;
  stripePriceId?: string;
  stripePriceIdYearly?: string;
}

export interface PlanLimits {
  conversations: number;
  messagesPerMonth: number;
  integrations: number;
  teamMembers: number;
  apiCalls: number;
  storage: number; // in MB
}

export interface Subscription {
  id: string;
  planId: PlanTier;
  status: 'active' | 'canceled' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface UsageStats {
  conversations: number;
  messagesThisMonth: number;
  integrations: number;
  teamMembers: number;
  apiCalls: number;
  storageUsed: number;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    priceYearly: 0,
    currency: 'USD',
    features: [
      '100 conversations/month',
      '1,000 messages/month',
      '1 integration',
      '1 team member',
      'Community support',
    ],
    limits: {
      conversations: 100,
      messagesPerMonth: 1000,
      integrations: 1,
      teamMembers: 1,
      apiCalls: 1000,
      storage: 100,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price: 29,
    priceYearly: 290,
    currency: 'USD',
    popular: true,
    stripePriceId: 'price_pro_monthly',
    stripePriceIdYearly: 'price_pro_yearly',
    features: [
      '1,000 conversations/month',
      '10,000 messages/month',
      '5 integrations',
      '5 team members',
      'Priority support',
      'Analytics dashboard',
    ],
    limits: {
      conversations: 1000,
      messagesPerMonth: 10000,
      integrations: 5,
      teamMembers: 5,
      apiCalls: 10000,
      storage: 1000,
    },
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For scaling teams',
    price: 99,
    priceYearly: 990,
    currency: 'USD',
    stripePriceId: 'price_business_monthly',
    stripePriceIdYearly: 'price_business_yearly',
    features: [
      '10,000 conversations/month',
      '100,000 messages/month',
      'Unlimited integrations',
      '25 team members',
      'Dedicated support',
      'Advanced analytics',
      'Custom workflows',
    ],
    limits: {
      conversations: 10000,
      messagesPerMonth: 100000,
      integrations: -1,
      teamMembers: 25,
      apiCalls: 100000,
      storage: 10000,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions',
    price: -1,
    priceYearly: -1,
    currency: 'USD',
    stripePriceId: 'price_enterprise',
    features: [
      'Unlimited conversations',
      'Unlimited messages',
      'Unlimited integrations',
      'Unlimited team members',
      '24/7 dedicated support',
      'Custom SLA',
      'On-premise option',
      'SSO & SAML',
    ],
    limits: {
      conversations: -1,
      messagesPerMonth: -1,
      integrations: -1,
      teamMembers: -1,
      apiCalls: -1,
      storage: -1,
    },
  },
];

export const getPlanById = (id: PlanTier): Plan => {
  return PLANS.find(p => p.id === id) || PLANS[0];
};
