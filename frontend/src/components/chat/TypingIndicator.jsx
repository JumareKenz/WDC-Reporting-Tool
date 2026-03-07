/**
 * TypingIndicator Component
 * Shows animated typing indicator when AI is processing
 */
import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

/**
 * TypingIndicator Component
 */
const TypingIndicator = ({ className = '' }) => {
  return (
    <div className={`flex gap-3 ${className}`}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shadow-md flex-shrink-0">
        <Bot className="w-5 h-5 text-purple-600" />
      </div>

      {/* Typing Bubble */}
      <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-none p-4 flex items-center gap-3 shadow-sm">
        {/* Animated dots */}
        <div className="flex items-center gap-1">
          <span 
            className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span 
            className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        
        {/* Text */}
        <span className="text-sm text-neutral-600">
          AI is thinking
        </span>
        
        {/* Sparkle */}
        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
      </div>
    </div>
  );
};

export default TypingIndicator;
