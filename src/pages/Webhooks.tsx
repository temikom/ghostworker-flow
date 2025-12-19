import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Play, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Webhook {
  id: string;
  name: string;
  url: string;
  status: "active" | "inactive" | "failed";
  events: string[];
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt: string | null;
}

const WEBHOOK_EVENTS = [
  { id: "message.created", name: "New Message", category: "Messages" },
  { id: "conversation.created", name: "New Conversation", category: "Conversations" },
  { id: "conversation.closed", name: "Conversation Closed", category: "Conversations" },
  { id: "order.created", name: "New Order", category: "Orders" },
  { id: "order.updated", name: "Order Updated", category: "Orders" },
  { id: "integration.connected", name: "Integration Connected", category: "Integrations" },
  { id: "team.member_joined", name: "Member Joined", category: "Team" },
  { id: "billing.payment_succeeded", name: "Payment Succeeded", category: "Billing" },
  { id: "billing.payment_failed", name: "Payment Failed", category: "Billing" },
];

const mockWebhooks: Webhook[] = [
  {
    id: "1",
    name: "Slack Notifications",
    url: "https://hooks.slack.com/services/xxx",
    status: "active",
    events: ["message.created", "order.created"],
    totalDeliveries: 1250,
    successfulDeliveries: 1245,
    failedDeliveries: 5,
    lastDeliveryAt: "2024-01-15T10:30:00Z",
  },
];

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(mockWebhooks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", secret: "", events: [] as string[] });
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    const webhook: Webhook = {
      id: Date.now().toString(),
      name: newWebhook.name,
      url: newWebhook.url,
      status: "active",
      events: newWebhook.events,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      lastDeliveryAt: null,
    };
    setWebhooks([...webhooks, webhook]);
    setNewWebhook({ name: "", url: "", secret: "", events: [] });
    setIsDialogOpen(false);
    toast.success("Webhook created successfully");
  };

  const handleDelete = (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast.success("Webhook deleted");
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success("Test webhook sent successfully");
    setTestingId(null);
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const getStatusBadge = (status: Webhook["status"]) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case "inactive": return <Badge variant="secondary">Inactive</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
            <p className="text-muted-foreground">Configure webhooks to receive real-time event notifications</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Webhook</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
                <DialogDescription>Add a new webhook endpoint to receive event notifications</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="My Webhook" value={newWebhook.name} onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input id="url" placeholder="https://example.com/webhook" value={newWebhook.url} onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret">Secret (optional)</Label>
                  <Input id="secret" type="password" placeholder="Signing secret for verification" value={newWebhook.secret} onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <Label>Events to subscribe</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {WEBHOOK_EVENTS.map(event => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox id={event.id} checked={newWebhook.events.includes(event.id)} onCheckedChange={() => toggleEvent(event.id)} />
                        <Label htmlFor={event.id} className="text-sm font-normal cursor-pointer">
                          {event.name}
                          <span className="text-muted-foreground ml-1">({event.category})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create Webhook</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No webhooks configured</h3>
              <p className="text-muted-foreground text-center mb-4">Create a webhook to receive real-time notifications when events happen in your account.</p>
              <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Webhook</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {webhooks.map(webhook => (
              <Card key={webhook.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {webhook.name}
                        {getStatusBadge(webhook.status)}
                      </CardTitle>
                      <CardDescription className="mt-1 font-mono text-xs">{webhook.url}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleTest(webhook.id)} disabled={testingId === webhook.id}>
                        {testingId === webhook.id ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        <span className="ml-1">Test</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(webhook.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {webhook.events.map(event => (
                      <Badge key={event} variant="secondary" className="text-xs">{event}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>Total:</span>
                      <span className="font-medium text-foreground">{webhook.totalDeliveries}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{webhook.successfulDeliveries}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span>{webhook.failedDeliveries}</span>
                    </div>
                    {webhook.lastDeliveryAt && (
                      <div>Last delivery: {new Date(webhook.lastDeliveryAt).toLocaleString()}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
