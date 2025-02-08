'use client';

import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

export default function ChatHistory({ chatHistory, isLoading }) {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [chatHistory]);

    return (
        <div className="border rounded-lg h-[80vh] overflow-y-auto mb-4 p-4 bg-gray-50">
            {chatHistory.map((message, index) => (
                <div key={index} className="animate-fade-in">
                    <ChatMessage message={message} />
                </div>
            ))}
            {isLoading && (
                <div className="mb-2 text-left animate-fade-in">
                    <div className="inline-block px-3 py-2 rounded-lg bg-gray-200 text-gray-600">
                        <div className="flex items-center">
                            <span>Typing...</span>
                            <div className="ml-2 flex space-x-1">
                                <div className="h-2 w-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                                <div className="h-2 w-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
                                <div className="h-2 w-2 bg-gray-600 rounded-full animate-bounce delay-300"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}