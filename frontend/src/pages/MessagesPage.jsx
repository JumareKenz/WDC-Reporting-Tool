import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Reply,
  Users,
  Building2,
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCheck,
  X,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { useFeedback, useSendFeedback } from '../hooks/useLGAData';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatters';
import { USER_ROLES, ROLE_LABELS } from '../utils/constants';
import apiClient from '../api/client';

const MessagesPage = () => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [recipientType, setRecipientType] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [sending, setSending] = useState(false);

  const { data: feedbackData, isLoading, refetch } = useFeedback({ limit: 100 });

  const messages = feedbackData?.data?.messages || feedbackData?.messages || [];

  // Determine available recipient options based on user role
  const getRecipientOptions = () => {
    if (user?.role === 'WDC_SECRETARY') {
      return [
        { value: 'LGA', label: 'LGA Chairman', icon: Building2 },
        { value: 'STATE', label: 'State Leadership', icon: Shield },
      ];
    } else if (user?.role === 'LGA_COORDINATOR') {
      return [
        { value: 'WDC', label: 'Ward Secretaries', icon: Users },
        { value: 'STATE', label: 'State Leadership', icon: Shield },
      ];
    } else if (user?.role === 'STATE_OFFICIAL') {
      return [
        { value: 'LGA', label: 'LGA Chairmen', icon: Building2 },
        { value: 'WDC', label: 'Ward Secretaries', icon: Users },
      ];
    }
    return [];
  };

  const recipientOptions = getRecipientOptions();

  const handleSendMessage = async () => {
    if (!newMessage.trim() || (!recipientType && !replyTo)) {
      setAlertMessage({ type: 'error', text: 'Please select a recipient and enter a message' });
      return;
    }

    try {
      setSending(true);
      const payload = {
        ward_id: user.ward_id || (replyTo?.ward_id),
        message: newMessage,
        recipient_type: replyTo ? null : recipientType,
        parent_id: replyTo?.id || null,
      };

      if (replyTo) {
        payload.recipient_id = replyTo.sender?.id;
      }

      await apiClient.post('/feedback', payload);
      setNewMessage('');
      setRecipientType('');
      setReplyTo(null);
      setAlertMessage({ type: 'success', text: 'Message sent successfully!' });
      await refetch();
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to send message' });
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await apiClient.patch(`/feedback/${messageId}/read`);
      await refetch();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const toggleThread = (messageId) => {
    setExpandedThreads(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  // Group messages into threads
  const groupMessagesIntoThreads = () => {
    const threads = {};
    const rootMessages = [];

    messages.forEach(msg => {
      if (msg.parent_id) {
        if (!threads[msg.parent_id]) {
          threads[msg.parent_id] = [];
        }
        threads[msg.parent_id].push(msg);
      } else {
        rootMessages.push(msg);
      }
    });

    return { rootMessages, threads };
  };

  const { rootMessages, threads } = groupMessagesIntoThreads();

  // Filter messages
  const filteredMessages = rootMessages.filter(msg => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'sent') return msg.sender?.id === user?.id;
    if (activeFilter === 'received') return msg.recipient?.id === user?.id || !msg.recipient_id;
    if (activeFilter === 'unread') return !msg.is_read && msg.recipient?.id === user?.id;
    return true;
  });

  const getRoleLabel = (role) => {
    return ROLE_LABELS[role] || role;
  };

  const MessageThread = ({ message, level = 0 }) => {
    const isExpanded = expandedThreads[message.id];
    const replies = threads[message.id] || [];
    const isSentByMe = message.sender?.id === user?.id;
    const isReceivedByMe = message.recipient?.id === user?.id;

    return (
      <div className={`${level > 0 ? 'ml-8 mt-2' : ''}`}>
        <div
          className={`p-4 rounded-lg border-2 transition-all ${
            isSentByMe
              ? 'bg-primary-50 border-primary-200'
              : isReceivedByMe && !message.is_read
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-white border-neutral-200'
          } ${level > 0 ? 'border-l-4 border-l-blue-400' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-neutral-900">
                  {message.sender?.full_name || 'Unknown'}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">
                  {getRoleLabel(message.sender?.role)}
                </span>
                {isSentByMe && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    You
                  </span>
                )}
              </div>
              {message.recipient && (
                <p className="text-xs text-neutral-500">
                  To: {message.recipient.full_name} ({getRoleLabel(message.recipient.role)})
                </p>
              )}
              {message.ward_name && (
                <p className="text-xs text-neutral-500">Ward: {message.ward_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isReceivedByMe && (
                message.is_read ? (
                  <CheckCheck className="w-4 h-4 text-green-500" title="Read" />
                ) : (
                  <Check className="w-4 h-4 text-neutral-400" title="Delivered" />
                )
              )}
              <span className="text-xs text-neutral-500">{formatDate(message.created_at, true)}</span>
            </div>
          </div>

          <p className="text-neutral-700 whitespace-pre-wrap">{message.message}</p>

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="ghost"
              icon={Reply}
              onClick={() => {
                setReplyTo(message);
                setRecipientType('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Reply
            </Button>
            {replies.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={isExpanded ? ChevronDown : ChevronRight}
                onClick={() => toggleThread(message.id)}
              >
                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
              </Button>
            )}
            {isReceivedByMe && !message.is_read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAsRead(message.id)}
              >
                Mark as read
              </Button>
            )}
          </div>
        </div>

        {isExpanded && replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map(reply => (
              <MessageThread key={reply.id} message={reply} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Professional Messaging</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Communicate with ward secretaries, LGA chairmen, and state leadership
        </p>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.text}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {/* Compose Message Card */}
      <Card>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          {replyTo ? `Replying to ${replyTo.sender.full_name}` : 'Compose New Message'}
        </h3>

        {replyTo && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded relative">
            <button
              onClick={() => setReplyTo(null)}
              className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-sm text-neutral-600 mb-1">
              <span className="font-medium">{replyTo.sender.full_name}:</span>
            </p>
            <p className="text-sm text-neutral-700 italic line-clamp-2">"{replyTo.message}"</p>
          </div>
        )}

        {!replyTo && recipientOptions.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Send To:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {recipientOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRecipientType(option.value)}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                    recipientType === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <option.icon className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-neutral-900">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message here..."
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
          rows={4}
        />

        <div className="flex justify-end mt-3">
          <Button
            icon={Send}
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || (!recipientType && !replyTo)}
            loading={sending}
          >
            Send Message
          </Button>
        </div>
      </Card>

      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All Messages' },
          { value: 'received', label: 'Received' },
          { value: 'sent', label: 'Sent' },
          { value: 'unread', label: 'Unread' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeFilter === filter.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <Card>
        {filteredMessages.length > 0 ? (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <MessageThread key={message.id} message={message} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 font-medium">
              {activeFilter === 'all'
                ? 'No messages yet. Start a conversation!'
                : `No ${activeFilter} messages`}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MessagesPage;
