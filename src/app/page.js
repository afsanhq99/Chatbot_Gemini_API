'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  getDocs,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon, SparklesIcon, DocumentArrowDownIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import Navbar from './components/Navbar';
import ChatSidebar from './components/ChatSidebar';
import { generateChatPDF } from './lib/pdfUtils';
import { auth, db } from './lib/firebase';

export default function Home() {
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  const currentTheme = mounted ? (theme === 'system' ? systemTheme : theme) : 'light';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsPageLoading(false);
      } else {
        setUser(null);
        setChatSessions([]);
        setChatHistory([]);
        setActiveChatId(null);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      setIsPageLoading(true);
      const chatsRef = collection(db, 'users', user.uid, 'chats');
      const q = query(chatsRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const sessions = [];
        querySnapshot.forEach((doc) => {
          sessions.push({ id: doc.id, ...doc.data() });
        });
        setChatSessions(sessions);
        setIsPageLoading(false);
      }, (error) => {
        console.error("Error fetching chat sessions:", error);
        setIsPageLoading(false);
      });

      return () => unsubscribe();
    } else {
      setChatSessions([]);
      setIsPageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && activeChatId) {
      const messagesRef = collection(db, 'users', user.uid, 'chats', activeChatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        const formattedMessages = messages.map(msg => ({
          ...msg,
          parts: msg.parts && Array.isArray(msg.parts) ? msg.parts.map(part => ({ text: part.text || '' })) : [{ text: '' }],
          createdAt: msg.createdAt instanceof Timestamp ? msg.createdAt.toDate() : msg.createdAt
        }));
        setChatHistory(formattedMessages);
      }, (error) => {
        console.error(`Error fetching messages for chat ${activeChatId}:`, error);
      });

      return () => {
        unsubscribe();
      }
    } else {
      setChatHistory([]);
    }
  }, [user, activeChatId]);

  const saveMessageToFirestore = async (chatId, messageData) => {
    if (!user || !chatId) return;
    try {
      const messagesRef = collection(db, 'users', user.uid, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        ...messageData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving message to Firestore:", error);
    }
  };

  const handleSendMessage = async (input) => {
    if (!user || !input.trim()) return;

    setIsLoading(true);
    const newUserMessage = { role: 'user', parts: [{ text: input }] };

    let currentChatId = activeChatId;

    try {
      if (!currentChatId) {
        const chatsRef = collection(db, 'users', user.uid, 'chats');
        const newChatDocRef = await addDoc(chatsRef, {
          title: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
          createdAt: serverTimestamp()
        });
        currentChatId = newChatDocRef.id;
        setActiveChatId(currentChatId);
        await saveMessageToFirestore(currentChatId, newUserMessage);
      } else {
        await saveMessageToFirestore(currentChatId, newUserMessage);
      }

      let historyForApi = [];
      if (currentChatId) {
        const messagesRef = collection(db, 'users', user.uid, 'chats', currentChatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        historyForApi = snapshot.docs.map(doc => ({ role: doc.data().role, parts: doc.data().parts }));
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input,
          chatHistory: historyForApi
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';
      let lastStreamUpdate = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulatedResponse += decoder.decode(value, { stream: true });
        lastStreamUpdate = accumulatedResponse;

        setChatHistory((prev) => {
          const updatedHistory = [...prev];
          const streamingMsgIndex = updatedHistory.findIndex(msg => msg.id === 'streaming-placeholder');
          if (streamingMsgIndex > -1) {
            updatedHistory[streamingMsgIndex] = { ...updatedHistory[streamingMsgIndex], parts: [{ text: accumulatedResponse }] };
          } else {
            updatedHistory.push({ id: 'streaming-placeholder', role: 'model', parts: [{ text: accumulatedResponse }], createdAt: new Date() });
          }
          return updatedHistory;
        });
      }

      setChatHistory((prev) => prev.filter(msg => msg.id !== 'streaming-placeholder'));

      if (lastStreamUpdate) {
        const newModelMessage = { role: 'model', parts: [{ text: lastStreamUpdate }] };
        await saveMessageToFirestore(currentChatId, newModelMessage);
      }

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setChatHistory((prev) => prev.filter(msg => msg.id !== 'streaming-placeholder'));
      const errorMessage = { role: 'model', parts: [{ text: `Error: ${error.message || 'An error occurred.'}` }] };
      if (currentChatId) {
        await saveMessageToFirestore(currentChatId, errorMessage);
      } else {
        setChatHistory(prev => [...prev, { ...errorMessage, id: 'error-message', createdAt: new Date() }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = useCallback((chatId) => {
    if (chatId !== activeChatId) {
      setActiveChatId(chatId);
      setIsSidebarOpen(false);
    }
  }, [activeChatId]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setChatHistory([]);
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = async (chatIdToDelete) => {
    if (!user || !chatIdToDelete) return;
    try {
      const chatDocRef = doc(db, 'users', user.uid, 'chats', chatIdToDelete);
      const messagesRef = collection(db, 'users', user.uid, 'chats', chatIdToDelete, 'messages');

      const messagesSnapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      messagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      await deleteDoc(chatDocRef);

      if (activeChatId === chatIdToDelete) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleSavePDF = () => {
    if (chatHistory.length === 0) {
      alert("Chat history is empty.");
      return;
    }
    generateChatPDF(chatHistory);
  };

  if (isPageLoading && !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {user && (
        <ChatSidebar
          sessions={chatSessions}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {user && (
          <div className="md:hidden p-3 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-700 flex items-center justify-between">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
              <ChatBubbleLeftRightIcon className="h-6 w-6" />
            </button>
            <span className="text-white font-semibold">ChatSphere</span>
          </div>
        )}

        <Navbar user={user} />

        <div
          className={`relative flex-1 flex flex-col overflow-y-auto ${currentTheme === 'dark'
            ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white'
            : 'bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50 text-gray-900'
            } transition-colors duration-300 font-poppins`}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 left-10 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl animate-float"></div>
            <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl animate-float"></div>
            <div className="absolute bottom-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl animate-float"></div>
          </div>
          <div className="container mx-auto p-4 md:p-6 max-w-5xl flex-grow flex flex-col relative z-10">
            <header className="py-6 text-center">
              <div className="inline-block relative">
                <h1 className="text-5xl md:text-6xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 pb-2 animate-shimmer">
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

            <div className="flex-grow w-full mt-4 mb-6">
              <div
                className={`rounded-3xl p-6 shadow-2xl border min-h-[50vh] backdrop-blur-md flex flex-col ${currentTheme === 'dark'
                  ? 'bg-gray-900/70 border-gray-700/60 shadow-indigo-900/30'
                  : 'bg-white/80 border-gray-200 shadow-blue-200/60'
                  } transition-all duration-300 ease-in-out`}
              >
                {chatHistory.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-8 m-auto">
                    <div className="relative">
                      <h2 className="text-4xl md:text-5xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
                        {activeChatId ? "Chat is Empty" : "Welcome to ChatSphere!"}
                      </h2>
                      <div className="absolute -top-6 -left-6">
                        <SparklesIcon className="h-6 w-6 text-blue-400 animate-bounce" />
                      </div>
                    </div>
                    <p className="text-lg md:text-xl font-light text-gray-600 dark:text-gray-300 max-w-lg">
                      {activeChatId ? "Send a message to start the conversation." : "Dive into a world of conversation—ask anything, explore everything!"}
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

            <div className="sticky bottom-0 mt-auto py-4 bg-inherit">
              <div className="container mx-auto max-w-5xl px-4 md:px-0">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <div className="flex-grow w-full">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                      className={`${currentTheme === 'dark'
                        ? 'text-gray-100 placeholder:text-gray-400'
                        : 'text-gray-800 placeholder:text-gray-500'
                        }`}
                      placeholder="Type your message here..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={handleSavePDF}
                      disabled={chatHistory.length === 0}
                      className={`bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5 px-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center gap-2 ${chatHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                      <span>Save PDF</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
