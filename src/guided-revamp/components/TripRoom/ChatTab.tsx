import { useState, useEffect, useRef } from 'react';
import { Send, Loader, Paperclip } from 'lucide-react';
import { TripRoomMessage } from '../../services/tripRoomService';
import { getRoomMessages, sendMessage, subscribeToMessages } from '../../services/tripRoomService';

interface ChatTabProps {
  roomId: string;
  currentUserName: string;
  currentUserType: 'agent' | 'customer';
}

export default function ChatTab({ roomId, currentUserName, currentUserType }: ChatTabProps) {
  const [messages, setMessages] = useState<TripRoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const subscription = subscribeToMessages(roomId, (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const data = await getRoomMessages(roomId);
    setMessages(data);
    setLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const result = await sendMessage(roomId, currentUserName, currentUserType, newMessage.trim());

    if (result.success) {
      setNewMessage('');
    } else {
      alert(`Failed to send message: ${result.error}`);
    }

    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: TripRoomMessage[] } = {};

    messages.forEach((message) => {
      const dateKey = formatDate(message.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.keys(messageGroups).length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm mt-2">Start a conversation with your {currentUserType === 'agent' ? 'customers' : 'guide'}!</p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                  {date}
                </div>
              </div>
              <div className="space-y-4">
                {msgs.map((message) => {
                  const isOwnMessage = message.sender_type === currentUserType;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwnMessage && (
                          <p className="text-xs font-medium text-gray-600 mb-1 px-1">
                            {message.sender_name}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-1">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          <button className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              disabled={sending}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            {sending ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
