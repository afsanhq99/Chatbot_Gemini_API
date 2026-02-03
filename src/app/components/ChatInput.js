'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes'; // Import useTheme

export default function ChatInput({ onSendMessage, isLoading, className = '', placeholder = 'Enter your message' }) {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false); // Track input focus
    const [isSending, setIsSending] = useState(false); // Track sending state
    const { theme } = useTheme(); // Use the useTheme hook

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (input.trim() === '') return;

        setIsSending(true); // Trigger fade-out effect
        await onSendMessage(input); // Wait for the message to be sent
        setInput('');
        setIsSending(false); // Reset sending state
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className={`flex items-center gap-3 rounded-full p-2 ${theme === 'dark' ? 'bg-gray-800/80' : 'bg-white/80'} shadow-lg shadow-blue-500/10 backdrop-blur`}>
                {/* Input Field */}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)} // Trigger fade-in effect
                    onBlur={() => setIsFocused(false)} // Reset focus state
                    placeholder={placeholder}
                    className={`flex-grow bg-transparent px-4 py-3 focus:outline-none transition-all duration-300 text-sm md:text-base ${theme === 'dark' ? 'text-gray-100 placeholder:text-gray-400' : 'text-gray-700 placeholder:text-gray-500'
                        } ${isFocused ? 'animate-fade-in' : ''} ${className}`}
                />

                {/* Send Button */}
                <button
                    type="submit"
                    className={`font-semibold py-3 px-6 rounded-full transition-all duration-200 transform ${isLoading ? 'cursor-not-allowed opacity-75' : 'hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30'
                        } ${isSending ? 'animate-fade-out' : ''} bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white`} // Apply fade-out effect when sending
                    disabled={isLoading}
                >
                    Send
                </button>
            </div>
        </form>
    );
}
