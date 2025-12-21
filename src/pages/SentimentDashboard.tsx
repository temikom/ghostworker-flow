import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Smile, Frown, Meh, Activity, MessageSquare, Calendar, RefreshCw } from 'lucide-react';
import { sentimentApi, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { SentimentDashboardData, SentimentTrend } from '@/types/advanced';

// Mock data for development
const MOCK_DASHBOARD_DATA: SentimentDashboardData = {
  overall: {
    positive: 65,
    negative: 15,
    neutral: 20,
    averageScore: 0.72,
  },
  trends: Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      positive: 50 + Math.random() * 30,
      negative: 10 + Math.random() * 15,
      neutral: 15 + Math.random() * 15,
      averageScore: 0.5 + Math.random() * 0.4,
    };
  }),
  topKeywords: [
    { keyword: 'great service', count: 145, sentiment: 'positive' },
    { keyword: 'fast delivery', count: 98, sentiment: 'positive' },
    { keyword: 'helpful', count: 87, sentiment: 'positive' },
    { keyword: 'delayed', count: 34, sentiment: 'negative' },
    { keyword: 'confused', count: 28, sentiment: 'negative' },
    { keyword: 'okay', count: 56, sentiment: 'neutral' },
  ],
  recentConversations: [
    {
      id: '1',
      conversationId: 'conv_1',
      overallSentiment: 'positive',
      sentimentScore: 0.85,
      emotionBreakdown: { joy: 0.7, anger: 0.05, sadness: 0.05, fear: 0.05, surprise: 0.15 },
      keywords: ['happy', 'satisfied', 'recommend'],
      analyzedAt: new Date().toISOString(),
    },
    {
      id: '2',
      conversationId: 'conv_2',
      overallSentiment: 'negative',
      sentimentScore: 0.25,
      emotionBreakdown: { joy: 0.1, anger: 0.5, sadness: 0.2, fear: 0.1, surprise: 0.1 },
      keywords: ['frustrated', 'waiting', 'issue'],
      analyzedAt: new Date().toISOString(),
    },
  ],
};

const SENTIMENT_COLORS = {
  positive: 'hsl(var(--success))',
  negative: 'hsl(var(--destructive))',
  neutral: 'hsl(var(--muted-foreground))',
};

const SentimentDashboard = () => {
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('30');
  const [data, setData] = useState<SentimentDashboardData>(MOCK_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await sentimentApi.getDashboard({ startDate, endDate });
      setData(response);
    } catch (error) {
      console.error('Failed to fetch sentiment data:', error);
      // Use mock data on error
      setData(MOCK_DASHBOARD_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="h-5 w-5 text-success" />;
      case 'negative':
        return <Frown className="h-5 w-5 text-destructive" />;
      default:
        return <Meh className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const pieData = [
    { name: 'Positive', value: data.overall.positive, color: SENTIMENT_COLORS.positive },
    { name: 'Negative', value: data.overall.negative, color: SENTIMENT_COLORS.negative },
    { name: 'Neutral', value: data.overall.neutral, color: SENTIMENT_COLORS.neutral },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Sentiment Analysis</h1>
            <p className="text-muted-foreground">AI-powered insights into customer emotions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Positive</CardTitle>
              <Smile className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{data.overall.positive}%</div>
              <Progress value={data.overall.positive} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Negative</CardTitle>
              <Frown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{data.overall.negative}%</div>
              <Progress value={data.overall.negative} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Neutral</CardTitle>
              <Meh className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overall.neutral}%</div>
              <Progress value={data.overall.neutral} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <Activity className="h-4 w-4 text-ghost" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(data.overall.averageScore * 100).toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.overall.averageScore > 0.6 ? (
                  <span className="flex items-center text-success">
                    <TrendingUp className="h-3 w-3 mr-1" /> Above average
                  </span>
                ) : (
                  <span className="flex items-center text-warning">
                    <TrendingDown className="h-3 w-3 mr-1" /> Needs improvement
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sentiment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Distribution</CardTitle>
              <CardDescription>Overall breakdown of customer sentiment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Trends</CardTitle>
              <CardDescription>How sentiment has changed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trends.slice(-parseInt(timeRange))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip labelFormatter={formatDate} />
                    <Legend />
                    <Line type="monotone" dataKey="positive" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} dot={false} name="Positive" />
                    <Line type="monotone" dataKey="negative" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} dot={false} name="Negative" />
                    <Line type="monotone" dataKey="neutral" stroke={SENTIMENT_COLORS.neutral} strokeWidth={2} dot={false} name="Neutral" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Keywords & Recent Conversations */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Keywords */}
          <Card>
            <CardHeader>
              <CardTitle>Top Keywords</CardTitle>
              <CardDescription>Most frequently mentioned terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topKeywords.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSentimentIcon(item.sentiment)}
                      <span className="font-medium">{item.keyword}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.sentiment === 'positive' ? 'default' : item.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                        {item.sentiment}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Analyses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Analyses</CardTitle>
              <CardDescription>Latest conversation sentiment results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentConversations.map((conv) => (
                  <div key={conv.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(conv.overallSentiment)}
                        <span className="font-medium capitalize">{conv.overallSentiment}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Score: {(conv.sentimentScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {conv.keywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conv.analyzedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SentimentDashboard;
