import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ConnectionStatusProps {
  showLabel?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ showLabel = false, className }) => {
  const { status, connect } = useWebSocketContext();

  const getStatusColor = () => {
    if (status.connected) return 'text-success';
    if (status.reconnecting) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusText = () => {
    if (status.connected) return 'Connected';
    if (status.reconnecting) return 'Reconnecting...';
    return 'Disconnected';
  };

  const Icon = status.connected ? Wifi : status.reconnecting ? RefreshCw : WifiOff;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => !status.connected && connect()}
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg transition-colors',
            'hover:bg-muted/50',
            !status.connected && 'cursor-pointer',
            className
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 transition-colors',
              getStatusColor(),
              status.reconnecting && 'animate-spin'
            )}
          />
          {showLabel && (
            <span className={cn('text-sm font-medium', getStatusColor())}>
              {getStatusText()}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getStatusText()}</p>
        {status.lastConnected && (
          <p className="text-xs text-muted-foreground">
            Last connected: {new Date(status.lastConnected).toLocaleTimeString()}
          </p>
        )}
        {status.error && (
          <p className="text-xs text-destructive">{status.error}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default ConnectionStatus;
