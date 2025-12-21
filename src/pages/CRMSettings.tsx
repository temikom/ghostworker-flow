import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link2, Unlink, RefreshCw, Settings, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';
import { crmApi, getErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { CRMConnection, CRMSyncLog } from '@/types/advanced';

const CRM_PROVIDERS = [
  { id: 'salesforce', name: 'Salesforce', logo: '🔵', color: 'bg-blue-500' },
  { id: 'hubspot', name: 'HubSpot', logo: '🟠', color: 'bg-orange-500' },
  { id: 'pipedrive', name: 'Pipedrive', logo: '🟢', color: 'bg-green-500' },
  { id: 'zoho', name: 'Zoho CRM', logo: '🔴', color: 'bg-red-500' },
];

// Mock data
const MOCK_CONNECTIONS: CRMConnection[] = [
  {
    id: '1',
    provider: 'salesforce',
    isConnected: true,
    connectedAt: '2024-01-15T10:00:00Z',
    lastSyncAt: '2024-01-20T14:30:00Z',
    syncEnabled: true,
    settings: { autoSyncContacts: true, autoSyncDeals: true, syncFrequency: 'realtime' },
  },
  {
    id: '2',
    provider: 'hubspot',
    isConnected: false,
    connectedAt: null,
    lastSyncAt: null,
    syncEnabled: false,
    settings: { autoSyncContacts: false, autoSyncDeals: false, syncFrequency: 'daily' },
  },
  {
    id: '3',
    provider: 'pipedrive',
    isConnected: false,
    connectedAt: null,
    lastSyncAt: null,
    syncEnabled: false,
    settings: { autoSyncContacts: false, autoSyncDeals: false, syncFrequency: 'daily' },
  },
  {
    id: '4',
    provider: 'zoho',
    isConnected: false,
    connectedAt: null,
    lastSyncAt: null,
    syncEnabled: false,
    settings: { autoSyncContacts: false, autoSyncDeals: false, syncFrequency: 'daily' },
  },
];

const MOCK_SYNC_LOGS: CRMSyncLog[] = [
  { id: '1', provider: 'salesforce', action: 'sync', status: 'success', recordType: 'contacts', recordCount: 150, timestamp: new Date().toISOString() },
  { id: '2', provider: 'salesforce', action: 'create', status: 'success', recordType: 'deals', recordCount: 23, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', provider: 'salesforce', action: 'update', status: 'failed', recordType: 'contacts', recordCount: 5, timestamp: new Date(Date.now() - 7200000).toISOString(), error: 'Rate limit exceeded' },
];

const CRMSettings = () => {
  const [connections, setConnections] = useState<CRMConnection[]>(MOCK_CONNECTIONS);
  const [syncLogs, setSyncLogs] = useState<CRMSyncLog[]>(MOCK_SYNC_LOGS);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const data = await crmApi.getConnections();
      setConnections(data);
    } catch (error) {
      console.error('Failed to fetch CRM connections:', error);
      setConnections(MOCK_CONNECTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const data = await crmApi.getSyncLogs();
      setSyncLogs(data);
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
      setSyncLogs(MOCK_SYNC_LOGS);
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchSyncLogs();
  }, []);

  const handleConnect = async () => {
    if (!selectedProvider) return;
    
    setIsLoading(true);
    try {
      await crmApi.connect(selectedProvider, credentials);
      toast.success(`Connected to ${CRM_PROVIDERS.find(p => p.id === selectedProvider)?.name}`);
      setConnectDialogOpen(false);
      setCredentials({});
      fetchConnections();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await crmApi.disconnect(provider);
      toast.success(`Disconnected from ${CRM_PROVIDERS.find(p => p.id === provider)?.name}`);
      fetchConnections();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSync = async (provider: string) => {
    try {
      await crmApi.syncContacts(provider);
      toast.success('Sync started');
      fetchSyncLogs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUpdateSettings = async (provider: string, settings: Record<string, unknown>) => {
    try {
      await crmApi.updateSettings(provider, settings);
      toast.success('Settings updated');
      fetchConnections();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const getConnectionForProvider = (providerId: string) => {
    return connections.find(c => c.provider === providerId);
  };

  const getCredentialFields = (provider: string) => {
    switch (provider) {
      case 'salesforce':
        return [
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
          { key: 'instance_url', label: 'Instance URL', type: 'text', placeholder: 'https://yourorg.salesforce.com' },
        ];
      case 'hubspot':
        return [
          { key: 'api_key', label: 'Private App Access Token', type: 'password' },
        ];
      case 'pipedrive':
        return [
          { key: 'api_key', label: 'API Token', type: 'password' },
          { key: 'domain', label: 'Company Domain', type: 'text', placeholder: 'yourcompany' },
        ];
      case 'zoho':
        return [
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
          { key: 'refresh_token', label: 'Refresh Token', type: 'password' },
        ];
      default:
        return [];
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CRM Integrations</h1>
          <p className="text-muted-foreground">Connect and sync your CRM platforms</p>
        </div>

        <Tabs defaultValue="connections">
          <TabsList>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="sync-logs">Sync Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-6 mt-6">
            {/* CRM Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {CRM_PROVIDERS.map((provider) => {
                const connection = getConnectionForProvider(provider.id);
                const isConnected = connection?.isConnected || false;

                return (
                  <Card key={provider.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-xl`}>
                            {provider.logo}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{provider.name}</CardTitle>
                            <CardDescription>
                              {isConnected ? (
                                <span className="flex items-center gap-1 text-success">
                                  <CheckCircle className="h-3 w-3" /> Connected
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Not connected</span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={isConnected ? 'default' : 'secondary'}>
                          {isConnected ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isConnected && connection && (
                        <>
                          <div className="grid gap-4 grid-cols-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Last sync:</span>
                              <p className="font-medium">
                                {connection.lastSyncAt 
                                  ? new Date(connection.lastSyncAt).toLocaleString() 
                                  : 'Never'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Frequency:</span>
                              <p className="font-medium capitalize">{connection.settings.syncFrequency}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-2 border-t">
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={connection.settings.autoSyncContacts}
                                onCheckedChange={(checked) => handleUpdateSettings(provider.id, { autoSyncContacts: checked })}
                              />
                              <Label className="text-sm">Auto-sync contacts</Label>
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={connection.settings.autoSyncDeals}
                                onCheckedChange={(checked) => handleUpdateSettings(provider.id, { autoSyncDeals: checked })}
                              />
                              <Label className="text-sm">Auto-sync deals</Label>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2 pt-2">
                        {isConnected ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleSync(provider.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync Now
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDisconnect(provider.id)}
                            >
                              <Unlink className="h-4 w-4 mr-2" />
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button 
                            className="w-full"
                            onClick={() => {
                              setSelectedProvider(provider.id);
                              setConnectDialogOpen(true);
                            }}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="sync-logs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>Recent synchronization activities</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Record Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium capitalize">{log.provider}</TableCell>
                        <TableCell className="capitalize">{log.action}</TableCell>
                        <TableCell className="capitalize">{log.recordType}</TableCell>
                        <TableCell>{log.recordCount}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                            {log.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {log.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                            {log.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Connect Dialog */}
        <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Connect to {CRM_PROVIDERS.find(p => p.id === selectedProvider)?.name}
              </DialogTitle>
              <DialogDescription>
                Enter your API credentials to connect your CRM account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedProvider && getCredentialFields(selectedProvider).map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={credentials[field.key] || ''}
                    onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={isLoading}>
                {isLoading ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CRMSettings;
