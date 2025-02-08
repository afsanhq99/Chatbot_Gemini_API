'use client';

import { useState } from 'react';
import MessageContent from './MessageContent';
import { useTheme } from 'next-themes'; // Import useTheme

export default function ChatMessage({ message }) {
    const [isCopied, setIsCopied] = useState(false);
    const { theme } = useTheme(); // Use the useTheme hook

    const handleCopy = () => {
        // Extract the text from message parts
        const messageText = message.parts.map(part => part.text).join('\n');

        // Format the text for better readability
        const formattedText = messageText
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers (**)
            .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers (*)
            .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
            .replace(/#+\s*/g, '')           // Remove headers (#, ##, ###)
            .replace(/\n\s*\n/g, '\n\n')     // Remove extra line breaks
            .trim();                         // Trim leading/trailing spaces

        // Copy the formatted text to the clipboard
        navigator.clipboard.writeText(formattedText)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000); // Reset copied state after 2 seconds
            })
            .catch((error) => {
                console.error('Failed to copy text:', error);
            });
    };

    return (
        <div className={`mb-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block px-4 py-3 rounded-lg relative ${message.role === 'user' ? 'bg-blue-500 text-white' : (theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800')}`}>
                {/* Copy button */}
                <button
                    onClick={handleCopy}
                    className={`absolute -top-2 -right-2 p-1 rounded-full text-sm ${message.role === 'user' ? 'bg-blue-600 hover:bg-blue-700' : (theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400')}`}
                    title="Copy to clipboard"
                >
                    {isCopied ? (
                        <span>✅</span> // Show a checkmark when copied
                    ) : (
                        <span>📄</span> // Show a clipboard icon by default
                    )}
                </button>
                <MessageContent message={message} />
            </div>
        </div>
    );
}