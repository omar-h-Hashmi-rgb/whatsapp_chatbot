import { calendar } from './google';
import { addHours, parseISO } from 'date-fns';

// Helper to handle the "Master" calendar ID (Instructor's view)
// In a real app, this might be a single calendar. Here we might be managing multiple student calendars.
// For the assignment, we assume the "Instructor" has a view of all these or we check the specific student's calendar.
// *Actually*, the prompt implies we check "Availability".
// We will assume `CALENDAR_ID_INSTRUCTOR` is the master calendar where ALL lessons are also invited/copied,
// OR we interpret "Availability" as "Is THIS specific slot taken by anyone?".
// Given the "Smart Swap" requirement (swapping two students), it implies we know who is in the slot.

export const getInstructorCalendarId = () => {
    return process.env.CALENDAR_ID_INSTRUCTOR || 'primary';
};

export async function listEvents(calendarId: string, timeMin: string, timeMax: string) {
    try {
        const res = await calendar.events.list({
            calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data.items || [];
    } catch (error) {
        console.error(`Error listing events for calendar ${calendarId}:`, error);
        return [];
    }
}

export async function checkAvailability(calendarId: string, startDateTime: string, endDateTime: string) {
    const events = await listEvents(calendarId, startDateTime, endDateTime);
    // If there are any events in this range, it's not available
    return events.length === 0;
}

export async function createEvent(calendarId: string, summary: string, start: string, end: string) {
    try {
        const res = await calendar.events.insert({
            calendarId,
            requestBody: {
                summary,
                start: { dateTime: start },
                end: { dateTime: end },
            },
        });
        return res.data;
    } catch (error) {
        console.error(`Error creating event on ${calendarId}:`, error);
        throw error;
    }
}

export async function moveEvent(calendarId: string, eventId: string, newStart: string, newEnd: string) {
    try {
        // First get the event to keep other properties
        const event = await calendar.events.get({ calendarId, eventId });

        if (!event.data) throw new Error('Event not found');

        const res = await calendar.events.update({
            calendarId,
            eventId,
            requestBody: {
                ...event.data,
                start: { dateTime: newStart },
                end: { dateTime: newEnd },
            },
        });
        return res.data;
    } catch (error) {
        console.error(`Error moving event ${eventId} on ${calendarId}:`, error);
        throw error;
    }
}

export async function getEventOwner(calendarId: string, start: string, end: string) {
    // Find the event at this time
    const events = await listEvents(calendarId, start, end);
    if (events.length === 0) return null;

    // Assuming the first conflicting event is the one (simplification)
    return events[0];
}
