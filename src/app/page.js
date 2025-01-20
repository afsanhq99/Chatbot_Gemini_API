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
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
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

  if (!user) {
    return <p>Loading...</p>; // Show loading state while checking auth
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar user={user} />
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <button
              onClick={handleSavePDF}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2 transition-colors duration-200"
            >
              Save PDF
            </button>
            <button
              onClick={handleClearChat}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              Clear Chat
            </button>
          </div>
        </div>
        <ChatHistory chatHistory={chatHistory} isLoading={isLoading} />
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}