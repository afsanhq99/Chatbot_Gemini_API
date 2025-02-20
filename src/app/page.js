'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import Navbar from './components/Navbar';
import { sendMessage } from './lib/gemini';
import { generateChatPDF } from './lib/pdfUtils';
import { auth } from './lib/firebase';

// Helper functions for localStorage keys
const getChatHistoryKey = (uid) => `gemini_chat_history_${uid}`;
const getChatSessionsKey = (uid) => `gemini_chat_sessions_${uid}`;

// Updated ChatSessions component with collapse option
const ChatSessions = ({ sessions, onLoadSession, isCollapsed, toggleCollapse }) => { // Added isCollapsed and toggleCollapse props

  if (sessions.length === 0 && !isCollapsed) {  // only display if not collapsed
    return (
      <div className="mt-6 p-4 text-center text-gray-600 italic">
        <p>No previous chats available.</p>
      </div>
    );
  }

  return (
    <div className={`mt-6 rounded-lg shadow-md border border-gray-200 overflow-hidden ${isCollapsed ? 'w-0 opacity-0 transition-all duration-300 ease-in-out absolute right-0' : 'w-full transition-all duration-300 ease-in-out'}`}>
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Previous Chats</h2>
        <button
          onClick={toggleCollapse}
          className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
          aria-expanded={!isCollapsed}
          aria-controls="chat-sessions-list"
        >
          {isCollapsed ? (
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      <ul
        id="chat-sessions-list"
        className={`divide-y divide-gray-200 max-h-[60vh] overflow-y-auto ${isCollapsed ? 'hidden' : ''}`}
      >
        {sessions.map((session) => (
          <li key={session.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors duration-200">
            <div className="text-sm text-gray-700">
              {new Date(session.timestamp).toLocaleString()}
            </div>
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors duration-200"
              onClick={() => onLoadSession(session)}
            >
              View Chat
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function Home() {
  const [chatHistory, setChatHistory] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isChatSessionsCollapsed, setIsChatSessionsCollapsed] = useState(false); // State for collapse

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

  // Load archived chat sessions from localStorage
  useEffect(() => {
    if (user) {
      try {
        const storedSessions = localStorage.getItem(getChatSessionsKey(user.uid));
        setChatSessions(storedSessions ? JSON.parse(storedSessions) : []);
      } catch (error) {
        console.error('Error loading chat sessions:', error);
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

  const saveChatSessions = (sessions, uid) => {
    try {
      localStorage.setItem(getChatSessionsKey(uid), JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving chat sessions:', error);
    }
  };

  // Handle sending messages
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
        const updated = [
          ...prev,
          { role: 'model', parts: [{ text: 'An error occurred.' }] },
        ];
        saveChatHistory(updated, user.uid);
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Archive the current chat and start a new one
  const handleNewChat = () => {
    if (chatHistory.length > 0) {
      const newSession = {
        id: new Date().getTime(), // Simple unique ID
        messages: chatHistory,
        timestamp: new Date().toISOString(),
      };
      const updatedSessions = [...chatSessions, newSession];
      setChatSessions(updatedSessions);
      saveChatSessions(updatedSessions, user.uid);
    }
    setChatHistory([]);
    localStorage.removeItem(getChatHistoryKey(user.uid));
  };

  const handleClearChat = () => {
    setChatHistory([]);
    localStorage.removeItem(getChatHistoryKey(user.uid));
  };

  const handleSavePDF = () => generateChatPDF(chatHistory, user.uid);

  // Load a previous chat session into the active chat
  const handleLoadSession = (session) => {
    setChatHistory(session.messages);
  };

  const toggleChatSessionsCollapse = () => {
    setIsChatSessionsCollapsed(!isChatSessionsCollapsed);
  };

  if (isPageLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${currentTheme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white'
        : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900'
        } transition-colors duration-300 font-poppins`}
    >
      <Navbar user={user} />
      <div className="container mx-auto p-6 max-w-6xl relative"> {/* add relative to container*/}
        {/* Header */}
        <header className="py-6 text-center">
          <h1 className="text-5xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            ChatSphere
          </h1>
          <p className="mt-2 text-base font-medium text-gray-500 dark:text-gray-400">
            Powered by Firebase, Next.js, and Google Gemini
          </p>
        </header>

        {/* Main Content Area - Flex Container for ChatHistory and ChatSessions */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">

          {/* Chat History Section (Left Side) */}
          <div className={`md:w-full transition-all duration-300`}> {/* Adjusted width based on collapse */}
            <div
              className={`rounded-xl p-6 shadow-lg border min-h-[60vh] mb-6 ${currentTheme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
                }`}
            >
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
          </div>

          {/* Chat Sessions Section (Right Side) */}
          <div className={`md:w-1/3 ${isChatSessionsCollapsed ? 'hidden md:block w-0 absolute top-0 right-0' : ''}`} style={{ width: '200px' }}> {/* Hidden when collapsed */}
            <ChatSessions
              sessions={chatSessions}
              onLoadSession={handleLoadSession}
              isCollapsed={isChatSessionsCollapsed}
              toggleCollapse={toggleChatSessionsCollapse}
            />
          </div>
        </div>


        {/* Chat Input & Action Buttons - Below both sections */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4"> {/* Center aligned */}
          <div className="flex-grow w-full max-w-md"> {/* Adjusted width */}
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              className={`w-full p-4 rounded-full shadow-md border ${currentTheme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300`}
              placeholder="Type your message here..."
            />
          </div>
          <div className="flex gap-3 justify-center"> {/* Center aligned buttons */}
            <button
              onClick={handleNewChat}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-2 px-6 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              New Chat
            </button>
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
            {/* Collapse Toggle Button */}
            <button
              onClick={toggleChatSessionsCollapse}
              className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {isChatSessionsCollapsed ? (
                <ChevronDownIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <ChevronUpIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>


      </div>
    </div>
  );
}