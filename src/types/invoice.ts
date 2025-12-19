export interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  description: string;
  pdfUrl?: string;
  hostedUrl?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

// Mock invoices for development
export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_001',
    number: 'INV-2024-001',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 2900,
    currency: 'usd',
    status: 'paid',
    description: 'Pro Plan - Monthly',
    pdfUrl: '#',
    hostedUrl: '#',
  },
  {
    id: 'inv_002',
    number: 'INV-2024-002',
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 2900,
    currency: 'usd',
    status: 'paid',
    description: 'Pro Plan - Monthly',
    pdfUrl: '#',
    hostedUrl: '#',
  },
  {
    id: 'inv_003',
    number: 'INV-2024-003',
    date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 2900,
    currency: 'usd',
    status: 'paid',
    description: 'Pro Plan - Monthly',
    pdfUrl: '#',
    hostedUrl: '#',
  },
];
