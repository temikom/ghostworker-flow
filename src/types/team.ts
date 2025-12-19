export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  status: 'active' | 'pending' | 'suspended';
  joinedAt: string;
  lastActiveAt: string;
  usage: TeamMemberUsage;
  avatarUrl?: string;
}

export interface TeamMemberUsage {
  conversations: number;
  messages: number;
  apiCalls: number;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: TeamRole;
  sentAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

// Mock team data for development
export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    email: 'owner@example.com',
    name: 'Alex Johnson',
    role: 'owner',
    status: 'active',
    joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date().toISOString(),
    usage: { conversations: 150, messages: 2300, apiCalls: 450 },
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Sam Wilson',
    role: 'admin',
    status: 'active',
    joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    usage: { conversations: 85, messages: 1200, apiCalls: 280 },
  },
  {
    id: '3',
    email: 'member@example.com',
    name: 'Jordan Lee',
    role: 'member',
    status: 'active',
    joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    usage: { conversations: 42, messages: 580, apiCalls: 120 },
  },
];

export const MOCK_INVITES: TeamInvite[] = [
  {
    id: 'inv_1',
    email: 'newmember@example.com',
    role: 'member',
    sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
];
