import { useEffect, useRef, useCallback, useState } from "react";

export type Notification = {
  id: string;
  type: "alert" | "task" | "system";
  title: string;
  message: string;
  severity?: "critical" | "warning" | "info";
  timestamp: number;
  read: boolean;
};

export type WebSocketMessage = {
  type: "alert" | "task_update" | "system";
  data: Record<string, unknown>;
};

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  enabled?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 5000,
    enabled = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          if (message.type === "alert") {
            addNotification({
              type: "alert",
              title: "新告警",
              message: String(message.data.title || "检测到新的告警事件"),
              severity: (message.data.severity as Notification["severity"]) || "warning",
            });
          } else if (message.type === "task_update") {
            addNotification({
              type: "task",
              title: "任务更新",
              message: String(message.data.summary || "任务状态已更新"),
            });
          } else if (message.type === "system") {
            addNotification({
              type: "system",
              title: "系统通知",
              message: String(message.data.message || "系统消息"),
            });
          }

          onMessage?.(message);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
    }
  }, [url, enabled, onMessage, onConnect, onDisconnect, reconnectInterval, addNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    sendMessage,
    connect,
    disconnect,
  };
}

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="notification-bell">
      <button
        className={`notification-trigger ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span>通知</span>
            <div className="header-actions">
              <button className="text-button" onClick={onMarkAllAsRead} type="button">
                全部已读
              </button>
              <button className="text-button" onClick={onClear} type="button">
                清空
              </button>
            </div>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">暂无通知</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? "read" : "unread"} ${notification.severity || ""}`}
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
