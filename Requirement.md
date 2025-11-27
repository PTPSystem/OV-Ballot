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

## Official NCFCA 2025-2026 Ballot Templates

The system must support the following 10 official NCFCA speech event types, each with their specific rubric structure:

### Speech Event Types

1. **Persuasive** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Persuasive-.pdf)
2. **Oratorical** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Oratorical.pdf)
3. **Open Interpretation** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Open-.pdf)
4. **Informative** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Informative-.pdf)
5. **Impromptu** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Impromptu-.pdf)
6. **Extemporaneous** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Extemporaneous.pdf)
7. **Duo Interpretation** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Duo-.pdf)
8. **Digital Presentation** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Digital-Presentation.pdf)
9. **Biblical Thematic** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Biblical-.pdf)
10. **Apologetics** - [Sample Ballot](https://ncfca.org/wp-content/uploads/25-26-Ballot-Sample-_-Apologetics-.pdf)

All ballot samples are stored in `/ballot-samples/` directory for reference during development.

### Common Rubric Structure (All Events)

Each ballot consists of **5 scoring categories**, each rated on a scale of 1-5:

1. **Content** - Topic, ideas, thesis, support, analysis
2. **Organization & Citations** - Structure, transitions, verbal citations
3. **Vocal Delivery** - Articulation, volume, rate, pitch, tone
4. **Physical Delivery** - Poise, gestures, eye contact, movement
5. **Impact** - Connection, persuasiveness, relevance, speaker effectiveness

**Additional Fields:**
- Judge Name (free text)
- Event Selection (dropdown)
- Total Time (minutes:seconds)
- Speaker Rank (1-5, where 1 is best)
- Comments (text area for each category)
- Overall Comments (text area)

**Scoring Guidelines:**
- 1 = Beginning
- 2 = Developing
- 3 = Capable
- 4 = Proficient
- 5 = Excellent

Each category has specific descriptors per score level that vary slightly by event type.

---

This is now the absolute simplest possible version that still works perfectly for your club.

Copy-paste this entire document into your repo's `README.md` — you are 100% ready for development.