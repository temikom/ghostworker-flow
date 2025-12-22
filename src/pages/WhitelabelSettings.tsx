import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Globe, Upload, Eye, Save, Mail, MessageSquare, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';
import { whiteLabelApi } from '@/lib/api';

interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customDomain: string;
  emailFromName: string;
  emailFromAddress: string;
  footerText: string;
  supportEmail: string;
  termsUrl: string;
  privacyUrl: string;
  customCss: string;
  removeBranding: boolean;
  customLogin: boolean;
  customEmailTemplates: boolean;
}

const WhitelabelSettings = () => {
  const [config, setConfig] = useState<BrandingConfig>({
    companyName: 'Your Company',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#22c55e',
    customDomain: '',
    emailFromName: 'Support Team',
    emailFromAddress: 'support@yourcompany.com',
    footerText: '© 2024 Your Company. All rights reserved.',
    supportEmail: 'help@yourcompany.com',
    termsUrl: '',
    privacyUrl: '',
    customCss: '',
    removeBranding: false,
    customLogin: false,
    customEmailTemplates: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: keyof BrandingConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await whiteLabelApi.updateConfig(config);
      toast.success('Branding settings saved successfully');
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (field: 'logoUrl' | 'faviconUrl') => {
    // In a real app, this would handle file upload
    toast.info('File upload functionality would open here');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">White-label Settings</h1>
            <p className="text-muted-foreground">Customize the platform with your brand identity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="domain">Custom Domain</TabsTrigger>
            <TabsTrigger value="emails">Email Templates</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Logo & Identity
                  </CardTitle>
                  <CardDescription>Upload your company logo and favicon</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={config.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Your Company Name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Logo</Label>
                    <div className="mt-1 flex items-center gap-4">
                      <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                        {config.logoUrl ? (
                          <img src={config.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <Button variant="outline" onClick={() => handleFileUpload('logoUrl')}>
                        Upload Logo
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Favicon</Label>
                    <div className="mt-1 flex items-center gap-4">
                      <div className="w-12 h-12 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                        {config.faviconUrl ? (
                          <img src={config.faviconUrl} alt="Favicon" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Upload className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleFileUpload('faviconUrl')}>
                        Upload Favicon
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Brand Colors
                  </CardTitle>
                  <CardDescription>Define your brand color palette</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Secondary Color</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={config.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Accent Color</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => handleInputChange('accentColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.accentColor}
                        onChange={(e) => handleInputChange('accentColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Remove Platform Branding</Label>
                        <p className="text-sm text-muted-foreground">Hide "Powered by" badges</p>
                      </div>
                      <Switch
                        checked={config.removeBranding}
                        onCheckedChange={(checked) => handleInputChange('removeBranding', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="domain" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Custom Domain Configuration
                </CardTitle>
                <CardDescription>Use your own domain for the customer portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Custom Domain</Label>
                  <Input
                    value={config.customDomain}
                    onChange={(e) => handleInputChange('customDomain', e.target.value)}
                    placeholder="support.yourcompany.com"
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Point your domain's CNAME record to: portal.example.com
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <h4 className="font-medium">DNS Configuration</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-mono bg-muted px-1 rounded">Type:</span> CNAME</p>
                    <p><span className="font-mono bg-muted px-1 rounded">Name:</span> support (or your subdomain)</p>
                    <p><span className="font-mono bg-muted px-1 rounded">Value:</span> portal.example.com</p>
                    <p><span className="font-mono bg-muted px-1 rounded">TTL:</span> 3600 (or Auto)</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Terms of Service URL</Label>
                    <Input
                      value={config.termsUrl}
                      onChange={(e) => handleInputChange('termsUrl', e.target.value)}
                      placeholder="https://yourcompany.com/terms"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Privacy Policy URL</Label>
                    <Input
                      value={config.privacyUrl}
                      onChange={(e) => handleInputChange('privacyUrl', e.target.value)}
                      placeholder="https://yourcompany.com/privacy"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Footer Text</Label>
                  <Input
                    value={config.footerText}
                    onChange={(e) => handleInputChange('footerText', e.target.value)}
                    placeholder="© 2024 Your Company. All rights reserved."
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Configuration
                </CardTitle>
                <CardDescription>Customize outgoing email settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>From Name</Label>
                    <Input
                      value={config.emailFromName}
                      onChange={(e) => handleInputChange('emailFromName', e.target.value)}
                      placeholder="Support Team"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>From Email Address</Label>
                    <Input
                      value={config.emailFromAddress}
                      onChange={(e) => handleInputChange('emailFromAddress', e.target.value)}
                      placeholder="support@yourcompany.com"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Support Email</Label>
                  <Input
                    value={config.supportEmail}
                    onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                    placeholder="help@yourcompany.com"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <Label>Custom Email Templates</Label>
                    <p className="text-sm text-muted-foreground">Use your own HTML email templates</p>
                  </div>
                  <Switch
                    checked={config.customEmailTemplates}
                    onCheckedChange={(checked) => handleInputChange('customEmailTemplates', checked)}
                  />
                </div>

                {config.customEmailTemplates && (
                  <div className="space-y-4 pt-4">
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Edit Welcome Email Template
                    </Button>
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Edit Notification Email Template
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Customization</CardTitle>
                <CardDescription>Add custom CSS for advanced styling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Custom Login Page</Label>
                    <p className="text-sm text-muted-foreground">Use a fully customized login experience</p>
                  </div>
                  <Switch
                    checked={config.customLogin}
                    onCheckedChange={(checked) => handleInputChange('customLogin', checked)}
                  />
                </div>

                <div>
                  <Label>Custom CSS</Label>
                  <Textarea
                    value={config.customCss}
                    onChange={(e) => handleInputChange('customCss', e.target.value)}
                    placeholder={`/* Add your custom CSS here */
.header {
  background: #your-color;
}
`}
                    className="mt-1 font-mono text-sm min-h-[200px]"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Custom CSS will be applied to the customer portal
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WhitelabelSettings;
