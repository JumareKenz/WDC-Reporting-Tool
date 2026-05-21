/**
 * AIChatInterface Component
 * Main chat interface for State Officials
 * Connected to backend AI chat endpoints (Groq-powered)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  TrendingUp,
  BarChart3,
  FileText,
  Users,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Trash2,
  Plus,
  History,
  ChevronLeft,
  PanelLeft,
  PanelRight,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import {
  getChatSessions,
  createChatSession,
  deleteChatSession,
  getChatHistory,
  sendMessage,
} from '../../api/chat';
import {
  TextMessage,
  DataTableMessage,
  ChartMessage,
  ErrorMessage,
  TypingIndicator,
} from '../chat';

// Example questions for quick start
const EXAMPLE_QUESTIONS = [
  {
    icon: TrendingUp,
    question: "What's the overall submission trend?",
    category: "Trends"
  },
  {
    icon: BarChart3,
    question: "Compare LGA performance",
    category: "Analysis"
  },
  {
    icon: FileText,
    question: "How many reports are missing this month?",
    category: "Reports"
  },
  {
    icon: Lightbulb,
    question: "Which LGAs need attention?",
    category: "Insights"
  },
];

// Initial welcome message
const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! I'm your AI assistant for the Kaduna State WDC Digital Reporting System.

I can help you with:
- **Data Queries** - Ask about reports, submissions, LGA performance
- **Analytics** - Trends, comparisons, and statistics
- **General Questions** - System information and help

What would you like to know?`,
  message_type: 'text',
  timestamp: new Date().toISOString(),
};

/**
 * AIChatInterface Component
 */
