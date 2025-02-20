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
        const baseClasses = 'inline-block px-4 py-3 rounded-lg relative';
        if (message.role === 'user') {
            return `${baseClasses} bg-blue-500 text-white`;
        } else {
            return theme === 'dark'
                ? `${baseClasses} bg-gray-700 text-gray-300`
                : `${baseClasses} bg-gray-200 text-gray-800`;
        }
    };

    const getCopyButtonClasses = () => {
        const baseClasses = `absolute -top-2 -right-2 p-1 rounded-full text-sm`;
        if (message.role === 'user') {
            return `${baseClasses} bg-blue-600 hover:bg-blue-700`;
        } else {
            return theme === 'dark'
                ? `${baseClasses} bg-gray-600 hover:bg-gray-500 text-white`
                : `${baseClasses} bg-gray-300 hover:bg-gray-400`;
        }
    };

    return (
        <div className={`mb-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={getMessageClasses()}>
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