import { NextRequest, NextResponse } from 'next/server';
import { groq } from '@/lib/groq';
import { supabase } from '@/lib/supabase';
import {
    listEvents,
    checkAvailability,
    createEvent,
    moveEvent,
    getEventOwner,
    getInstructorCalendarId
} from '@/lib/calendar-utils';
import { addHours, format, parseISO, setHours, setMinutes } from 'date-fns';

// Helper to get today's date context for the AI
const getContext = () => {
    const now = new Date();
    return `Current Date: ${now.toISOString()}. Day: ${format(now, 'EEEE')}.`;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, studentId, history } = body;

        // 1. Fetch Student Details
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (studentError || !student) {
            return NextResponse.json({ response: "Error: Student not found." });
        }

        // --- SNAPSHOT: Save User Message ---
        const { error: insertError } = await supabase.from('chats').insert({
            student_id: studentId,
            message: message,
            sender: 'user',
        });

        if (insertError) console.error('Error saving user message:', insertError);

        const studentCalendarId = student.calendar_id;

        // 2. Groq AI Understanding
        const systemPrompt = `
    You are a scheduling assistant.
    ${getContext()}
    Extract validity JSON:
    {
        "intent": "reschedule" | "query" | "cancel" | "other",
        "target_date": "YYYY-MM-DD" (calculate from relative terms like "tomorrow", "next monday"),
        "target_time": "HH:mm" (24-hour format),
        "response_text": "Natural language response confirming understanding (e.g. 'Checking if 3 PM works...')"
    }
    IMPORTANT: If the user wants to BOOK, SCHEDULE, MOVE, or CHANGE a lesson, set intent to "reschedule".
    If date is missing, assume today or tomorrow based on context. 
    If time is missing, ask for it in response_text and set intent to "other".
    `;

        // Convert frontend history to Groq format
        const conversationHistory = history?.map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.message
        })) || [];

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...conversationHistory,
                { role: 'user', content: message }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' }
        });

        const aiContent = chatCompletion.choices[0].message.content;
        const aiData = JSON.parse(aiContent || '{}');
        console.log('AI Extraction:', aiData);

        // Default response if not rescheduling
        // MISSION CRITICAL: If the AI sets intent to 'reschedule', we perform calendar logic.
        // We should ensure 'booking' is also considered a 'reschedule' intent.
        if (aiData.intent !== 'reschedule') {
            const botResponse = aiData.response_text || "I can help you reschedule. Just tell me when!";

            // --- SNAPSHOT: Save Bot Response ---
            const { error: botInsertError } = await supabase.from('chats').insert({
                student_id: studentId,
                message: botResponse,
                sender: 'bot',
            });
            if (botInsertError) console.error('Error saving bot message:', botInsertError);

            return NextResponse.json({ response: botResponse });
        }

        // 3. Rescheduling Logic
        if (!aiData.target_date || !aiData.target_time) {
            return NextResponse.json({ response: "Please specify both a date and a time." });
        }

        const targetStart = parseISO(`${aiData.target_date}T${aiData.target_time}:00`);
        const targetEnd = addHours(targetStart, 1); // Assume 1 hour lessons

        const startIso = targetStart.toISOString();
        const endIso = targetEnd.toISOString();

        // 3a. Find the user's CURRENT appointment (to swap from)
        // We search their calendar for any upcoming event
        const userEvents = await listEvents(studentCalendarId, new Date().toISOString(), addHours(new Date(), 720).toISOString()); // Look ahead 30 days
        const currentUserEvent = userEvents.length > 0 ? userEvents[0] : null;

        // 3b. Check Availability (Conflict Detection)
        // We need to check if ANY student has this slot.
        const { data: allStudents } = await supabase.from('students').select('*');

        let conflictingStudent = null;
        let conflictingEvent = null;

        if (allStudents) {
            for (const s of allStudents) {
                if (s.id === studentId) continue; // Don't check self
                const events = await listEvents(s.calendar_id, startIso, endIso);
                if (events.length > 0) {
                    conflictingStudent = s;
                    conflictingEvent = events[0];
                    break;
                }
            }
        }

        let finalResponse = "";

        // 4. Execution
        if (!conflictingEvent) {
            // CASE: FREE SLOT
            if (currentUserEvent) {
                // Move existing
                await moveEvent(studentCalendarId, currentUserEvent.id!, startIso, endIso);
                finalResponse = `✅ Moved your lesson to ${aiData.target_time} on ${aiData.target_date}.`;
            } else {
                // Create new
                await createEvent(studentCalendarId, `Lesson with ${student.name}`, startIso, endIso);
                finalResponse = `✅ Booked a new lesson for ${aiData.target_time} on ${aiData.target_date}.`;
            }
        } else {
            // CASE: TAKEN (Conflict Resolution)

            // Strategy 1: SWAP (If user has an existing slot to trade)
            if (currentUserEvent) {

                // Move B to A's old slot
                if (currentUserEvent.start?.dateTime && currentUserEvent.end?.dateTime && conflictingStudent) {
                    console.log(`Swapping: Moving ${conflictingStudent.name} to ${currentUserEvent.start.dateTime}`);
                    await moveEvent(
                        conflictingStudent.calendar_id,
                        conflictingEvent.id!,
                        currentUserEvent.start.dateTime,
                        currentUserEvent.end.dateTime
                    );
                }

                // Move A to Target (B's old slot / Target time)
                await moveEvent(studentCalendarId, currentUserEvent.id!, startIso, endIso);

                finalResponse = `🔄 Slot was taken by ${conflictingStudent?.name}, but I swapped you both! \n\nYou are now booked for ${aiData.target_time}.\n${conflictingStudent?.name} has been moved to your old time.`;

            } else {
                // Strategy 2: BUMP (If user has NO existing slot)
                // Try to move Conflicting Student (B) to the NEXT hour
                const bumpStart = targetEnd; // 1 hour later
                const bumpEnd = addHours(bumpStart, 1);

                // Check if Bump Slot is free (Simplistic check: asking Supabase implies checking all students)
                let bumpSlotTaken = false;
                // Re-fetch all students to check global availability for the bump slot
                const { data: allStudentsBump } = await supabase.from('students').select('*');

                if (allStudentsBump) {
                    for (const s of allStudentsBump) {
                        const events = await listEvents(s.calendar_id, bumpStart.toISOString(), bumpEnd.toISOString());
                        if (events.length > 0) {
                            bumpSlotTaken = true;
                            break;
                        }
                    }
                }

                if (!bumpSlotTaken && conflictingStudent) {
                    // Move B to Bump Slot
                    console.log(`Bumping: Moving ${conflictingStudent.name} to ${format(bumpStart, 'HH:mm')}`);
                    await moveEvent(
                        conflictingStudent.calendar_id,
                        conflictingEvent.id!,
                        bumpStart.toISOString(),
                        bumpEnd.toISOString()
                    );

                    // Create A in Target Slot
                    await createEvent(studentCalendarId, `Lesson with ${student.name}`, startIso, endIso);

                    finalResponse = `⚠️ Slot was taken by ${conflictingStudent?.name}, so I moved them to ${format(bumpStart, 'HH:mm')}!\n\nYou are now booked for ${aiData.target_time}.`;
                } else {
                    finalResponse = `❌ That slot is taken by ${conflictingStudent?.name}, and I couldn't automatically move them to the next hour (it's also busy).`;
                }
            }
        }

        // --- SNAPSHOT: Save Bot Response ---
        const { error: finalInsertError } = await supabase.from('chats').insert({
            student_id: studentId,
            message: finalResponse,
            sender: 'bot',
        });
        if (finalInsertError) console.error('Error saving final bot message:', finalInsertError);

        return NextResponse.json({ response: finalResponse });

    } catch (error) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
