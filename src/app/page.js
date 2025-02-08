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
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

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
        if (storedHistory) {
          setChatHistory(JSON.parse(storedHistory));
        } else {
          setChatHistory([]);
        }
      } catch (error) {
        console.error('Error loading chat history from local storage:', error);
      } finally {
        setIsPageLoading(false);
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

  if (isPageLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen"> {/*  White background for Gemini-like feel */}
      <Navbar user={user} />
      {/* Increased max-w-5xl for wider container */}
      <div className="container mx-auto p-6 max-w-5xl">

        {/* Replace Welcome Message with a simple header */}
        <header className="py-4 text-center">
          <h1 className="text-2xl font-semibold text-gray-800">Chat app</h1>
          <p className="text-gray-500">Powered by Firebase, Next.js and Google Gemini</p>
        </header>

        {/* Move Buttons to the bottom next to chat input */}


        {/* Chat History */}
        {/* Use a neutral background, remove shadow */}
        <div className="rounded-lg p-4 mb-2 border border-gray-200 min-h-96"> {/* Neutral background, subtle border */}
          <ChatHistory chatHistory={chatHistory} isLoading={isLoading} />
        </div>

        {/* Chat Input & Buttons */}
        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">

          {/* Chat Input */}
          <div className="flex-grow">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </div>
          <div className="flex items-center justify-center">
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
        </div>
      </div>
    </div>
  );
}