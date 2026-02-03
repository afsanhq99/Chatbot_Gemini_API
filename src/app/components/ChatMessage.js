'use client';

import { useState, useCallback } from 'react';
import MessageContent from './MessageContent';
import { useTheme } from 'next-themes';

export default function ChatMessage({ message }) {
    const [isCopied, setIsCopied] = useState(false);
    const { theme } = useTheme();

    const handleCopy = useCallback(() => {
        // Function to format a single text part. This is now a separate, reusable function.
        const formatTextPart = (text) =>
            text
                .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers (**)
                .replace(/\*(.*?)\*/g, '$1')     // Remove italic markers (*)
                .replace(/#+\s*/g, '')           // Remove headers (#, ##, ###)
                .trim();                        // Trim leading/trailing spaces

        // Extract and format the message text.  We now handle code blocks *after*
        // processing other formatting, and we handle them separately.
        const messageText = message.parts
            .map((part) => {
                const codeBlockRegex = /```[\s\S]*?```/g;
                let formattedText = part.text;
                let match;
                let lastIndex = 0;
                let result = '';
                //Iterates through the text, findind and removing each code block
                while ((match = codeBlockRegex.exec(formattedText)) !== null) {
                    result += formatTextPart(formattedText.substring(lastIndex, match.index)); // Format text before the code block
                    lastIndex = codeBlockRegex.lastIndex;
                }
                result += formatTextPart(formattedText.substring(lastIndex)); //format remaining text
                return result;
            })
            .join('\n')
            .replace(/\n\s*\n/g, '\n\n'); // Remove extra line breaks after joining

        navigator.clipboard.writeText(messageText)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000); // Reset copied state
            })
            .catch((error) => {
                console.error('Failed to copy text:', error);
            });
    }, [message.parts]); // Dependency array for useCallback.  Re-create only if message.parts changes.

    // Helper function to get Tailwind classes based on role and theme.  This improves readability.
    const getMessageClasses = () => {
        const baseClasses = 'inline-block px-5 py-3 rounded-2xl relative shadow-lg transition-all duration-300';
        if (message.role === 'user') {
            return `${baseClasses} bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white shadow-indigo-500/30 hover:-translate-y-0.5`;
        } else {
            return theme === 'dark'
                ? `${baseClasses} bg-gray-800/80 text-gray-200 border border-gray-700/70 shadow-black/20 hover:-translate-y-0.5`
                : `${baseClasses} bg-white/90 text-gray-800 border border-gray-200 shadow-blue-500/10 hover:-translate-y-0.5`;
        }
    };

    const getCopyButtonClasses = () => {
        const baseClasses = `absolute -top-3 -right-3 p-1.5 rounded-full text-xs shadow-md transition-all duration-200`;
        if (message.role === 'user') {
            return `${baseClasses} bg-white/20 text-white hover:bg-white/30`;
        } else {
            return theme === 'dark'
                ? `${baseClasses} bg-gray-700 hover:bg-gray-600 text-white`
                : `${baseClasses} bg-white hover:bg-gray-100 text-gray-700`;
        }
    };

    return (
        <div className={`mb-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`${getMessageClasses()} animate-fade-in`}>
                {/* Copy button */}
                <button
                    onClick={handleCopy}
                    className={getCopyButtonClasses()}
                    title="Copy to clipboard"
                >
                    {isCopied ? (
                        <span>✅</span> // Checkmark for copied
                    ) : (
                        <span>📄</span> // Clipboard icon
                    )}
                </button>
                <MessageContent message={message} />
            </div>
        </div>
    );
}
