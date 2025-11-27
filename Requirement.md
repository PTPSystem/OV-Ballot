# NCFCA Club Speech Ballot App – Absolute Final Specification  
(November 26, 2025 – Truly minimal version for your club)

### App States (only 3 possible global states)

| State                        | Judges See When Opening the App                                   | Competitors/Parents See                     |
|------------------------------|-------------------------------------------------------------------|---------------------------------------------|
| 1. No tournament active      | “No club meeting is currently active. Check back later.”         | No access, no emails sent                   |
| 2. Tournament active         | Immediate access: **Speaker dropdown only** → Judge               | No access yet                               |
| 3. Tournament closed         | “This meeting has ended and ballots have been released.”         | Magic link works → view + download PDFs     |

### Admin Functions (you only – one password in `.env`)

| ID | Function                                 | Description                                                                                   |
| -- | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| A1 | Start New Club Meeting                   | One click → creates fresh active tournament (auto-ends any previous one)                     |
| A2 | Add/Edit Competitors                     | Simple list: First Name, Last Name, Email (parent or competitor)                              |
| A3 | Close Tournament & Release Ballots       | Big red button + confirmation → instantly sends magic-link emails + closes the tournament   |
| A4 | Resend Magic Link                        | Edit a competitor’s email → click “Resend”                                                    |
| A5 | View All Ballots (optional)              | See every submitted ballot + optional bulk export as ZIP of PDFs                              |

**Removed:** No events, no rounds, no speaker-to-event assignment.  
Every speaker is simply “in today’s meeting.” Every judge picks any speaker from the full list.

### Judge Workflow (100% open – no password, no login ever)

| Step | Action                                                                 |
|------|------------------------------------------------------------------------|
| J1   | Open yourapp.com on tablet or laptop                                   |
| J2   | If tournament active → immediately sees **one dropdown: Speaker**     |
| J3   | Select speaker → ballot opens (event is not asked – judge just judges) |
| J4   | Type own name (free text – appears exactly as typed)                   |
| J5   | Choose the Event they are judging from a dropdown on the ballot        |
| J6   | Fill official 2025–2026 NCFCA 5-category rubric, time, comments       |
| J7   | Everything auto-saves instantly                                        |
| J8   | Click “Submit Ballot” → big green confirmation → done                 |
| J9   | Close browser mid-ballot → reopen same device within 48 h → resume     |
| J10  | If no tournament or closed → friendly message                         |

### Competitor / Parent Access (only after “Close Tournament & Release Ballots”)

| ID | Feature                 | Details                                                                                           |
| -- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| C1 | Automatic Email         | One email per competitor/parent with personal magic link                                          |
| C2 | Magic Link View         | Click link → see only their own ballots (all events, all judges)                                  |
| C3 | Ballot Display          | Shows: event, judge name (as typed), all 5 scores, comments, rank, time                           |
| C4 | Download PDF            | Button → pixel-perfect replica of official 2025–2026 NCFCA ballot                                  |
| C5 | Link Expiration         | Works for exactly 1 year after the meeting date                                                   |

### Non-Functional Requirements (final)

| ID | Requirement                                                                 |
| -- | --------------------------------------------------------------------------- |
| N1 | Tablet / computer-first design (optimized for 10–13" tablets & laptops). Fully usable on mobile but not mobile-first |
| N2 | Auto-save every keystroke while judging                                     |
| N3 | PDF output must be visually identical to official NCFCA 2025–2026 sample ballots |
| N4 | Only one tournament exists at any time                                      |
| N5 | Old tournaments auto-archived but still accessible via magic links         |
| N6 | No user accounts or passwords for judges or families                       |
| N7 | Admin panel protected only by one hard-coded password in `.env`            |

This is now the absolute simplest possible version that still works perfectly for your club.

Copy-paste this entire document into your repo’s `README.md` — you are 100% ready for development.