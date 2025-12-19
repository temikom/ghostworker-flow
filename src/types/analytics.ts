export interface AnalyticsDataPoint {
  date: string;
  conversations: number;
  messages: number;
  apiCalls: number;
}

export interface IntegrationActivity {
  name: string;
  messages: number;
  conversations: number;
  color: string;
}

// Mock analytics data for development
export const generateMockAnalytics = (days: number = 30): AnalyticsDataPoint[] => {
  const data: AnalyticsDataPoint[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      conversations: Math.floor(Math.random() * 50) + 10,
      messages: Math.floor(Math.random() * 500) + 100,
      apiCalls: Math.floor(Math.random() * 200) + 50,
    });
  }
  
  return data;
};

export const MOCK_INTEGRATION_ACTIVITY: IntegrationActivity[] = [
  { name: 'WhatsApp', messages: 2450, conversations: 180, color: '#25D366' },
  { name: 'Instagram', messages: 1230, conversations: 95, color: '#E4405F' },
  { name: 'Messenger', messages: 890, conversations: 65, color: '#0084FF' },
  { name: 'Webhooks', messages: 320, conversations: 25, color: '#6B7280' },
];
