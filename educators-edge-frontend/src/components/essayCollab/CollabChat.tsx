/**
 * Collaborative Chat Panel
 *
 * Real-time chat between teacher and student during essay collaboration
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageCircle,
  User,
  Bot,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown
} from 'lucide-react';
import type { ChatMessage } from '@/services/essayCollabService';

interface CollabChatProps {
  messages: ChatMessage[];
  currentUserId: number;
  onSendMessage: (content: string) => void;
  onTyping?: () => void;
  typingUsers?: { userId: number; username: string }[];
  isConnected?: boolean;
}

const CollabChat: React.FC<CollabChatProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onTyping,
  typingUsers = [],
  isConnected = true
}) => {
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (onTyping && typingTimeoutRef.current === null) {
      onTyping();
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000);
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setInput('');
    setAutoScroll(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Bot className="w-4 h-4 text-gray-400" />;
      case 'agent_output':
        return <Bot className="w-4 h-4 text-blue-500" />;
      case 'approval_response':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.user_id === currentUserId;
    const isSystemMessage = message.message_type === 'system' || message.message_type === 'agent_output';

    if (isSystemMessage) {
      return (
        <div key={message.id} className="flex justify-center py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
            {getMessageIcon(message.message_type)}
            <span className="text-xs text-gray-600">{message.content}</span>
            <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div className={`max-w-[80%] ${isOwnMessage ? 'order-2' : ''}`}>
          {/* Username */}
          {!isOwnMessage && (
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-600">
                {message.username || 'User'}
              </span>
              {message.user_role === 'teacher' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                  Teacher
                </span>
              )}
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`
              px-4 py-2.5 rounded-2xl
              ${isOwnMessage
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }
            `}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Timestamp */}
          <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : ''}`}>
            <span className="text-[10px] text-gray-400">{formatTime(message.created_at)}</span>
            {isOwnMessage && (
              <CheckCircle className="w-3 h-3 text-blue-400" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Session Chat</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-full shadow-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          New messages
        </button>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-gray-50">
        {!isConnected && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-red-50 text-red-600 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            Connection lost. Messages may not be delivered.
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={1}
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollabChat;
