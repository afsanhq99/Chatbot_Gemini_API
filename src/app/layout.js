// app/layout.js
import './globals.css';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Chat App',
  description: 'Generated by create next app',
};

export default async function RootLayout({ children }) {



  return (
    <html lang="en">
      <body>

        {children}

      </body>
    </html>
  );
}