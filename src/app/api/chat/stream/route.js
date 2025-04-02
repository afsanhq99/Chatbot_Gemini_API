import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

// Initialize Google Generative AI
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) {
    throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY environment variable");
}
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Or your preferred model

export async function POST(req) {
    try {
        const { input, chatHistory } = await req.json();

        if (!input) {
            return NextResponse.json({ error: 'Input is required' }, { status: 400 });
        }

        const chat = model.startChat({
            history: chatHistory || [], // Ensure history is an array
            generationConfig: {
                // Adjust generation config as needed
                // maxOutputTokens: 1200,
            },
        });

        const stream = await chat.sendMessageStream(input);

        // Create a ReadableStream to send back to the client
        const responseStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of stream.stream) {
                        if (chunk && chunk.candidates && chunk.candidates.length > 0) {
                            const content = chunk.candidates[0]?.content;
                            if (content && content.parts && content.parts.length > 0) {
                                const text = content.parts[0]?.text;
                                if (text) {
                                    controller.enqueue(encoder.encode(text));
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error reading stream:", error);
                    controller.error(error); // Propagate error to the client
                } finally {
                    controller.close();
                }
            },
            cancel(reason) {
                console.log('Stream canceled:', reason);
                // Handle cancellation if necessary
            }
        });

        return new Response(responseStream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error('Error in chat stream API:', error);
        // Check if the error is from the Generative AI SDK for more specific handling
        if (error.message && error.message.includes('API key not valid')) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
} 