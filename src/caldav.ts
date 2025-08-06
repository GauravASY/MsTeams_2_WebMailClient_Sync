import { createDAVClient } from "tsdav";

export const calendarClient = await createDAVClient({
    serverUrl: 'https://mail.sandeshonline.in/SOGo/dav/gaurav.yadav@silvereye.co/Calendar/personal/', // Replace with your CalDAV server URL
    credentials: {
        username: 'gaurav.yadav@silvereye.co', // Replace with your username
        password: 'G@ur@v@Silvereye', // Replace with your app-specific password
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
}); 

export async function fetchCalendarEvents() {
    try {
        const calendar = await calendarClient.fetchCalendars();
        console.log("Fetched calendars:", calendar);
    } catch (error) {
        console.error("Error fetching calendars:", error);
    }
}