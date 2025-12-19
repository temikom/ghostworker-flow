import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, MessageSquare, Zap, Calendar, Download, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AnalyticsDataPoint, IntegrationActivity, generateMockAnalytics, MOCK_INTEGRATION_ACTIVITY } from '@/types/analytics';
import { exportToCSV, exportIntegrationsToCSV, generatePDFReport } from '@/lib/export';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('30');
  const [data, setData] = useState<AnalyticsDataPoint[]>([]);
  const [integrationData] = useState<IntegrationActivity[]>(MOCK_INTEGRATION_ACTIVITY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setData(generateMockAnalytics(parseInt(timeRange)));
      setIsLoading(false);
    }, 500);
  }, [timeRange]);

  const totals = data.reduce(
    (acc, d) => ({
      conversations: acc.conversations + d.conversations,
      messages: acc.messages + d.messages,
      apiCalls: acc.apiCalls + d.apiCalls,
    }),
    { conversations: 0, messages: 0, apiCalls: 0 }
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Track your usage and performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  exportToCSV(data, `analytics-${timeRange}days`);
                  toast.success('CSV exported successfully');
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  exportIntegrationsToCSV(integrationData, `integrations-${timeRange}days`);
                  toast.success('Integrations CSV exported');
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Integrations CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  generatePDFReport(data, integrationData, timeRange);
                  toast.success('PDF report generated');
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[160px]">
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.conversations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{Math.round(totals.conversations / parseInt(timeRange))} avg/day
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.messages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{Math.round(totals.messages / parseInt(timeRange))} avg/day
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.apiCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{Math.round(totals.apiCalls / parseInt(timeRange))} avg/day
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conversations & Messages Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Conversation Trends
            </CardTitle>
            <CardDescription>Daily conversations and messages over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={formatDate}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversations" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Conversations"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="hsl(var(--ghost))" 
                    strokeWidth={2}
                    dot={false}
                    name="Messages"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* API Calls Chart */}
          <Card>
            <CardHeader>
              <CardTitle>API Usage</CardTitle>
              <CardDescription>Daily API calls to your integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={formatDate}
                    />
                    <Bar 
                      dataKey="apiCalls" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      name="API Calls"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Integration Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Activity</CardTitle>
              <CardDescription>Messages by integration channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={integrationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="messages"
                      nameKey="name"
                    >
                      {integrationData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Performance</CardTitle>
            <CardDescription>Detailed breakdown by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrationData.map((integration) => (
                <div key={integration.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: integration.color }}
                    />
                    <span className="font-medium">{integration.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>{integration.conversations} conversations</span>
                    <span>{integration.messages.toLocaleString()} messages</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