const AIChatInterface = ({ isOpen, onClose }) => {
  const { user, hasRole } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check if user is a state official
  const isAuthorized = hasRole(USER_ROLES.STATE_OFFICIAL);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Load sessions when chat opens
  useEffect(() => {
    if (isOpen && isAuthorized) {
      loadSessions();
    }
  }, [isOpen, isAuthorized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ==================== Session Management ====================

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await getChatSessions();
      const data = response?.data?.sessions || response?.sessions || response?.data || [];
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCreateNewSession = useCallback(async () => {
    setCurrentSessionId(null);
    setMessages([INITIAL_MESSAGE]);
    setInput('');
  }, []);

  const selectSession = useCallback(async (sessionId) => {
    if (sessionId === currentSessionId) return;
    setCurrentSessionId(sessionId);
    setLoadingMessages(true);
    setMessages([INITIAL_MESSAGE]);

    try {
      const response = await getChatHistory(sessionId);
      const history = response?.data?.messages || response?.messages || response?.data || [];
      if (Array.isArray(history) && history.length > 0) {
        const formattedMessages = history.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          message_type: msg.message_type || 'text',
          metadata: msg.metadata || null,
          timestamp: msg.created_at || msg.timestamp || new Date().toISOString(),
        }));
        setMessages([INITIAL_MESSAGE, ...formattedMessages]);
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [currentSessionId]);

  const handleDeleteSession = useCallback(async (sessionId, e) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([INITIAL_MESSAGE]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [currentSessionId]);

  // ==================== Message Handling ====================

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to UI immediately
    const userMsgObj = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      message_type: 'text',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsgObj]);
    setIsTyping(true);

    try {
      const response = await sendMessage(userMessage, currentSessionId);

      // Extract the AI response and session info
      const data = response?.data || response;
      const aiMessage = data?.message || data?.response || data;
      const sessionId = data?.conversation_id || data?.session_id || currentSessionId;

      // Update session ID if this was a new conversation
      if (!currentSessionId && sessionId) {
        setCurrentSessionId(sessionId);
        // Reload sessions to show the new one
        loadSessions();
      }

      const aiMsgObj = {
        id: aiMessage?.id || `ai-${Date.now()}`,
        role: 'assistant',
        content: aiMessage?.content || (typeof aiMessage === 'string' ? aiMessage : 'I received your message but couldn\'t generate a proper response.'),
        message_type: aiMessage?.message_type || 'text',
        metadata: aiMessage?.metadata || null,
        timestamp: aiMessage?.created_at || new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMsgObj]);
    } catch (error) {
      const errorMsgObj = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error.message || 'Failed to get a response. Please try again.',
        message_type: 'error',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsgObj]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExampleClick = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ==================== Render Helpers ====================

  const renderMessage = (message) => {
    const isUser = message.role === 'user';
    const baseClasses = `flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`;

    return (
      <div key={message.id} className={baseClasses}>
        {!isUser && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shadow-md flex-shrink-0">
            <Bot className="w-5 h-5 text-purple-600" />
          </div>
        )}

        <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
          {/* Message Bubble */}
          <div className={`rounded-2xl p-4 shadow-sm ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-none'
              : 'bg-white border border-neutral-200 rounded-tl-none'
          }`}>
            {/* Render based on message type */}
            {message.message_type === 'text' && (
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'text-white' : 'text-neutral-800'}`}>
                {message.content}
              </div>
            )}

            {message.message_type === 'table' && message.metadata?.table_data && (
              <div className="min-w-[300px]">
                <DataTableMessage
                  tableData={message.metadata.table_data}
                  title={message.content}
                />
              </div>
            )}

            {message.message_type === 'chart' && message.metadata?.chart_data && (
              <div className="min-w-[300px]">
                <ChartMessage
                  chartData={message.metadata.chart_data}
                  title={message.content}
                />
              </div>
            )}

            {message.message_type === 'error' && (
              <ErrorMessage error={message.content} />
            )}
          </div>

          {/* Timestamp */}
          <p className={`text-xs mt-1 ${isUser ? 'text-right text-neutral-400' : 'text-neutral-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {isUser && (
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 order-first">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  // ==================== Unauthorized View ====================

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">Access Denied</h2>
          </div>
          <p className="text-neutral-600 mb-6">
            The AI Assistant is only available to State Officials. Please contact your administrator if you need access.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex overflow-hidden"
      >
        {/* Sidebar - Conversation History */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-neutral-200 bg-neutral-50 flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="p-4 border-b border-neutral-200">
                <button
                  onClick={handleCreateNewSession}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  New Chat
                </button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <History className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500">No conversations yet</p>
                    <p className="text-xs text-neutral-400 mt-1">Start a new chat to begin</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => selectSession(session.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors group ${
                        currentSessionId === session.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-neutral-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            currentSessionId === session.id ? 'text-primary-900' : 'text-neutral-700'
                          }`}>
                            {session.title || 'Untitled'}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-lg transition-all"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-gradient-to-r from-primary-600 to-purple-600">
            <div className="flex items-center gap-3">
              {/* Toggle Sidebar */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
              >
                {showSidebar ? (
                  <PanelLeft className="w-5 h-5 text-white" />
                ) : (
                  <PanelRight className="w-5 h-5 text-white" />
                )}
              </button>

              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  AI Assistant
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                </h2>
                <p className="text-xs text-primary-100">Powered by Groq AI</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-neutral-50 to-white">
            <div className="space-y-6 max-w-4xl mx-auto">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
              ) : (
                messages.map(renderMessage)
              )}

              {/* Typing Indicator */}
              {isTyping && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Example Questions */}
          {messages.length === 1 && !isTyping && !loadingMessages && (
            <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50">
              <p className="text-sm font-medium text-neutral-700 mb-2">Try asking:</p>
              <div className="grid grid-cols-2 gap-2">
                {EXAMPLE_QUESTIONS.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example.question)}
                    className="flex items-center gap-2 p-2.5 bg-white hover:bg-primary-50 border border-neutral-200 hover:border-primary-300 rounded-xl transition-all text-left group"
                  >
                    <example.icon className="w-4 h-4 text-neutral-400 group-hover:text-primary-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary-600">{example.category}</p>
                      <p className="text-sm text-neutral-700 group-hover:text-primary-900 truncate">
                        {example.question}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            <div className="max-w-4xl mx-auto flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about the WDC data..."
                rows={1}
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none min-h-[48px] max-h-[120px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2 text-center max-w-4xl mx-auto">
              AI-powered by Groq. Ask about trends, performance, or specific LGAs.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AIChatInterface;
