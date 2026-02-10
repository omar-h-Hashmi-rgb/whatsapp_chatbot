'use client';

import { useState, useEffect } from 'react';
import StudentList from '@/components/StudentList';
import ChatWindow from '@/components/ChatWindow';
import { Student, ChatMessage } from '@/types';
import { supabase } from '@/lib/supabase';

// Mock data for initial UI testing (will be replaced by DB fetch)
// We will actually fetch this from Supabase in the `useEffect` once seeded.
const INITIAL_STUDENTS: Student[] = [];

export default function ChatPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Fetch students on mount
    useEffect(() => {
        const fetchStudents = async () => {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching students:', error);
            } else if (data) {
                setStudents(data);
            }
        };

        fetchStudents();
    }, []);

    // Fetch messages when student changes
    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedStudent) {
                setMessages([]);
                return;
            }

            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('student_id', selectedStudent.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
            } else if (data) {
                setMessages(data);
            }
        };

        fetchMessages();
    }, [selectedStudent]);


    const handleSendMessage = async (text: string) => {
        if (!selectedStudent) return;

        // Optimistic UI update
        const newMessage: ChatMessage = {
            id: crypto.randomUUID(),
            student_id: selectedStudent.id,
            message: text,
            sender: 'user',
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newMessage]);

        // Call API
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    studentId: selectedStudent.id,
                    history: messages // Send history for context
                }),
            });

            const data = await res.json();

            // Add bot response
            const botMessage: ChatMessage = {
                id: crypto.randomUUID(),
                student_id: selectedStudent.id,
                message: data.response,
                sender: 'bot',
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, botMessage]);

        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    return (
        <main className="flex h-screen overflow-hidden bg-gray-100">
            <div className="container mx-auto max-w-[1600px] h-full flex shadow-lg overflow-hidden">
                <StudentList
                    students={students}
                    selectedStudent={selectedStudent}
                    onSelectStudent={setSelectedStudent}
                />
                <ChatWindow
                    student={selectedStudent}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                />
            </div>
        </main>
    );
}
