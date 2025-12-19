import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mail, Shield, CreditCard, Users, MessageSquare, Plug, Megaphone } from "lucide-react";

interface EmailPreferences {
  security_alerts: boolean;
  new_login_alerts: boolean;
  password_changes: boolean;
  payment_receipts: boolean;
  payment_failures: boolean;
  subscription_changes: boolean;
  usage_alerts: boolean;
  team_invites: boolean;
  team_member_joined: boolean;
  role_changes: boolean;
  new_messages: boolean;
  message_digest: boolean;
  digest_frequency: string;
  integration_errors: boolean;
  integration_connected: boolean;
  product_updates: boolean;
  tips_and_tutorials: boolean;
  promotional_emails: boolean;
}

const defaultPreferences: EmailPreferences = {
  security_alerts: true,
  new_login_alerts: true,
  password_changes: true,
  payment_receipts: true,
  payment_failures: true,
  subscription_changes: true,
  usage_alerts: true,
  team_invites: true,
  team_member_joined: true,
  role_changes: true,
  new_messages: true,
  message_digest: false,
  digest_frequency: "daily",
  integration_errors: true,
  integration_connected: true,
  product_updates: true,
  tips_and_tutorials: false,
  promotional_emails: false,
};

export default function EmailPreferences() {
  const [preferences, setPreferences] = useState<EmailPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const updatePreference = (key: keyof EmailPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Replace with real API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Email preferences saved successfully");
    setIsSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Preferences</h1>
          <p className="text-muted-foreground">Manage which emails you receive from GhostWorker</p>
        </div>

        <div className="grid gap-6">
          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security Notifications
              </CardTitle>
              <CardDescription>Critical security alerts for your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="security_alerts">Security alerts</Label>
                <Switch id="security_alerts" checked={preferences.security_alerts} onCheckedChange={(v) => updatePreference("security_alerts", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="new_login_alerts">New login alerts</Label>
                <Switch id="new_login_alerts" checked={preferences.new_login_alerts} onCheckedChange={(v) => updatePreference("new_login_alerts", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password_changes">Password change confirmations</Label>
                <Switch id="password_changes" checked={preferences.password_changes} onCheckedChange={(v) => updatePreference("password_changes", v)} />
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
                <Label htmlFor="payment_receipts">Payment receipts</Label>
                <Switch id="payment_receipts" checked={preferences.payment_receipts} onCheckedChange={(v) => updatePreference("payment_receipts", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="payment_failures">Payment failure alerts</Label>
                <Switch id="payment_failures" checked={preferences.payment_failures} onCheckedChange={(v) => updatePreference("payment_failures", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="subscription_changes">Subscription changes</Label>
                <Switch id="subscription_changes" checked={preferences.subscription_changes} onCheckedChange={(v) => updatePreference("subscription_changes", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="usage_alerts">Usage limit alerts</Label>
                <Switch id="usage_alerts" checked={preferences.usage_alerts} onCheckedChange={(v) => updatePreference("usage_alerts", v)} />
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
                <Label htmlFor="team_invites">Team invitations</Label>
                <Switch id="team_invites" checked={preferences.team_invites} onCheckedChange={(v) => updatePreference("team_invites", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="team_member_joined">New team member joined</Label>
                <Switch id="team_member_joined" checked={preferences.team_member_joined} onCheckedChange={(v) => updatePreference("team_member_joined", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="role_changes">Role changes</Label>
                <Switch id="role_changes" checked={preferences.role_changes} onCheckedChange={(v) => updatePreference("role_changes", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Message Notifications
              </CardTitle>
              <CardDescription>New message alerts and digests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="new_messages">New message alerts</Label>
                <Switch id="new_messages" checked={preferences.new_messages} onCheckedChange={(v) => updatePreference("new_messages", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="message_digest">Message digest</Label>
                <Switch id="message_digest" checked={preferences.message_digest} onCheckedChange={(v) => updatePreference("message_digest", v)} />
              </div>
              {preferences.message_digest && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="digest_frequency">Digest frequency</Label>
                  <Select value={preferences.digest_frequency} onValueChange={(v) => updatePreference("digest_frequency", v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-primary" />
                Integration Notifications
              </CardTitle>
              <CardDescription>Integration status and error alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="integration_errors">Integration errors</Label>
                <Switch id="integration_errors" checked={preferences.integration_errors} onCheckedChange={(v) => updatePreference("integration_errors", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="integration_connected">Integration connected</Label>
                <Switch id="integration_connected" checked={preferences.integration_connected} onCheckedChange={(v) => updatePreference("integration_connected", v)} />
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
                <Switch id="product_updates" checked={preferences.product_updates} onCheckedChange={(v) => updatePreference("product_updates", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="tips_and_tutorials">Tips and tutorials</Label>
                <Switch id="tips_and_tutorials" checked={preferences.tips_and_tutorials} onCheckedChange={(v) => updatePreference("tips_and_tutorials", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="promotional_emails">Promotional emails</Label>
                <Switch id="promotional_emails" checked={preferences.promotional_emails} onCheckedChange={(v) => updatePreference("promotional_emails", v)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
