import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  markConversationRead,
  broadcastMessage,
  getDeliveries,
  markDeliveryRead,
} from '../api/messages';

export const MESSAGING_QUERY_KEYS = {
  conversations: 'conversations',
  conversationMessages: 'conversation-messages',
  deliveries: 'message-deliveries',
};

/**
 * List conversations for the current user.
 * Query params: { state: 'all' | 'unread', limit, offset }
 */
export const useConversations = (params = {}) => {
  return useQuery({
    queryKey: [MESSAGING_QUERY_KEYS.conversations, params],
    queryFn: () => getConversations(params),
    staleTime: 30000, // 30s
  });
};

/**
 * Get messages in a conversation.
 * Query params: { limit, offset }
 */
export const useConversationMessages = (conversationId, params = {}) => {
  return useQuery({
    queryKey: [MESSAGING_QUERY_KEYS.conversationMessages, conversationId, params],
    queryFn: () => getConversationMessages(conversationId, params),
    enabled: !!conversationId,
    staleTime: 10000, // 10s
  });
};

/**
 * Send a new message or reply.
 * Body: { recipientId, body, subject? } | { conversationId, body, parentMessageId? }
 */
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MESSAGING_QUERY_KEYS.conversations] });
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: [MESSAGING_QUERY_KEYS.conversationMessages, variables.conversationId],
        });
      }
    },
  });
};

/**
 * Mark all unread messages in a conversation as read.
 */
export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markConversationRead,
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: [MESSAGING_QUERY_KEYS.conversations] });
      queryClient.invalidateQueries({
        queryKey: [MESSAGING_QUERY_KEYS.conversationMessages, conversationId],
      });
    },
  });
};

// ───────────────────────────────────────────────────────────────────────────
// Legacy broadcast hooks (for director role)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Broadcast a message (director only).
 * Body: { body, scope, lgaId?, wardId? }
 */
export const useBroadcastMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: broadcastMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGING_QUERY_KEYS.deliveries] });
    },
  });
};

/**
 * List deliveries for the caller (legacy broadcasts).
 * Query params: { state: 'all' | 'unread', limit, offset }
 */
export const useDeliveries = (params = {}) => {
  return useQuery({
    queryKey: [MESSAGING_QUERY_KEYS.deliveries, params],
    queryFn: () => getDeliveries(params),
    staleTime: 30000,
  });
};

/**
 * Mark a single delivery as read.
 */
export const useMarkDeliveryRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markDeliveryRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MESSAGING_QUERY_KEYS.deliveries] });
    },
  });
};
