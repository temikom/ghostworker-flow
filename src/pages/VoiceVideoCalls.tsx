import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Video, PhoneOff, VideoOff, Mic, MicOff, Volume2, VolumeX, Users, Clock, Calendar, Settings, History, PhoneCall, PhoneIncoming, PhoneMissed } from 'lucide-react';
import { toast } from 'sonner';

interface CallLog {
  id: string;
  type: 'inbound' | 'outbound' | 'missed';
  callType: 'voice' | 'video';
  customerName: string;
  duration: string;
  timestamp: string;
  recording?: string;
}

interface ScheduledCall {
  id: string;
  customerName: string;
  callType: 'voice' | 'video';
  scheduledTime: string;
  notes: string;
}

const MOCK_CALL_LOGS: CallLog[] = [
  { id: '1', type: 'inbound', callType: 'voice', customerName: 'John Smith', duration: '15:32', timestamp: '2024-01-15 10:30 AM', recording: 'rec_1' },
  { id: '2', type: 'outbound', callType: 'video', customerName: 'Sarah Johnson', duration: '22:45', timestamp: '2024-01-15 09:15 AM', recording: 'rec_2' },
  { id: '3', type: 'missed', callType: 'voice', customerName: 'Mike Wilson', duration: '0:00', timestamp: '2024-01-15 08:45 AM' },
  { id: '4', type: 'inbound', callType: 'voice', customerName: 'Emily Davis', duration: '08:12', timestamp: '2024-01-14 04:30 PM', recording: 'rec_3' },
];

const MOCK_SCHEDULED_CALLS: ScheduledCall[] = [
  { id: '1', customerName: 'Enterprise Solutions', callType: 'video', scheduledTime: '2024-01-16 02:00 PM', notes: 'Quarterly review meeting' },
  { id: '2', customerName: 'Tech Startup Inc', callType: 'voice', scheduledTime: '2024-01-16 03:30 PM', notes: 'Follow-up on support ticket' },
];

const VoiceVideoCalls = () => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callLogs] = useState<CallLog[]>(MOCK_CALL_LOGS);
  const [scheduledCalls] = useState<ScheduledCall[]>(MOCK_SCHEDULED_CALLS);
  const [callSettings, setCallSettings] = useState({
    autoAnswer: false,
    recordCalls: true,
    transcribeCalls: true,
    callWaiting: true,
    voicemailEnabled: true,
  });

  const getCallTypeIcon = (log: CallLog) => {
    if (log.type === 'missed') return <PhoneMissed className="h-4 w-4 text-destructive" />;
    if (log.type === 'inbound') return <PhoneIncoming className="h-4 w-4 text-success" />;
    return <PhoneCall className="h-4 w-4 text-ghost" />;
  };

  const startCall = (type: 'voice' | 'video') => {
    toast.success(`Starting ${type} call...`);
    setIsInCall(true);
  };

  const endCall = () => {
    toast.info('Call ended');
    setIsInCall(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Voice & Video Calls</h1>
            <p className="text-muted-foreground">Manage customer calls with real-time communication</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => startCall('voice')}>
              <Phone className="h-4 w-4 mr-2" />
              New Voice Call
            </Button>
            <Button variant="secondary" onClick={() => startCall('video')}>
              <Video className="h-4 w-4 mr-2" />
              New Video Call
            </Button>
          </div>
        </div>

        {/* Active Call Panel */}
        {isInCall && (
          <Card className="border-ghost/50 bg-ghost/5">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-ghost/20 flex items-center justify-center">
                  <Users className="h-10 w-10 text-ghost" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Active Call</h3>
                  <p className="text-muted-foreground">00:05:32</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant={isMuted ? 'destructive' : 'secondary'}
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant={!isVideoOn ? 'destructive' : 'secondary'}
                    size="icon"
                    onClick={() => setIsVideoOn(!isVideoOn)}
                  >
                    {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                  <Button variant="destructive" size="icon" onClick={endCall}>
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">Call History</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Calls</TabsTrigger>
            <TabsTrigger value="settings">Call Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Calls
                </CardTitle>
                <CardDescription>View and manage your call history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {callLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        {getCallTypeIcon(log)}
                        <div className="flex items-center gap-2">
                          {log.callType === 'video' ? <Video className="h-4 w-4 text-muted-foreground" /> : <Phone className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-medium">{log.customerName}</p>
                          <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge variant={log.type === 'missed' ? 'destructive' : 'secondary'}>
                            {log.type}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.duration}
                          </p>
                        </div>
                        {log.recording && (
                          <Button variant="outline" size="sm">
                            <Volume2 className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Calls
                </CardTitle>
                <CardDescription>Scheduled voice and video calls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledCalls.map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        {call.callType === 'video' ? <Video className="h-5 w-5 text-ghost" /> : <Phone className="h-5 w-5 text-ghost" />}
                        <div>
                          <p className="font-medium">{call.customerName}</p>
                          <p className="text-sm text-muted-foreground">{call.notes}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{call.scheduledTime}</p>
                          <Badge variant="outline" className="mt-1">{call.callType}</Badge>
                        </div>
                        <Button size="sm" onClick={() => startCall(call.callType)}>
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t border-border">
                    <Button variant="outline" className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule New Call
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Call Settings
                </CardTitle>
                <CardDescription>Configure your voice and video call preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-answer calls</Label>
                      <p className="text-sm text-muted-foreground">Automatically answer incoming calls after 5 seconds</p>
                    </div>
                    <Switch
                      checked={callSettings.autoAnswer}
                      onCheckedChange={(checked) => setCallSettings(prev => ({ ...prev, autoAnswer: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Record all calls</Label>
                      <p className="text-sm text-muted-foreground">Automatically record voice and video calls</p>
                    </div>
                    <Switch
                      checked={callSettings.recordCalls}
                      onCheckedChange={(checked) => setCallSettings(prev => ({ ...prev, recordCalls: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI transcription</Label>
                      <p className="text-sm text-muted-foreground">Generate transcripts for all recorded calls</p>
                    </div>
                    <Switch
                      checked={callSettings.transcribeCalls}
                      onCheckedChange={(checked) => setCallSettings(prev => ({ ...prev, transcribeCalls: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Call waiting</Label>
                      <p className="text-sm text-muted-foreground">Allow incoming calls while on another call</p>
                    </div>
                    <Switch
                      checked={callSettings.callWaiting}
                      onCheckedChange={(checked) => setCallSettings(prev => ({ ...prev, callWaiting: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Voicemail</Label>
                      <p className="text-sm text-muted-foreground">Enable voicemail for missed calls</p>
                    </div>
                    <Switch
                      checked={callSettings.voicemailEnabled}
                      onCheckedChange={(checked) => setCallSettings(prev => ({ ...prev, voicemailEnabled: checked }))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-4">
                  <h4 className="font-medium">Audio & Video Devices</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Microphone</Label>
                      <Select defaultValue="default">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default Microphone</SelectItem>
                          <SelectItem value="headset">Headset Microphone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Speaker</Label>
                      <Select defaultValue="default">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default Speaker</SelectItem>
                          <SelectItem value="headset">Headset Speaker</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Camera</Label>
                      <Select defaultValue="default">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default Camera</SelectItem>
                          <SelectItem value="external">External Webcam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button onClick={() => toast.success('Settings saved')}>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default VoiceVideoCalls;
