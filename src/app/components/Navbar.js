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
        <nav className="bg-gradient-to-r from-blue-400 to-blue-700 shadow-lg">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                {/* App Logo */}
                <Link href="/" className="text-xl font-bold text-white hover:text-blue-100 transition-colors duration-200">
                    Chat App
                </Link>

                {/* User Info and Logout Button */}
                <div className="flex items-center space-x-6">
                    {user && (
                        <>
                            {/* Welcome Message */}
                            <span className="text-white text-sm font-large hidden sm:block transform transition-all duration-300 hover:scale-105">
                                Welcome, <span className="font-semibold text-blue-100 hover:text-blue-50 transition-colors duration-200">{user.email}</span>
                            </span>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
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