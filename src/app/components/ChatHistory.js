// app/components/ChatHistory.js
'use client';

import { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

export default function ChatHistory({ chatHistory, isLoading }) {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory]);

    return (
        <div className="border rounded-lg h-[60vh] overflow-y-auto mb-4 p-4 bg-gray-50">
            {chatHistory.map((message, index) => (
                <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
                <div className="mb-2 text-left">
                    <div className="inline-block px-3 py-2 rounded-lg bg-gray-200 animate-pulse text-gray-600">
                        Typing...
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}