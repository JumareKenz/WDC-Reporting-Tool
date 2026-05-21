/**
 * Chat Context Provider and Hook
 * Manages chat state, sessions, and message history
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChatSessions,
  createChatSession,
  deleteChatSession,
  updateSessionTitle,
  getChatHistory,
  sendMessage,
  clearAllChatHistory,
} from '../api/chat';

// Chat Context
const ChatContext = createContext(null);

// Query keys
const CHAT_QUERY_KEYS = {
  sessions: 'chat-sessions',
  history: (sessionId) => ['chat-history', sessionId],
};

/**
 * Chat Provider Component
 */
export const ChatProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // ==================== Sessions ====================

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useQuery({
    queryKey: [CHAT_QUERY_KEYS.sessions],
    queryFn: getChatSessions,
    staleTime: 60000,
  });

  const sessions = sessionsData?.data?.sessions || sessionsData?.sessions || [];

  const createSessionMutation = useMutation({
    mutationFn: createChatSession,
    onSuccess: (result) => {
      const session = result.data?.session || result.session;
      queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.sessions] });
      setCurrentSessionId(session.id);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deleteChatSession,
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.sessions] });
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ sessionId, title }) => updateSessionTitle(sessionId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.sessions] });
    },
  });

  // ==================== Messages ====================

  const {
    data: historyData,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: CHAT_QUERY_KEYS.history(currentSessionId),
    queryFn: () => getChatHistory(currentSessionId),
    enabled: !!currentSessionId,
    staleTime: 30000,
  });

  const messages = historyData?.data?.messages || historyData?.messages || [];

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, sessionId }) => sendMessage(message, sessionId),
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.history(currentSessionId) });
      queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.sessions] });
    },
    onSettled: () => {
      setIsTyping(false);
      scrollToBottom();
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: clearAllChatHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.sessions] });
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.history(currentSessionId) });
      setCurrentSessionId(null);
    },
  });

  // ==================== Actions ====================

  const createNewSession = useCallback(async (title = null) => {
    const result = await createSessionMutation.mutateAsync(title);
    return result.data?.session || result.session;
  }, [createSessionMutation]);

  const selectSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
  }, []);

  const sendChatMessage = useCallback(async (message) => {
    if (!message.trim()) return;

    // Create session if none selected
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession = await createNewSession(message.substring(0, 50));
      sessionId = newSession.id;
    }

    await sendMessageMutation.mutateAsync({ message, sessionId });
    return sessionId;
  }, [currentSessionId, createNewSession, sendMessageMutation]);

  const deleteSession = useCallback(async (sessionId) => {
    await deleteSessionMutation.mutateAsync(sessionId);
  }, [deleteSessionMutation]);

  const updateSessionTitle = useCallback(async (sessionId, title) => {
    await updateTitleMutation.mutateAsync({ sessionId, title });
  }, [updateTitleMutation]);

  const clearAllHistory = useCallback(async () => {
    await clearHistoryMutation.mutateAsync();
  }, [clearHistoryMutation]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ==================== Context Value ====================

  const value = {
    // Sessions
    sessions,
    sessionsLoading,
    sessionsError,
    currentSessionId,
    
    // Messages
    messages,
    historyLoading,
    isTyping,
    messagesEndRef,
    
    // Actions
    createNewSession,
    selectSession,
    deleteSession,
    updateSessionTitle,
    sendChatMessage,
    clearAllHistory,
    scrollToBottom,
    
    // Loading states
    isCreatingSession: createSessionMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    isDeletingSession: deleteSessionMutation.isPending,
    isClearingHistory: clearHistoryMutation.isPending,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

/**
 * Hook to use chat context
 */
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

/**
 * Standalone hook for chat operations (without context)
 * Useful for components that need chat functionality without full context
 */
export const useChatOperations = () => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessageOp = useCallback(async (message, sessionId = null) => {
    setIsProcessing(true);
    try {
      const result = await sendMessage(message, sessionId);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getSessionsOp = useCallback(async () => {
    const result = await getChatSessions();
    return result.data?.sessions || result.sessions || [];
  }, []);

  const getHistoryOp = useCallback(async (sessionId) => {
    const result = await getChatHistory(sessionId);
    return result.data?.messages || result.messages || [];
  }, []);

  return {
    sendMessage: sendMessageOp,
    getSessions: getSessionsOp,
    getHistory: getHistoryOp,
    isProcessing,
  };
};

export default useChat;
