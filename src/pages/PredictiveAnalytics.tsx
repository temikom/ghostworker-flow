import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Brain, RefreshCw, Lightbulb, Users, DollarSign, Clock } from 'lucide-react';
import { predictiveApi } from '@/lib/api';
import { toast } from 'sonner';

interface PredictionData {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: string;
}

interface ChurnRisk {
  customerId: string;
  customerName: string;
  riskScore: number;
  riskFactors: string[];
  lastActivity: string;
}

const MOCK_PREDICTIONS: PredictionData[] = [
  { metric: 'Monthly Revenue', currentValue: 45000, predictedValue: 52000, confidence: 85, trend: 'up', timeframe: 'Next 30 days' },
  { metric: 'Ticket Volume', currentValue: 320, predictedValue: 380, confidence: 78, trend: 'up', timeframe: 'Next 7 days' },
  { metric: 'Customer Satisfaction', currentValue: 4.2, predictedValue: 4.4, confidence: 72, trend: 'up', timeframe: 'Next 30 days' },
  { metric: 'Response Time (hrs)', currentValue: 2.5, predictedValue: 2.1, confidence: 81, trend: 'down', timeframe: 'Next 14 days' },
];

const MOCK_CHURN_RISKS: ChurnRisk[] = [
  { customerId: '1', customerName: 'Acme Corp', riskScore: 85, riskFactors: ['Decreased engagement', 'Support tickets up'], lastActivity: '5 days ago' },
  { customerId: '2', customerName: 'TechStart Inc', riskScore: 72, riskFactors: ['Payment delayed', 'Feature usage down'], lastActivity: '3 days ago' },
  { customerId: '3', customerName: 'Global Systems', riskScore: 68, riskFactors: ['Contract renewal due', 'Competitor evaluation'], lastActivity: '1 day ago' },
];

const MOCK_FORECAST_DATA = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  actual: i < 15 ? 40 + Math.random() * 20 : null,
  predicted: 45 + Math.random() * 15 + (i * 0.5),
  lowerBound: 35 + Math.random() * 10 + (i * 0.3),
  upperBound: 55 + Math.random() * 20 + (i * 0.7),
}));

const PredictiveAnalytics = () => {
  const [predictions, setPredictions] = useState<PredictionData[]>(MOCK_PREDICTIONS);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>(MOCK_CHURN_RISKS);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPredictions = async () => {
    setIsLoading(true);
    try {
      const response = await predictiveApi.getInsights();
      // Map response to predictions if API returns data
      console.log('Predictions loaded:', response);
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-destructive';
    if (score >= 60) return 'text-warning';
    return 'text-success';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Predictive Analytics</h1>
            <p className="text-muted-foreground">AI-powered forecasting and insights</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPredictions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Predictions
          </Button>
        </div>

        {/* Prediction Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {predictions.map((pred, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{pred.metric}</CardTitle>
                {getTrendIcon(pred.trend)}
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {typeof pred.predictedValue === 'number' && pred.predictedValue > 1000 
                      ? `$${(pred.predictedValue / 1000).toFixed(1)}k`
                      : pred.predictedValue}
                  </span>
                  <span className="text-sm text-muted-foreground">predicted</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{pred.timeframe}</span>
                  <Badge variant="secondary">{pred.confidence}% confidence</Badge>
                </div>
                <Progress value={pred.confidence} className="mt-2 h-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">Revenue Forecast</TabsTrigger>
            <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  30-Day Revenue Forecast
                </CardTitle>
                <CardDescription>Predicted revenue with confidence intervals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_FORECAST_DATA}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Days', position: 'bottom' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Revenue ($k)', angle: -90, position: 'left' }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="upperBound" stroke="transparent" fill="hsl(var(--ghost) / 0.2)" name="Upper Bound" />
                      <Area type="monotone" dataKey="lowerBound" stroke="transparent" fill="hsl(var(--background))" name="Lower Bound" />
                      <Line type="monotone" dataKey="actual" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Actual" />
                      <Line type="monotone" dataKey="predicted" stroke="hsl(var(--ghost))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  At-Risk Customers
                </CardTitle>
                <CardDescription>Customers with high churn probability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {churnRisks.map((customer) => (
                    <div key={customer.customerId} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{customer.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getRiskColor(customer.riskScore)}`}>
                            {customer.riskScore}%
                          </span>
                          <span className="text-sm text-muted-foreground">risk</span>
                        </div>
                      </div>
                      <Progress value={customer.riskScore} className="h-2 mb-2" />
                      <div className="flex flex-wrap gap-2 mb-2">
                        {customer.riskFactors.map((factor, i) => (
                          <Badge key={i} variant="outline">{factor}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last activity: {customer.lastActivity}
                        </span>
                        <Button size="sm" variant="outline">Take Action</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-warning" />
                    Growth Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-sm font-medium">Upsell Enterprise Plan</p>
                    <p className="text-xs text-muted-foreground mt-1">15 customers showing high engagement patterns typical of enterprise needs</p>
                  </div>
                  <div className="p-3 bg-ghost/10 border border-ghost/20 rounded-lg">
                    <p className="text-sm font-medium">Expand APAC Market</p>
                    <p className="text-xs text-muted-foreground mt-1">30% increase in APAC region queries - consider localized support hours</p>
                  </div>
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm font-medium">Launch Referral Program</p>
                    <p className="text-xs text-muted-foreground mt-1">High NPS scores indicate 40% of customers likely to refer</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-ghost" />
                    Efficiency Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Automate Tier-1 Responses</p>
                    <p className="text-xs text-muted-foreground mt-1">45% of tickets could be resolved with AI-powered responses</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Optimize Shift Scheduling</p>
                    <p className="text-xs text-muted-foreground mt-1">Peak hours identified: 9-11 AM and 2-4 PM - reallocate resources</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Update Knowledge Base</p>
                    <p className="text-xs text-muted-foreground mt-1">Top 5 FAQs account for 60% of tickets - expand documentation</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PredictiveAnalytics;
