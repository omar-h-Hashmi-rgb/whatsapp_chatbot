import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getAuthClient = () => {
    // Check if we have the JSON string or individual keys
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
        try {
            const credentials = JSON.parse(serviceAccountJson);
            return new google.auth.JWT(
                credentials.client_email,
                undefined,
                credentials.private_key,
                SCOPES
            );
        } catch (error) {
            console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:', error);
        }
    }

    // Fallback to individual keys
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    // Handle newline characters in private key being escaped as \\n
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        throw new Error('Missing Google Service Account credentials');
    }

    return new google.auth.JWT(
        clientEmail,
        undefined,
        privateKey,
        SCOPES
    );
};

export const calendar = google.calendar({
    version: 'v3',
    auth: getAuthClient(),
});
