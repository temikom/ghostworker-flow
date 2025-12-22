import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Search, ExternalLink, Check, Copy, FileText, RefreshCw, Filter, Link2 } from 'lucide-react';
import { blockchainApi } from '@/lib/api';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  eventType: string;
  entityType: string;
  entityId: string;
  userId: string;
  dataHash: string;
  verified: boolean;
  metadata: Record<string, unknown>;
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: '1',
    transactionHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 18543210,
    timestamp: '2024-01-15T10:30:00Z',
    eventType: 'conversation_created',
    entityType: 'conversation',
    entityId: 'conv_12345',
    userId: 'user_1',
    dataHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    verified: true,
    metadata: { conversationId: 'conv_12345', platform: 'whatsapp' },
  },
  {
    id: '2',
    transactionHash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12345678901a',
    blockNumber: 18543211,
    timestamp: '2024-01-15T10:35:00Z',
    eventType: 'order_updated',
    entityType: 'order',
    entityId: 'order_67890',
    userId: 'user_2',
    dataHash: '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901a',
    verified: true,
    metadata: { orderId: 'order_67890', status: 'shipped' },
  },
  {
    id: '3',
    transactionHash: '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef123456789012ab',
    blockNumber: 18543212,
    timestamp: '2024-01-15T11:00:00Z',
    eventType: 'user_permission_changed',
    entityType: 'user',
    entityId: 'user_3',
    userId: 'admin_1',
    dataHash: '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901ab',
    verified: true,
    metadata: { permission: 'admin', action: 'granted' },
  },
];

const BlockchainAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await blockchainApi.getLogs({});
      if (response && response.length > 0) {
        setLogs(response);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.transactionHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = eventFilter === 'all' || log.eventType === eventFilter;
    return matchesSearch && matchesFilter;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const truncateHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();
  const getEventBadgeVariant = (eventType: string) => {
    if (eventType.includes('created')) return 'default';
    if (eventType.includes('updated') || eventType.includes('changed')) return 'secondary';
    if (eventType.includes('deleted')) return 'destructive';
    return 'outline';
  };

  const verifyLog = async (log: AuditLog) => {
    try {
      const result = await blockchainApi.verifyLog(log.id);
      toast.success(result.valid ? 'Log verified successfully' : 'Verification failed');
    } catch (error) {
      toast.error('Verification failed');
    }
  };

  const uniqueEventTypes = [...new Set(logs.map(log => log.eventType))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Blockchain Audit Logs</h1>
            <p className="text-muted-foreground">Immutable, cryptographically verified activity records</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <Shield className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {logs.filter(l => l.verified).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Latest Block</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(...logs.map(l => l.blockNumber)).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Event Types</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueEventTypes.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by transaction hash, entity ID, or event type..."
                  className="pl-10"
                />
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>All actions recorded on the blockchain</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {truncateHash(log.transactionHash)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(log.transactionHash)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEventBadgeVariant(log.eventType)}>
                        {log.eventType.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{log.entityType}</p>
                        <p className="text-xs text-muted-foreground">{log.entityId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{log.blockNumber.toLocaleString()}</code>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.verified ? (
                        <Badge variant="outline" className="text-success border-success">
                          <Check className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning border-warning">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Audit Log Details</DialogTitle>
                              <DialogDescription>Full blockchain record information</DialogDescription>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="text-sm font-medium">Transaction Hash</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                                        {selectedLog.transactionHash}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                        onClick={() => copyToClipboard(selectedLog.transactionHash)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Data Hash</label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                                        {selectedLog.dataHash}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                        onClick={() => copyToClipboard(selectedLog.dataHash)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                  <div>
                                    <label className="text-sm font-medium">Block Number</label>
                                    <p className="mt-1">{selectedLog.blockNumber.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Timestamp</label>
                                    <p className="mt-1">{formatDate(selectedLog.timestamp)}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">User ID</label>
                                    <p className="mt-1">{selectedLog.userId}</p>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium">Metadata</label>
                                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto">
                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                  </pre>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-border">
                                  <Button onClick={() => verifyLog(selectedLog)}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Verify Integrity
                                  </Button>
                                  <Button variant="outline">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View on Explorer
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BlockchainAuditLogs;
