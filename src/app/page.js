'use client';

import { useState, useEffect } from 'react';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import { sendMessage, clearChatHistory } from './lib/gemini';
import { generateChatPDF } from './lib/pdfUtils';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const getChatHistoryKey = (uid) => `gemini_chat_history_${uid}`;

export default function Home() {
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true); // New state for page loading
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setIsPageLoading(false); // Page is no longer loading
      } else {
        router.push('/login'); // Redirect to login if not authenticated
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load chat history from localStorage
  useEffect(() => {
    if (user) {
      try {
        const storedHistory = localStorage.getItem(getChatHistoryKey(user.uid));
        if (storedHistory) {
          setChatHistory(JSON.parse(storedHistory));
        } else {
          setChatHistory([]); // Initialize with empty array if no history exists
        }
      } catch (error) {
        console.error('Error loading chat history from local storage:', error);
      } finally {
        setIsPageLoading(false); // Page is no longer loading
      }
    }
  }, [user]);

  const saveChatHistory = (history, uid) => {
    try {
      localStorage.setItem(getChatHistoryKey(uid), JSON.stringify(history));
    } catch (error) {
      console.error('Error saving chat history to local storage:', error);
    }
  };

  const handleSendMessage = async (input) => {
    setIsLoading(true);

    const newUserMessage = {
      role: 'user',
      parts: [{ text: input }],
    };

    setChatHistory((prevHistory) => {
      const updatedHistory = [...prevHistory, newUserMessage];
      saveChatHistory(updatedHistory, user.uid);
      return updatedHistory;
    });

    try {
      const response = await sendMessage(input, chatHistory);
      const newModelMessage = {
        role: 'model',
        parts: [{ text: response }],
      };
      setChatHistory((prevHistory) => {
        const updatedHistory = [...prevHistory, newModelMessage];
        saveChatHistory(updatedHistory, user.uid);
        return updatedHistory;
      });
    } catch (error) {
      console.error('Error:', error);
      const errorModelMessage = {
        role: 'model',
        parts: [{ text: 'An error occurred.' }],
      };
      setChatHistory((prevHistory) => {
        const updatedHistory = [...prevHistory, errorModelMessage];
        saveChatHistory(updatedHistory, user.uid);
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

  const handleSavePDF = () => {
    generateChatPDF(chatHistory, user.uid);
  };

  // Show loader while the page is loading
  if (isPageLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-200 to-white min-h-screen animate-gradient">
      <Navbar user={user} />
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Welcome Message */}
        <div className="bg-white rounded-xl shadow-xl p-8 mb-8 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <h1 className="text-4xl font-extrabold text-blue-900 mb-4 font-sans">
            Welcome, <span className="text-blue-600">{user.displayName || 'User'}</span>!
          </h1>
          <p className="text-lg text-gray-700 font-medium font-serif">
            Start chatting with the AI assistant. Ask anything you'd like!
          </p>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={handleSavePDF}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
            >
              Save PDF
            </button>
            <button
              onClick={handleClearChat}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md ml-2 transition-all duration-200 transform hover:scale-105"
            >
              Clear Chat
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <ChatHistory chatHistory={chatHistory} isLoading={isLoading} />
        </div>

        {/* Chat Input */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}