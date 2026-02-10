const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const getAuthClient = () => {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
        const credentials = JSON.parse(serviceAccountJson);
        return new google.auth.JWT(
            credentials.client_email,
            undefined,
            credentials.private_key,
            SCOPES
        );
    }
    throw new Error('Missing Google Service Account credentials');
};

const calendar = google.calendar({
    version: 'v3',
    auth: getAuthClient(),
});

async function listCharlieEvents() {
    const calendarId = '99e122bca65e195657a61cec6b807db8ac4ed684b844a53baa77735482976510@group.calendar.google.com';
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 2);

    try {
        const res = await calendar.events.list({
            calendarId,
            timeMin: now.toISOString(),
            timeMax: tomorrow.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        console.log(`Events for Charlie found: ${res.data.items?.length || 0}`);
        res.data.items?.forEach(event => {
            console.log(`- ${event.summary} (${event.start.dateTime || event.start.date})`);
        });
    } catch (error) {
        console.error('Error fetching calendar:', error.message);
    }
}

listCharlieEvents();
