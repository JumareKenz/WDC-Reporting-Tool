import { useState } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  MessageSquare,
  Check,
  CheckCheck,
  Trash2,
  Filter,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useWDCData';
import { formatDate } from '../utils/formatters';

const NotificationsPage = () => {
  const [filter, setFilter] = useState('all'); // all, unread, read

  const { data: notificationsData, isLoading, refetch } = useNotifications({ limit: 50 });
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = notificationsData?.data?.notifications || notificationsData?.notifications || [];

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at;
    if (filter === 'read') return !!n.read_at;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const getIcon = (type) => {
    switch (type) {
      case 'REPORT_MISSING':
        return AlertCircle;
      case 'REPORT_SUBMITTED':
        return FileText;
      case 'REPORT_REVIEWED':
        return CheckCircle;
      case 'FEEDBACK':
        return MessageSquare;
      case 'REMINDER':
        return Clock;
      default:
        return Bell;
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'REPORT_MISSING':
        return 'text-red-500 bg-red-50';
      case 'REPORT_SUBMITTED':
        return 'text-blue-500 bg-blue-50';
      case 'REPORT_REVIEWED':
        return 'text-green-500 bg-green-50';
      case 'FEEDBACK':
        return 'text-purple-500 bg-purple-50';
      case 'REMINDER':
        return 'text-yellow-500 bg-yellow-50';
      default:
        return 'text-primary-500 bg-primary-50';
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await markReadMutation.mutateAsync(notificationId);
      refetch();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading notifications..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              icon={CheckCheck}
              onClick={handleMarkAllRead}
              loading={markAllReadMutation.isPending}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {filteredNotifications.map((notification) => {
              const Icon = getIcon(notification.notification_type);
              const iconColor = getIconColor(notification.notification_type);
              const isUnread = !notification.read_at;

              return (
                <div
                  key={notification.id}
                  className={`p-4 flex items-start gap-4 hover:bg-neutral-50 transition-colors ${
                    isUnread ? 'bg-primary-50/30' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 p-3 rounded-full ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${isUnread ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-neutral-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-400 mt-2">
                          {formatDate(notification.created_at, true)}
                        </p>
                      </div>
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Check}
                          onClick={() => handleMarkRead(notification.id)}
                          loading={markReadMutation.isPending}
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500 font-medium">No notifications</p>
            <p className="text-sm text-neutral-400 mt-1">
              {filter !== 'all' ? 'Try changing the filter' : 'You\'re all caught up!'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
