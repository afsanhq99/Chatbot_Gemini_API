'use client';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/'); // Redirect to home page after login
        } catch (error) {
            setError(error.message);
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            router.push('/'); // Redirect to home page after login
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <>
            <Navbar user={null} />
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md w-96">
                    <h1 className="text-2xl font-bold mb-6 text-black">Login</h1>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-black">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-2 border rounded text-black"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2 text-black">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2 border rounded text-black"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                        >
                            Login
                        </button>
                    </form>
                    <div className="mt-4">
                        <button
                            onClick={handleGoogleSignIn}
                            className="w-full flex items-center justify-center bg-red-500 text-white py-2 rounded hover:bg-red-600"
                        >
                            <Image
                                src="/gmail.png"
                                alt="Google Logo"
                                className="w-5 h-5 mr-2"
                                width={500}
                                height={500}
                            />
                            Sign in with Google
                        </button>
                    </div>
                    <p className="mt-4 text-center text-black">
                        Don't have an account?{' '}
                        <a href="/signup" className="text-blue-500 hover:underline">
                            Sign Up
                        </a>
                    </p>
                </div>
            </div>
        </>
    );
}