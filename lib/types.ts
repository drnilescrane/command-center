export type TaskStatus =
  | "inbox"
  | "planned"
  | "scheduled"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "deferred"
  | "done"
  | "dropped";

export type Priority = 1 | 2 | 3 | 4;

export type EventType =
  | "created"
  | "planned"
  | "scheduled"
  | "rescheduled"
  | "started"
  | "paused"
  | "resumed"
  | "stopped"
  | "completed"
  | "blocked"
  | "deferred"
  | "waiting"
  | "dropped"
  | "edited"
  | "note";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  project?: string;
  people?: string[];
  estimateMinutes?: number;
  actualMs?: number;
  dueAt?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  followUpAt?: Date | null;
  waitingOn?: string;
  rescheduleCount?: number;
  currentSessionId?: string | null;
  calendarEventId?: string | null;
  source?: "app" | "assistant" | "import";
  createdAt?: Date | null;
  updatedAt?: Date | null;
  completedAt?: Date | null;
  droppedAt?: Date | null;
  lastReason?: string;
}

export type SessionState = "running" | "paused" | "stopped" | "completed" | "blocked" | "deferred";

export interface WorkSession {
  id: string;
  taskId: string;
  state: SessionState;
  startedAt?: Date | null;
  activeStartedAt?: Date | null;
  pausedAt?: Date | null;
  endedAt?: Date | null;
  accumulatedMs: number;
  interruptionCount: number;
  stopReason?: string;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  type: EventType;
  at?: Date | null;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeState {
  activeTaskId?: string | null;
  activeSessionId?: string | null;
  updatedAt?: Date | null;
}

export interface CalendarItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}
