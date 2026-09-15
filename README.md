# Command Center

A private, single-user execution system for Dave. It tracks tasks, scheduling attempts, actual focused work time, pauses, interruptions, deferrals, blockers, waiting items and completion history. It is designed to be operated from an iPad and to expose a small private API that an assistant can use later.

## What v0.1 includes

- Google sign-in restricted to the dedicated owner account.
- Inbox capture with no categorization required at capture time.
- NOW view with a persistent task timer: Start, Pause, Resume, Stop, Complete, Blocked, Defer.
- Timer state written to Firestore, so timing survives page/app closure and device changes.
- Scheduled work, due dates, priorities, projects, estimates and waiting/follow-up metadata.
- Immutable task event history for reschedules, pauses, completion and reasons.
- 30-day behavioral baseline: completed tasks, focused hours, estimate ratio, reschedules and most common completion hour.
- PWA metadata and Home Screen support for iPad/iPhone.
- Optional server-side Google Calendar read/write integration using the App Hosting service identity.
- Private assistant API plus an OpenAPI document at `/api/openapi`.

## Firestore shape

All user data is namespaced beneath the authenticated UID:

- `users/{uid}/tasks/{taskId}`
- `users/{uid}/workSessions/{sessionId}`
- `users/{uid}/taskEvents/{eventId}`
- `users/{uid}/state/runtime`

The runtime document ensures only one task can be actively timed at a time.

## Firebase setup, no terminal required

1. Create a **private** GitHub repository and put this code on its `main` branch.
2. In Firebase Console, open **App Hosting**, create a backend, connect the GitHub repository and select `main` for automatic rollouts.
3. In **Authentication > Sign-in method**, enable Google.
4. In **Firestore Database**, create a production database.
5. In Firestore **Rules**, paste the contents of `firestore.rules` and publish them.
6. Deploy the App Hosting backend. App Hosting injects Firebase web configuration automatically, so no Firebase client secrets belong in GitHub.
7. Open the deployed URL and sign in with `davenewbergai@gmail.com`.
8. In Safari, use Share > Add to Home Screen.

## Google Calendar integration

The task system works without this. Calendar integration is deliberately optional so it cannot block the first launch.

The server uses Google Application Default Credentials from Firebase App Hosting. To enable the integration:

1. Enable the Google Calendar API in the same Google Cloud project.
2. Identify the service account used by the App Hosting backend in Google Cloud / App Hosting settings.
3. Share the dedicated AI Google Calendar (`davenewbergai@gmail.com`) with that service account and grant permission to make changes to events.
4. Redeploy if needed. The Today view will begin showing fixed events and scheduled tasks can sync to Calendar.

## Assistant API

The following endpoints are implemented:

- `GET /api/assistant/today`
- `GET /api/assistant/tasks`
- `POST /api/assistant/tasks`
- `POST /api/assistant/tasks/{id}/action`
- `GET /api/openapi`

They remain disabled until `COMMAND_CENTER_API_KEY` is set in App Hosting > Backend > Settings > Environment. Use a long random secret and do not commit it to GitHub.

## Cost controls

`apphosting.yaml` sets `minInstances: 0` and `maxInstances: 2`. For a single user, this should keep compute very small while preventing accidental runaway scaling.

## Next improvements already anticipated

- Richer automatic metrics by task type and meeting load.
- More explicit interruption reasons without using browser prompts.
- Automatic calendar event linkage and reschedule reconciliation.
- Natural-language triage from Inbox into project/priority/schedule.
- Assistant connector installation using the included OpenAPI surface.
