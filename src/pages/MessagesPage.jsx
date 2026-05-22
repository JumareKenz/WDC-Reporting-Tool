import { useState } from 'react';
import {
  MessageSquare,
  Send,
  Reply,
  ArrowLeft,
  Check,
  CheckCheck,
  X,
  User,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
} from '../hooks/useMessaging';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatters';
import { getUserRoleLabel } from '../utils/constants';

const MessagesPage = () => {
  const { user } = useAuth();
  const [alertMessage, setAlertMessage] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyBody, setReplyBody] = useState('');

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    refetch: refetchConversations,
  } = useConversations({ state: activeFilter === 'unread' ? 'unread' : 'all', limit: 50 });

  const {
    data: messagesData,
    isLoading: messagesLoading,
  } = useConversationMessages(selectedConversation?.id, { limit: 100 });

  const sendMutation = useSendMessage();
  const markReadMutation = useMarkConversationRead();

  const conversations = conversationsData?.data?.conversations || conversationsData?.conversations || [];
  const messages = messagesData?.data?.messages || messagesData?.messages || [];

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    if (conversation.unreadCount > 0) {
      try {
        await markReadMutation.mutateAsync(conversation.id);
        await refetchConversations();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleSendReply = async () => {
    if (!replyBody.trim() || !selectedConversation) {
      setAlertMessage({ type: 'error', text: 'Please enter a message' });
      return;
    }

    try {
      await sendMutation.mutateAsync({
        conversationId: selectedConversation.id,
        body: replyBody.trim(),
      });
      setReplyBody('');
      setAlertMessage({ type: 'success', text: 'Message sent!' });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        text: error.response?.data?.message || error.message || 'Failed to send message',
      });
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setReplyBody('');
  };

  // Conversation list view
  if (!selectedConversation) {
    if (conversationsLoading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" text="Loading conversations..." />
        </div>
      );
    }

    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Your conversations with coordinators, secretaries, and leadership
          </p>
        </div>

        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.text}
            onClose={() => setAlertMessage(null)}
          />
        )}

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'All' },
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

        {/* Conversations List */}
        <Card>
          {conversations.length > 0 ? (
            <div className="divide-y divide-neutral-200">
              {conversations.map((conv) => {
                const otherParticipant = conv.participants?.find((p) => p.id !== user?.id);
                const unread = conv.unreadCount > 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-4 hover:bg-neutral-50 transition-colors ${
                      unread ? 'bg-accent-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          <span className={`font-medium text-neutral-900 truncate ${unread ? 'font-bold' : ''}`}>
                            {otherParticipant?.fullName || 'Unknown'}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">
                            {getUserRoleLabel({ role: otherParticipant?.role })}
                          </span>
                          {unread && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-600 text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.subject && (
                          <p className="text-sm text-neutral-600 mb-1 truncate">{conv.subject}</p>
                        )}
                        <p className="text-sm text-neutral-500 line-clamp-2">{conv.lastMessagePreview}</p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span className="text-xs text-neutral-500">{formatDate(conv.lastMessageAt, true)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">
                {activeFilter === 'unread' ? 'No unread messages' : 'No conversations yet'}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Conversation thread view
  const otherParticipant = selectedConversation.participants?.find((p) => p.id !== user?.id);

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={ArrowLeft} onClick={handleBackToList}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">
            {otherParticipant?.fullName || 'Unknown'}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            {getUserRoleLabel({ role: otherParticipant?.role })}
          </p>
        </div>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.text}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {/* Messages Thread */}
      <Card>
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isSentByMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSentByMe
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-neutral-900">
                          {msg.senderName || 'Unknown'}
                        </span>
                        {isSentByMe && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSentByMe && (msg.readAt ? (
                        <CheckCheck className="w-4 h-4 text-primary-500" title="Read" />
                      ) : (
                        <Check className="w-4 h-4 text-neutral-400" title="Sent" />
                      ))}
                      <span className="text-xs text-neutral-500">{formatDate(msg.createdAt, true)}</span>
                    </div>
                  </div>
                  <p className="text-neutral-700 whitespace-pre-wrap">{msg.body}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 font-medium">No messages in this conversation</p>
          </div>
        )}
      </Card>

      {/* Reply Box */}
      <Card>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          <Reply className="w-5 h-5 inline mr-2" />
          Reply
        </h3>
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Type your message here..."
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none bg-white text-gray-900"
          rows={4}
        />
        <div className="flex justify-end mt-3">
          <Button
            icon={Send}
            onClick={handleSendReply}
            disabled={!replyBody.trim() || sendMutation.isPending}
            loading={sendMutation.isPending}
          >
            Send Reply
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MessagesPage;
