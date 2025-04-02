'use client';

import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Using outline icons
import { memo } from 'react';

const ChatSidebar = ({ sessions, activeChatId, onSelectChat, onNewChat, onDeleteChat, isOpen, setIsOpen }) => {
    const handleDelete = (e, chatId) => {
        e.stopPropagation(); // Prevent selecting the chat when clicking delete
        if (window.confirm('Are you sure you want to delete this chat?')) { // Simple confirmation
            onDeleteChat(chatId);
        }
    };

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            {/* Sidebar container */}
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white p-4 flex flex-col transition-transform duration-300 ease-in-out z-40 md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Header with Close Button (Mobile) */}
                <div className="flex justify-between items-center mb-4 md:hidden">
                    <h2 className="text-xl font-semibold">Chats</h2>
                    <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* New Chat Button */}
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Chat</span>
                </button>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                    <ul>
                        {sessions.map((session) => (
                            <li
                                key={session.id}
                                className={`group flex items-center justify-between mb-2 rounded-md transition-colors duration-200 ${activeChatId === session.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                            >
                                {/* Make the main part clickable for selection */}
                                <button
                                    onClick={() => onSelectChat(session.id)}
                                    className="flex-1 text-left px-3 py-2 truncate focus:outline-none"
                                    style={{ WebkitTapHighlightColor: 'transparent' }} // Improve mobile tap experience
                                >
                                    {session.title || 'Untitled Chat'}
                                </button>

                                {/* Keep delete button as a separate sibling button */}
                                <button
                                    onClick={(e) => handleDelete(e, session.id)}
                                    // Show delete button on hover/focus within the list item (group-hover)
                                    className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 mr-1 focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                                    aria-label="Delete chat"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    {sessions.length === 0 && (
                        <p className="text-gray-500 text-sm text-center mt-4">No previous chats.</p>
                    )}
                </div>

                {/* Optional Footer */}
                {/* <div className="mt-auto"> */}
                {/*   <p className="text-xs text-gray-500">ChatSphere v1.0</p> */}
                {/* </div> */}
            </div>
        </>
    );
};

// Memoize the component to prevent unnecessary re-renders when props haven't changed
export default memo(ChatSidebar); 