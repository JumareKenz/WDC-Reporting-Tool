import { useState } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCircle,
  Search,
  Filter,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';
import { useFeedback, useSendFeedback } from '../hooks/useLGAData';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../utils/formatters';
import { USER_ROLES, ROLE_LABELS } from '../utils/constants';

const MessagesPage = () => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [recipientType, setRecipientType] = useState(
    user?.role === USER_ROLES.WDC_SECRETARY ? 'LGA' : 'WDC'
  );

  const { data: feedbackData, isLoading, refetch } = useFeedback({ limit: 50 });
  const sendFeedbackMutation = useSendFeedback();

  const messages = feedbackData?.data?.messages || feedbackData?.messages || [];

  const filteredMessages = messages.filter(m =>
    m.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sender_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendFeedbackMutation.mutateAsync({
        message: newMessage,
        recipient_type: recipientType,
        ward_id: user?.ward_id,
      });
      setNewMessage('');
      setAlertMessage({ type: 'success', text: 'Message sent successfully!' });
      refetch();
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to send message' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
        <p className="text-sm text-neutral-600 mt-1">
          {user?.role === USER_ROLES.WDC_SECRETARY
            ? 'Communicate with your LGA Coordinator and State Officials'
            : `Communicate with ${user?.role === USER_ROLES.LGA_COORDINATOR ? 'ward secretaries' : 'LGA coordinators'}`}
        </p>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.text}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-2">
          <Card
            title="Message History"
            action={
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-48"
                />
              </div>
            }
          >
            {filteredMessages.length > 0 ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {filteredMessages.map((message) => {
                  const isFromMe = message.sender_id === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isFromMe
                            ? 'bg-primary-600 text-white rounded-br-md'
                            : 'bg-neutral-100 text-neutral-900 rounded-bl-md'
                        }`}
                      >
                        {!isFromMe && (
                          <p className={`text-xs font-medium mb-1 ${isFromMe ? 'text-primary-200' : 'text-primary-600'}`}>
                            {message.sender_name || 'Unknown'}
                          </p>
                        )}
                        <p className="text-sm">{message.message}</p>
                        <div className={`flex items-center gap-2 mt-2 text-xs ${isFromMe ? 'text-primary-200' : 'text-neutral-500'}`}>
                          <Clock className="w-3 h-3" />
                          {formatDate(message.created_at, true)}
                          {isFromMe && message.read_at && (
                            <CheckCircle className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 font-medium">No messages yet</p>
                <p className="text-sm text-neutral-400 mt-1">
                  Start a conversation by sending a message
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Compose Message */}
        <div className="lg:col-span-1">
          <Card title="Send Message">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  To
                </label>
                {user?.role === USER_ROLES.WDC_SECRETARY ? (
                  <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="LGA">LGA Coordinator</option>
                    <option value="STATE">State Official</option>
                  </select>
                ) : (
                  <div className="px-3 py-2 bg-neutral-50 rounded-lg text-sm text-neutral-600">
                    {user?.role === USER_ROLES.LGA_COORDINATOR
                      ? 'Ward Secretaries'
                      : 'LGA Coordinators'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Message
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              <Button
                fullWidth
                icon={Send}
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                loading={sendFeedbackMutation.isPending}
              >
                Send Message
              </Button>
            </div>
          </Card>

          {/* Quick Info */}
          <Card title="Info" className="mt-6">
            <div className="space-y-3 text-sm text-neutral-600">
              <p>
                Use this channel to communicate with{' '}
                {user?.role === USER_ROLES.WDC_SECRETARY
                  ? 'your LGA Coordinator and State Officials'
                  : user?.role === USER_ROLES.LGA_COORDINATOR
                  ? 'ward secretaries'
                  : 'LGA coordinators'}{' '}
                about:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Report clarifications</li>
                <li>Support requests</li>
                <li>General inquiries</li>
                <li>Feedback and suggestions</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
