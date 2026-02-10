import React, { useState, useRef, useEffect } from 'react';
import { Student, ChatMessage } from '@/types';
import { Send, UserCircle, Home } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

interface ChatWindowProps {
    student: Student | null;
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
}

export default function ChatWindow({ student, messages, onSendMessage }: ChatWindowProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!student) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center w-full md:w-2/3 bg-[#f0f2f5] h-full text-center p-4">
                <div className="bg-white p-8 rounded-full mb-4 shadow-sm">
                    <UserCircle className="w-16 h-16 text-gray-300" />
                </div>
                <h2 className="text-2xl font-light text-gray-700 mb-2">WhatsApp Web</h2>
                <p className="text-gray-500 text-sm mb-6">
                    Send and receive messages without keeping your phone online.
                </p>
                <Link
                    href="/"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors"
                >
                    <Home className="w-4 h-4" />
                    <span>Back to Home</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full md:w-2/3 h-full bg-[#efeae2]">
            {/* Header */}
            <div className="px-4 py-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center">
                    <UserCircle className="w-10 h-10 text-gray-400 mr-3" />
                    <div className="flex flex-col">
                        <h2 className="font-semibold text-gray-900">{student.name}</h2>
                        <p className="text-xs text-gray-500">{student.phone_number}</p>
                    </div>
                </div>
                <Link href="/" title="Back to Home" className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                    <Home className="w-5 h-5" />
                </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={clsx(
                            "max-w-[70%] rounded-lg p-3 shadow-sm text-sm relative flex flex-col min-w-[120px]",
                            msg.sender === 'user'
                                ? "bg-[#d9fdd3] ml-auto rounded-tr-none"
                                : "bg-white mr-auto rounded-tl-none"
                        )}
                    >
                        <p className="text-gray-900 break-words pr-4 mb-2">{msg.message}</p>
                        <span className={clsx(
                            "text-[10px] self-end mt-1 font-medium",
                            msg.sender === 'user' ? "text-gray-500" : "text-gray-400"
                        )}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#f0f2f5] flex items-center space-x-2 sticky bottom-0 z-10">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message"
                    className="flex-1 px-4 py-2 rounded-lg border-none focus:ring-0 focus:outline-none text-gray-800 bg-white placeholder-gray-500"
                />
                <button
                    onClick={handleSend}
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                    <Send className="w-6 h-6 text-[#54656f]" />
                </button>
            </div>
        </div>
    );
}
