# Testing Guide: WhatsApp Scheduling Bot

This guide will help you verify the AI logic and the "Smart Swap" algorithm.

## Prerequisites
- Ensure the app is running: `npm run dev`
- Open [http://localhost:3000](http://localhost:3000)

## Scenario 1: Basic Booking (The "Happy Path")
1.  Click on **Alice** in the sidebar.
2.  Type: *"Book a lesson for tomorrow at 10 AM."*
3.  **Expected Result**:
    - The bot should reply confirming the booking.
    - Check the Google Calendar (if you have access) or trust the bot's confirmation.
    - The slot (Tomorrow 10:00 - 11:00) is now **TAKEN** by Alice.

## Scenario 2: The "Smart Swap" (Conflict Resolution)
Now, let's force a conflict to see the AI agent negotiate.

1.  Click on **Bob** in the sidebar (switch users).
2.  Type: *"I really need a lesson tomorrow at 10 AM."* (The same time you gave Alice).
3.  **Expected Result**:
    - The bot detects the conflict (Alice has the slot).
    - The **Smart Swap** algorithm runs.
    - The bot should reply: *"Slot was taken by Alice, but I have swapped you both... You are now booked for 10 AM."* check checks
    - **Behind the scenes**: Alice was moved to her old slot (or a free one), and Bob got the priority slot.

## Scenario 3: Natural Language Context
1.  Stay as **Bob**.
2.  Type: *"Actually, move it 2 hours later."*
3.  **Expected Result**:
    - The bot understands "it" refers to the lesson we just talked about.
    - It calculates the new time (12 PM) and moves the appointment.

## Troubleshooting
- **Bot doesn't reply?** Check your terminal running `npm run dev` for API errors.
- **"Error: Student not found"?** Ensure the database seeding ran correctly.
