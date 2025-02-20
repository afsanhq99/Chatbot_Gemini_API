'use client';

import { useState, useEffect } from 'react';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import { sendMessage } from './lib/gemini';
import { generateChatPDF } from './lib/pdfUtils';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';

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

  const handleSendMessage = async (input) => {
    setIsLoading(true);
    const newUserMessage = { role: 'user', parts: [{ text: input }] };
    setChatHistory((prev) => {
      const updated = [...prev, newUserMessage];
      saveChatHistory(updated, user.uid);
      return updated;
    });

    try {
      const response = await sendMessage(input, chatHistory);
      const newModelMessage = { role: 'model', parts: [{ text: response }] };
      setChatHistory((prev) => {
        const updated = [...prev, newModelMessage];
        saveChatHistory(updated, user.uid);
        return updated;
      });
    } catch (error) {
      console.error('Error:', error);
      setChatHistory((prev) => {
        const updated = [...prev, { role: 'model', parts: [{ text: 'An error occurred.' }] }];
        saveChatHistory(updated, user.uid);
        return updated;
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${currentTheme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900'} transition-colors duration-300 font-poppins`}>
      <Navbar user={user} />
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <header className="py-6 text-center">
          <h1 className="text-5xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            ChatSphere
          </h1>
          <p className="mt-2 text-base font-medium text-gray-500 dark:text-gray-400">
            Powered by Firebase, Next.js, and Google Gemini
          </p>
        </header>

        {/* Chat Container */}
        <div className={`rounded-xl p-6 shadow-lg ${currentTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border min-h-[60vh] mb-6`}>
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <h2 className="text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse">
                Welcome to ChatSphere!
              </h2>
              <p className="text-lg font-light text-gray-600 dark:text-gray-300 max-w-md">
                Dive into a world of conversation—ask anything, explore everything!
              </p>
              <div className="mt-4">
                <span className="inline-block bg-gradient-to-r from-blue-400 to-purple-400 text-white py-2 px-4 rounded-full shadow-md">
                  Start Chatting
                </span>
              </div>
            </div>
          ) : (
            <ChatHistory chatHistory={chatHistory} isLoading={isLoading} />
          )}
        </div>

        {/* Chat Input & Buttons */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-grow w-full">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              className={`w-full p-4 rounded-full shadow-md border ${currentTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300`}
              placeholder="Type your message here..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSavePDF}
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              Save as PDF
            </button>
            <button
              onClick={handleClearChat}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Clear Chat
            </button>
            <button
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
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