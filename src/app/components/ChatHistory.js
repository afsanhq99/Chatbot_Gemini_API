'use client';

import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { useTheme } from 'next-themes'; // Import useTheme

export default function ChatHistory({ chatHistory, isLoading }) {
    const messagesEndRef = useRef(null);
    const { theme } = useTheme(); // Use the useTheme hook

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [chatHistory]);

    return (
        <div
            className={`h-[80vh] overflow-y-auto mb-4 p-2 md:p-4 space-y-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
        >
            {chatHistory.map((message, index) => (
                <div key={index} className="animate-fade-in">
                    <ChatMessage message={message} />
                </div>
            ))}
            {isLoading && (
                <div className="mb-2 text-left animate-fade-in">
                    <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-sm ${theme === 'dark' ? 'bg-gray-800/80 text-gray-300 border border-gray-700/60' : 'bg-white/90 text-gray-600 border border-gray-200'
                            }`}
                    >
                        <div className="flex items-center">
                            <span>Typing...</span>
                            <div className="ml-2 flex space-x-1">
                                <div
                                    className={`h-2 w-2 rounded-full animate-bounce delay-100 ${theme === 'dark' ? 'bg-gray-300' : 'bg-gray-600'
                                        }`}
                                ></div>
                                <div
                                    className={`h-2 w-2 rounded-full animate-bounce delay-200 ${theme === 'dark' ? 'bg-gray-300' : 'bg-gray-600'
                                        }`}
                                ></div>
                                <div
                                    className={`h-2 w-2 rounded-full animate-bounce delay-300 ${theme === 'dark' ? 'bg-gray-300' : 'bg-gray-600'
                                        }`}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
