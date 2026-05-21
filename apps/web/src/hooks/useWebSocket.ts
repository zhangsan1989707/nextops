import { useState, useCallback } from 'react';

export type Notification = {
  id: string;
  type: 'alert' | 'task' | 'system';
  title: string;
  message: string;
  severity?: 'critical' | 'warning' | 'info';
  timestamp: number;
  read: boolean;
};

export function useWebSocket(options: { url?: string; enabled?: boolean } = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);
  
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);
  
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications };
}
