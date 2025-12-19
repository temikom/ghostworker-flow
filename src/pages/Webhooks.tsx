import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Play, ExternalLink, CheckCircle2, XCircle, Clock, RefreshCw, Key, Loader2 } from "lucide-react";
import { webhookApi, Webhook, getErrorMessage } from "@/lib/api";

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

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", events: [] as string[] });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    setIsLoading(true);
    try {
      const data = await webhookApi.getWebhooks();
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const webhook = await webhookApi.createWebhook({
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
      });
      
      setWebhooks([...webhooks, webhook]);
      setNewWebhook({ name: "", url: "", events: [] });
      setIsDialogOpen(false);
      toast.success("Webhook created successfully");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await webhookApi.deleteWebhook(id);
      setWebhooks(webhooks.filter(w => w.id !== id));
      toast.success("Webhook deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await webhookApi.testWebhook(id);
      if (result.success) {
        toast.success(`Test webhook sent successfully (Status: ${result.status_code})`);
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setTestingId(null);
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    setRegeneratingId(id);
    try {
      const result = await webhookApi.regenerateSecret(id);
      toast.success("Secret regenerated. Copy it now - it won't be shown again.");
      
      // Show secret in a dialog or copy to clipboard
      if (result.secret) {
        await navigator.clipboard.writeText(result.secret);
        toast.info("New secret copied to clipboard");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      const updated = await webhookApi.updateWebhook(webhook.id, {
        is_active: !webhook.is_active,
      });
      
      setWebhooks(webhooks.map(w => w.id === webhook.id ? updated : w));
      toast.success(updated.is_active ? "Webhook activated" : "Webhook deactivated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const getStatusBadge = (webhook: Webhook) => {
    if (!webhook.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (webhook.failure_count > 5) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
              <p className="text-muted-foreground">Configure webhooks to receive real-time event notifications</p>
            </div>
          </div>
          <div className="grid gap-4">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                  <Input 
                    id="name" 
                    placeholder="My Webhook" 
                    value={newWebhook.name} 
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input 
                    id="url" 
                    placeholder="https://example.com/webhook" 
                    value={newWebhook.url} 
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })} 
                  />
                </div>
                <div className="space-y-3">
                  <Label>Events to subscribe</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {WEBHOOK_EVENTS.map(event => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={event.id} 
                          checked={newWebhook.events.includes(event.id)} 
                          onCheckedChange={() => toggleEvent(event.id)} 
                        />
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
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Webhook"
                  )}
                </Button>
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
                        {getStatusBadge(webhook)}
                      </CardTitle>
                      <CardDescription className="mt-1 font-mono text-xs">{webhook.url}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleToggleActive(webhook)}
                      >
                        {webhook.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleTest(webhook.id)} 
                        disabled={testingId === webhook.id}
                      >
                        {testingId === webhook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="ml-1">Test</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRegenerateSecret(webhook.id)}
                        disabled={regeneratingId === webhook.id}
                        title="Regenerate secret"
                      >
                        {regeneratingId === webhook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={deletingId === webhook.id}>
                            {deletingId === webhook.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{webhook.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(webhook.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{webhook.success_count} delivered</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span>{webhook.failure_count} failed</span>
                    </div>
                    {webhook.last_triggered && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Last: {new Date(webhook.last_triggered).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Use the webhook secret to verify that requests are coming from GhostWorker. 
              Check our <a href="#" className="text-primary hover:underline">webhook documentation</a> for integration guides.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
