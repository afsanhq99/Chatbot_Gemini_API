'use client';

import { useState } from 'react';

export default function ChatInput({ onSendMessage, isLoading }) {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false); // Track input focus
    const [isSending, setIsSending] = useState(false); // Track sending state

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (input.trim() === '') return;

        setIsSending(true); // Trigger fade-out effect
        await onSendMessage(input); // Wait for the message to be sent
        setInput('');
        setIsSending(false); // Reset sending state
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white">
            <div className="flex">
                {/* Input Field */}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)} // Trigger fade-in effect
                    onBlur={() => setIsFocused(false)} // Reset focus state
                    placeholder="Enter your message"
                    className={`flex-grow border rounded-l-lg px-4 py-3 focus:outline-none text-gray-700 bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 ${isFocused ? 'animate-fade-in' : ''
                        }`}
                />

                {/* Send Button */}
                <button
                    type="submit"
                    className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-r-lg transition-all duration-200 transform ${isLoading ? 'cursor-not-allowed opacity-75' : 'hover:scale-105'
                        } ${isSending ? 'animate-fade-out' : ''}`} // Apply fade-out effect when sending
                    disabled={isLoading}
                >
                    Send
                </button>
            </div>
        </form>
    );
}