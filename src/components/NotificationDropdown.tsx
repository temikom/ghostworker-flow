import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Users, Plug, CreditCard, AlertCircle, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationType } from '@/types/notification';
import { cn } from '@/lib/utils';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const typeIcons: Record<NotificationType, typeof Bell> = {
    message: MessageSquare,
    team_invite: Users,
    integration: Plug,
    billing: CreditCard,
    system: AlertCircle,
  };

  const typeColors: Record<NotificationType, string> = {
    message: 'text-blue-500 bg-blue-500/10',
    team_invite: 'text-purple-500 bg-purple-500/10',
    integration: 'text-green-500 bg-green-500/10',
    billing: 'text-amber-500 bg-amber-500/10',
    system: 'text-red-500 bg-red-500/10',
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={markAllAsRead}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const Icon = typeIcons[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 cursor-pointer hover:bg-muted/50 transition-colors relative group',
                        !notification.read && 'bg-primary/5'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', typeColors[notification.type])}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-sm', !notification.read && 'font-medium')}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {notification.description}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                      <button
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="p-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  clearAll();
                  setIsOpen(false);
                }}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Clear all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
