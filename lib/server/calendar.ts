import { google } from "googleapis";
import type { Task } from "@/lib/types";

function client() {
  const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/calendar"] });
  return google.calendar({ version: "v3", auth });
}

export async function listCalendarItems(start: Date, end: Date) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error("GOOGLE_CALENDAR_ID is not configured");
  const res = await client().events.list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  });
  return (res.data.items || []).map((item) => ({
    id: item.id || "",
    title: item.summary || "Busy",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    allDay: Boolean(item.start?.date),
    location: item.location || undefined,
  }));
}

export async function upsertTaskCalendarEvent(task: Task) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Los_Angeles";
  if (!calendarId) throw new Error("GOOGLE_CALENDAR_ID is not configured");
  if (!task.scheduledStart || !task.scheduledEnd) throw new Error("Task needs scheduled start and end times");
  const body = {
    summary: `DO: ${task.title}`,
    description: `${task.notes || ""}\n\n[Command Center task ${task.id}]`,
    start: { dateTime: task.scheduledStart.toISOString(), timeZone },
    end: { dateTime: task.scheduledEnd.toISOString(), timeZone },
  };
  const cal = client();
  if (task.calendarEventId) {
    const res = await cal.events.update({ calendarId, eventId: task.calendarEventId, requestBody: body });
    return res.data.id || task.calendarEventId;
  }
  const res = await cal.events.insert({ calendarId, requestBody: body });
  if (!res.data.id) throw new Error("Google Calendar did not return an event id");
  return res.data.id;
}
