/**
 * TextMessage Component
 * Renders markdown-formatted text messages with XSS protection
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

/**
 * Simple markdown renderer without external dependencies
 * Used as fallback if ReactMarkdown is not available
 */
const SimpleMarkdown = ({ content }) => {
  // Basic markdown parsing
  const parseMarkdown = (text) => {
    let html = DOMPurify.sanitize(text)
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-3 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
      // Line breaks
      .replace(/\n/g, '<br />');
    
    return html;
  };

  return (
    <div 
      className="prose prose-sm max-w-none prose-neutral"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

/**
 * TextMessage Component
 */
const TextMessage = ({ content, className = '' }) => {
  // Sanitize content
  const sanitizedContent = DOMPurify.sanitize(content);

  // Try to use ReactMarkdown, fallback to SimpleMarkdown
  const hasReactMarkdown = typeof ReactMarkdown !== 'undefined';

  return (
    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${className}`}>
      {hasReactMarkdown ? (
        <ReactMarkdown
          className="prose prose-sm max-w-none prose-neutral"
          components={{
            // Custom renderers for better styling
            h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-3 text-neutral-900">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2 text-neutral-900">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-2 text-neutral-900">{children}</h3>,
            p: ({ children }) => <p className="mb-2 text-neutral-700">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-neutral-700">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
            em: ({ children }) => <em className="italic text-neutral-700">{children}</em>,
            code: ({ children }) => (
              <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-sm font-mono text-neutral-800">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-neutral-100 p-3 rounded-lg overflow-x-auto my-2">
                {children}
              </pre>
            ),
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      ) : (
        <SimpleMarkdown content={sanitizedContent} />
      )}
    </div>
  );
};

export default TextMessage;
