'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon, SparklesIcon, ArrowPathIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import Navbar from './components/Navbar';
import { generateChatPDF } from './lib/pdfUtils';
import { auth } from './lib/firebase';

// Helper functions for localStorage keys
const getChatHistoryKey = (uid) => `gemini_chat_history_${uid}`;

export default function Home() {
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const currentTheme = mounted ? (theme === 'system' ? systemTheme : theme) : 'light';

  // Check user authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setIsPageLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load active chat history from localStorage
  useEffect(() => {
    if (user) {
      try {
        const storedHistory = localStorage.getItem(getChatHistoryKey(user.uid));
        setChatHistory(storedHistory ? JSON.parse(storedHistory) : []);
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsPageLoading(false);
      }
    }
  }, [user]);

  const saveChatHistory = (history, uid) => {
    try {
      localStorage.setItem(getChatHistoryKey(uid), JSON.stringify(history));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // Handle sending messages with streaming
  const handleSendMessage = async (input) => {
    if (!user) return; // Ensure user is logged in

    setIsLoading(true);
    const newUserMessage = { role: 'user', parts: [{ text: input }] };
    const currentChatHistory = [...chatHistory, newUserMessage];

    // Add user message immediately
    setChatHistory(currentChatHistory);
    saveChatHistory(currentChatHistory, user.uid); // Save user message

    // Prepare a placeholder for the model's response
    const modelMessagePlaceholder = { role: 'model', parts: [{ text: '' }] };
    setChatHistory((prev) => [...prev, modelMessagePlaceholder]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input,
          // Send only the history *before* the current user message and placeholder
          chatHistory: chatHistory.filter(msg => msg !== newUserMessage && msg !== modelMessagePlaceholder)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulatedResponse += decoder.decode(value, { stream: true });

        // Update the last message (model's response) in the chat history
        setChatHistory((prev) => {
          const updatedHistory = [...prev];
          const lastMessageIndex = updatedHistory.length - 1;
          if (lastMessageIndex >= 0 && updatedHistory[lastMessageIndex].role === 'model') {
            updatedHistory[lastMessageIndex] = {
              ...updatedHistory[lastMessageIndex],
              parts: [{ text: accumulatedResponse }],
            };
          }
          return updatedHistory;
        });
      }

      // Final save after stream is complete
      setChatHistory((prev) => {
        saveChatHistory(prev, user.uid);
        return prev;
      });


    } catch (error) {
      console.error('Error calling streaming API:', error);
      // Update the placeholder with an error message
      setChatHistory((prev) => {
        const updatedHistory = [...prev];
        const lastMessageIndex = updatedHistory.length - 1;
        if (lastMessageIndex >= 0 && updatedHistory[lastMessageIndex].role === 'model') {
          updatedHistory[lastMessageIndex] = {
            role: 'model',
            parts: [{ text: `Error: ${error.message || 'An error occurred.'}` }],
          };
        } else {
          // If placeholder wasn't added or history changed unexpectedly, add error as new message
          updatedHistory.push({ role: 'model', parts: [{ text: `Error: ${error.message || 'An error occurred.'}` }] });
        }
        saveChatHistory(updatedHistory, user.uid); // Save history with error
        return updatedHistory;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    localStorage.removeItem(getChatHistoryKey(user.uid));
  };

  const handleSavePDF = () => generateChatPDF(chatHistory, user.uid);

  if (isPageLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${currentTheme === 'dark'
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white'
        : 'bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50 text-gray-900'
        } transition-colors duration-300 font-poppins`}
    >
      <Navbar user={user} />
      <div className="container mx-auto p-4 md:p-6 max-w-5xl relative">
        {/* Header */}
        <header className="py-6 text-center">
          <div className="inline-block relative">
            <h1 className="text-5xl md:text-6xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 pb-2">
              ChatSphere
            </h1>
            <div className="absolute -right-8 -top-3">
              <SparklesIcon className="h-8 w-8 text-yellow-400 animate-pulse" />
            </div>
          </div>
          <p className="mt-2 text-base md:text-lg font-medium text-gray-500 dark:text-gray-300">
            Powered by Firebase, Next.js, and Google Gemini
          </p>
        </header>

        {/* Main Content Area */}
        <div className="w-full mt-4">
          <div
            className={`rounded-2xl p-6 shadow-xl border min-h-[65vh] mb-6 backdrop-blur-sm ${currentTheme === 'dark'
              ? 'bg-gray-800/70 border-gray-700 shadow-indigo-900/20'
              : 'bg-white/90 border-gray-200 shadow-blue-200/60'
              } transition-all duration-300 ease-in-out`}
          >
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
                <div className="relative">
                  <h2 className="text-4xl md:text-5xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
                    Welcome to ChatSphere!
                  </h2>
                  <div className="absolute -top-6 -left-6">
                    <SparklesIcon className="h-6 w-6 text-blue-400 animate-bounce" />
                  </div>
                </div>
                <p className="text-lg md:text-xl font-light text-gray-600 dark:text-gray-300 max-w-lg">
                  Dive into a world of conversation—ask anything, explore everything!
                </p>
                <div className="mt-8 transform hover:scale-105 transition-all duration-300">
                  <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-8 rounded-full shadow-lg font-medium">
                    Start Chatting Below
                  </span>
                </div>
              </div>
            ) : (
              <ChatHistory chatHistory={chatHistory} isLoading={isLoading} />
            )}
          </div>
        </div>

        {/* Chat Input & Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pb-8">
          <div className="flex-grow w-full">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              className={`w-full p-4 rounded-full shadow-lg border ${currentTheme === 'dark'
                ? 'bg-gray-700/90 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white/90 border-gray-200 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300`}
              placeholder="Type your message here..."
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => {
                setChatHistory([]);
                localStorage.removeItem(getChatHistoryKey(user.uid));
              }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2"
            >
              <ArrowPathIcon className="h-5 w-5" />
              <span>New Chat</span>
            </button>
            <button
              onClick={handleSavePDF}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              <span>Save PDF</span>
            </button>
            <button
              onClick={handleClearChat}
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              Clear Chat
            </button>
            <button
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
              aria-label="Toggle theme"
            >
              {currentTheme === 'dark' ? (
                <SunIcon className="h-6 w-6 text-yellow-400" />
              ) : (
                <MoonIcon className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}