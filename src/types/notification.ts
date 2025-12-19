export type NotificationType = 'message' | 'team_invite' | 'integration' | 'billing' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// Mock notifications for development
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: 'New message from WhatsApp',
    description: 'Customer inquiry about order #1234',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
    actionUrl: '/dashboard/conversations',
  },
  {
    id: '2',
    type: 'team_invite',
    title: 'Team invitation accepted',
    description: 'Jordan Lee joined your workspace',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    actionUrl: '/dashboard/team',
  },
  {
    id: '3',
    type: 'integration',
    title: 'Instagram connected',
    description: 'Your Instagram Business account is now active',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionUrl: '/dashboard/integrations',
  },
  {
    id: '4',
    type: 'billing',
    title: 'Payment successful',
    description: 'Your Pro plan subscription has been renewed',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionUrl: '/dashboard/billing',
  },
  {
    id: '5',
    type: 'system',
    title: 'Usage alert',
    description: "You've used 80% of your message quota",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    actionUrl: '/dashboard/billing',
  },
];
