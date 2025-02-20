'use client';

import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Link from 'next/link';

export default function Navbar({ user }) {
    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <nav className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-xl sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                {/* App Logo */}
                <Link
                    href="/"
                    className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-white transition-all duration-300 flex items-center space-x-2"
                >
                    <span className="text-3xl">✨</span>
                    <span>ChatSphere</span>
                </Link>

                {/* User Info and Logout Button */}
                <div className="flex items-center space-x-6">
                    {user && (
                        <>
                            {/* Welcome Message */}
                            <span className="text-white text-base font-medium hidden sm:flex items-center space-x-2 transform transition-all duration-300 hover:scale-105">
                                <span className="bg-white bg-opacity-20 rounded-full px-3 py-1 text-sm">
                                    Hello,
                                    <span className="font-semibold text-yellow-200 ml-1 hover:text-yellow-100 transition-colors duration-200">
                                        {user.email.split('@')[0]}
                                    </span>
                                </span>
                            </span>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="bg-gradient-to-r from-white to-gray-100 text-indigo-600 hover:from-indigo-100 hover:to-white font-semibold py-2 px-5 rounded-full shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}