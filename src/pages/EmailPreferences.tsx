import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Mail, Shield, CreditCard, Users, MessageSquare, Plug, Megaphone, Loader2 } from "lucide-react";
import { notificationApi, EmailPreferences as EmailPreferencesType, getErrorMessage } from "@/lib/api";

export default function EmailPreferences() {
  const [preferences, setPreferences] = useState<EmailPreferencesType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      setIsLoading(true);
      try {
        const data = await notificationApi.getEmailPreferences();
        setPreferences(data);
      } catch (error) {
        console.error('Failed to fetch email preferences:', error);
        // Set defaults on error
        setPreferences({
          new_conversation: true,
          new_message: true,
          conversation_assigned: true,
          order_created: true,
          order_status_changed: true,
          product_updates: true,
          tips_and_tutorials: false,
          promotional: false,
          payment_received: true,
          payment_failed: true,
          subscription_expiring: true,
          team_invitation: true,
          team_member_joined: true,
          daily_digest: false,
          weekly_digest: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const updatePreference = (key: keyof EmailPreferencesType, value: boolean) => {
    if (!preferences) return;
    setPreferences(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    setIsSaving(true);
    try {
      await notificationApi.updateEmailPreferences(preferences);
      toast.success("Email preferences saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Preferences</h1>
            <p className="text-muted-foreground">Manage which emails you receive from GhostWorker</p>
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-10" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!preferences) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Preferences</h1>
          <p className="text-muted-foreground">Manage which emails you receive from GhostWorker</p>
        </div>

        <div className="grid gap-6">
          {/* Security & Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Conversations & Messages
              </CardTitle>
              <CardDescription>Notifications about customer interactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="new_conversation">New conversation started</Label>
                <Switch 
                  id="new_conversation" 
                  checked={preferences.new_conversation} 
                  onCheckedChange={(v) => updatePreference("new_conversation", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="new_message">New message received</Label>
                <Switch 
                  id="new_message" 
                  checked={preferences.new_message} 
                  onCheckedChange={(v) => updatePreference("new_message", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="conversation_assigned">Conversation assigned to you</Label>
                <Switch 
                  id="conversation_assigned" 
                  checked={preferences.conversation_assigned} 
                  onCheckedChange={(v) => updatePreference("conversation_assigned", v)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Orders
              </CardTitle>
              <CardDescription>Order activity notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="order_created">New order received</Label>
                <Switch 
                  id="order_created" 
                  checked={preferences.order_created} 
                  onCheckedChange={(v) => updatePreference("order_created", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="order_status_changed">Order status changed</Label>
                <Switch 
                  id="order_status_changed" 
                  checked={preferences.order_status_changed} 
                  onCheckedChange={(v) => updatePreference("order_status_changed", v)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Billing Notifications
              </CardTitle>
              <CardDescription>Payment and subscription updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment_received">Payment received</Label>
                <Switch 
                  id="payment_received" 
                  checked={preferences.payment_received} 
                  onCheckedChange={(v) => updatePreference("payment_received", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="payment_failed">Payment failed</Label>
                <Switch 
                  id="payment_failed" 
                  checked={preferences.payment_failed} 
                  onCheckedChange={(v) => updatePreference("payment_failed", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="subscription_expiring">Subscription expiring soon</Label>
                <Switch 
                  id="subscription_expiring" 
                  checked={preferences.subscription_expiring} 
                  onCheckedChange={(v) => updatePreference("subscription_expiring", v)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Notifications
              </CardTitle>
              <CardDescription>Team activity and invitations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="team_invitation">Team invitations</Label>
                <Switch 
                  id="team_invitation" 
                  checked={preferences.team_invitation} 
                  onCheckedChange={(v) => updatePreference("team_invitation", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="team_member_joined">New team member joined</Label>
                <Switch 
                  id="team_member_joined" 
                  checked={preferences.team_member_joined} 
                  onCheckedChange={(v) => updatePreference("team_member_joined", v)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Digest */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Digests
              </CardTitle>
              <CardDescription>Summary emails of your activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="daily_digest">Daily digest</Label>
                <Switch 
                  id="daily_digest" 
                  checked={preferences.daily_digest} 
                  onCheckedChange={(v) => updatePreference("daily_digest", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly_digest">Weekly digest</Label>
                <Switch 
                  id="weekly_digest" 
                  checked={preferences.weekly_digest} 
                  onCheckedChange={(v) => updatePreference("weekly_digest", v)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Marketing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Marketing & Updates
              </CardTitle>
              <CardDescription>Product news and promotional emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="product_updates">Product updates</Label>
                <Switch 
                  id="product_updates" 
                  checked={preferences.product_updates} 
                  onCheckedChange={(v) => updatePreference("product_updates", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="tips_and_tutorials">Tips and tutorials</Label>
                <Switch 
                  id="tips_and_tutorials" 
                  checked={preferences.tips_and_tutorials} 
                  onCheckedChange={(v) => updatePreference("tips_and_tutorials", v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="promotional">Promotional emails</Label>
                <Switch 
                  id="promotional" 
                  checked={preferences.promotional} 
                  onCheckedChange={(v) => updatePreference("promotional", v)} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
