// app/lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCxhwOohnqyo6-JKoakU-l5-EL4yjbqNbc"; // Make sure this is in .env.local

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const CHAT_HISTORY_KEY = 'gemini_chat_history';


export const loadChatHistory = () => {
    // We move the local storage logic to the client component
    return null;

};

export const saveChatHistory = (chatHistory) => {
    try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    } catch (error) {
        console.error("Error saving chat history to local storage:", error);
    }
};

export const clearChatHistory = () => {
    try {
        localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch (error) {
        console.error("Error clearing chat history from local storage:", error);
    }
}

export const sendMessage = async (input, chatHistory) => {
    try {
        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 800,
            },
        });
        const result = await chat.sendMessage(input);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error sending message:", error);
        return "An error occurred.";
    }
}