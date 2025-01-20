// app/components/ChatInput.js
'use client';

import { useState } from 'react';

export default function ChatInput({ onSendMessage, isLoading }) {
    const [input, setInput] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (input.trim() === '') return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white">
            <div className="flex">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your message"
                    className="flex-grow border rounded-l-lg px-4 py-3 focus:outline-none text-gray-700 bg-gray-100 focus:ring focus:ring-blue-200"
                />
                <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-r-lg transition-colors duration-200"
                    disabled={isLoading}
                >
                    Send
                </button>
            </div>
        </form>
    );
}