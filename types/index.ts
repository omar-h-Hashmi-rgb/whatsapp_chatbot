export interface Student {
    id: string; // UUID
    name: string;
    calendar_id: string;
    phone_number: string;
}

export type SenderType = 'user' | 'bot';

export interface ChatMessage {
    id: string;
    student_id: string;
    message: string;
    sender: SenderType;
    created_at: string;
}

export interface Appointment {
    id: string;
    summary: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
}
