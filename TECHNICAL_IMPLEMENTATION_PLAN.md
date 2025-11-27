# Technical Implementation Plan for OV-Ballot
## NCFCA Club Speech Ballot Application

## Overview

OV-Ballot is an NCFCA (National Christian Forensics and Communications Association) club speech ballot application. This system allows judges to evaluate speakers across 10 different speech event types using official NCFCA 2025-2026 rubrics. The application features a simplified workflow with no login requirements for judges, automatic ballot distribution via magic links, and PDF generation matching official NCFCA ballot templates.

**Key Features:**

- **10 Speech Event Types**: Persuasive, Oratorical, Open Interpretation, Informative, Impromptu, Extemporaneous, Duo Interpretation, Digital Presentation, Biblical Thematic, and Apologetics
- **Zero-friction Judge Experience**: No login required, immediate access when tournament is active
- **5-Category Rubric Scoring**: Each ballot scores Content, Organization & Citations, Vocal Delivery, Physical Delivery, and Impact (1-5 scale)
- **Auto-save**: Real-time saving of judge input to prevent data loss
- **Magic Link Distribution**: Automatic email delivery of personalized ballot access links to competitors/parents
- **Official PDF Generation**: Pixel-perfect replicas of NCFCA 2025-2026 ballot templates
- **Simple Admin Panel**: Single-password protected interface for tournament management
- **Tournament State Management**: Only one active tournament at a time, with automatic archiving

## Development Architecture

### Frontend

- **Framework**: React with TypeScript
- **Build Tool**: Vite (faster development experience)
- **UI Library**: Tailwind CSS (responsive, tablet-optimized design)
- **PDF Generation**: react-pdf or jsPDF with custom templates for all 10 ballot types
- **Form Management**: React Hook Form with auto-save functionality
- **State Management**: React Context API (lightweight for this use case)
- **API Client**: Axios with TypeScript interfaces
- **Hosting (Dev)**: Local development server (Vite dev server)
- **Hosting (Prod)**: Azure Static Web Apps

### Backend/Database (Development)

- **Database**: PostgreSQL 14+
- **Server**: 192.168.1.46:5432
- **Admin User**: bw_pg_admin
- **Password**: %LtT#N492VFjXOso
- **ORM**: Prisma for type-safe database access
- **API**: Node.js/Express REST API
- **Email Service**: Nodemailer or SendGrid for magic link distribution
- **Magic Link Generation**: UUID-based tokens with 1-year expiration
- **Session Storage**: Browser localStorage for judge ballot drafts (device-specific, 48-hour persistence)

### Backend/Database (Production - Future)

- **Database**: Microsoft Dataverse (optional migration path)
- **API**: Dataverse Web API
- **Integration**: Power Platform

## NCFCA Event Types & Scoring

### 10 Official Event Types

Event types have two different rubric structures:

**Platform/Speaking Events** (6 events):
1. **Persuasive**
2. **Informative**
3. **Impromptu**
4. **Extemporaneous**
5. **Digital Presentation**
6. **Apologetics**

Categories: Content, Organization & Citations, Vocal Delivery, Physical Delivery, Impact

**Interpretation Events** (4 events):
7. **Oratorical**
8. **Open Interpretation**
9. **Duo Interpretation**
10. **Biblical Thematic**

Categories: Content, Organization & Citations, Characterization, Blocking, Impact

### Ballot Scoring Structure

Each ballot contains:

**5 Required Scores** (1-5 scale each):

**For Platform/Speaking Events:**
- Content
- Organization & Citations
- Vocal Delivery
- Physical Delivery
- Impact

**For Interpretation Events:**
- Content
- Organization & Citations
- Characterization
- Blocking
- Impact

**Additional Required Fields:**

- Judge Name (free text - as judge types it)
- Event Type (dropdown selection)
- Total Time (seconds, displayed as MM:SS)
- Speaker Rank (1-5, where 1 is best)

**Optional Fields:**

- Comments for each of the 5 categories
- Overall comments

**Scoring Guidelines:**

- 1 = Beginning
- 2 = Developing
- 3 = Capable
- 4 = Proficient
- 5 = Excellent

## Key Workflows

### Judge Workflow (No Authentication)

1. Open app → Check if tournament is active
2. If active: See competitor dropdown immediately
3. Select competitor → See event type dropdown
4. Select event → Ballot form opens
5. Enter judge name (appears exactly as typed on PDF)
6. Fill 5 categories (scores + comments)
7. Auto-save every keystroke (debounced 500ms)
8. Add time and rank
9. Submit → Green confirmation
10. If interrupted: Return on same device within 48 hours to resume

### Admin Workflow

1. Login with single password from `.env`
2. Start new tournament (auto-closes any previous active one)
3. Add competitors (First Name, Last Name, Email)
4. When meeting ends: Click "Close Tournament & Release Ballots"
5. System sends magic link emails to all competitors automatically
6. Optional: Resend magic link if email changes
7. Optional: View all ballots, bulk export as ZIP

### Competitor/Parent Workflow

1. Receive email with magic link after tournament closes
2. Click link → See all ballots for that competitor
3. Each ballot shows: event, judge name, all scores, comments, rank, time
4. Download individual ballots as PDFs (matching official NCFCA format)
5. Magic link valid for 1 year

## Development Data Model (PostgreSQL)

### Tables Schema

The database schema supports the NCFCA ballot system with tournaments, competitors (speakers), judges, ballots, and scoring across 10 event types.

#### tournaments

```sql
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    meeting_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    -- status values: active, closed
    -- Only one tournament can be 'active' at a time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    CONSTRAINT chk_one_active CHECK (
        status != 'active' OR 
        (SELECT COUNT(*) FROM tournaments WHERE status = 'active' AND id != tournaments.id) = 0
    )
);

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_date ON tournaments(meeting_date DESC);
```

#### competitors

```sql
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    -- Email for parent or competitor to receive magic link
    magic_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    magic_link_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competitors_tournament ON competitors(tournament_id);
CREATE INDEX idx_competitors_token ON competitors(magic_token);
CREATE INDEX idx_competitors_name ON competitors(last_name, first_name);
```

#### event_types

```sql
CREATE TABLE event_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    -- Event types: persuasive, oratorical, open_interpretation, informative,
    -- impromptu, extemporaneous, duo_interpretation, digital_presentation,
    -- biblical_thematic, apologetics
    rubric_config JSONB NOT NULL,
    -- JSON structure storing category-specific descriptors for 1-5 scale
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_types_name ON event_types(name);
```

#### ballots

```sql
CREATE TABLE ballots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    event_type_id INT NOT NULL REFERENCES event_types(id),
    judge_name VARCHAR(200) NOT NULL,
    -- Judge name as typed by judge (free text)
    
    -- 5 scoring categories (1-5 scale each)
    -- Categories vary by event type:
    -- Platform/Speaking: content, organization_citations, vocal_delivery, physical_delivery, impact
    -- Interpretation: content, organization_citations, characterization, blocking, impact
    score_content INT CHECK (score_content BETWEEN 1 AND 5),
    score_organization_citations INT CHECK (score_organization_citations BETWEEN 1 AND 5),
    score_category_3 INT CHECK (score_category_3 BETWEEN 1 AND 5),
    -- vocal_delivery OR characterization depending on event type
    score_category_4 INT CHECK (score_category_4 BETWEEN 1 AND 5),
    -- physical_delivery OR blocking depending on event type
    score_impact INT CHECK (score_impact BETWEEN 1 AND 5),
    
    -- Comments for each category
    comments_content TEXT,
    comments_organization_citations TEXT,
    comments_category_3 TEXT,
    -- vocal_delivery OR characterization comments
    comments_category_4 TEXT,
    -- physical_delivery OR blocking comments
    comments_impact TEXT,
    overall_comments TEXT,
    
    -- Additional fields
    total_time_seconds INT,
    -- Time in seconds (e.g., 420 for 7:00)
    speaker_rank INT CHECK (speaker_rank BETWEEN 1 AND 5),
    -- 1 is best, 5 is worst
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft',
    -- Status values: draft, submitted
    draft_saved_at TIMESTAMP,
    submitted_at TIMESTAMP,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    device_id VARCHAR(100),
    -- For draft recovery on same device
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ballots_tournament ON ballots(tournament_id);
CREATE INDEX idx_ballots_competitor ON ballots(competitor_id);
CREATE INDEX idx_ballots_event ON ballots(event_type_id);
CREATE INDEX idx_ballots_status ON ballots(status);
CREATE INDEX idx_ballots_device ON ballots(device_id, status) WHERE status = 'draft';
```

#### admin_users

```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    -- Bcrypt hashed password from .env
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

#### audit_logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    -- action values: tournament_created, tournament_closed, ballot_submitted,
    -- competitor_added, magic_link_sent, admin_login, etc.
    entity_type VARCHAR(50),
    entity_id UUID,
    admin_user_id UUID REFERENCES admin_users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_admin ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### Seed Data for Event Types

```sql
INSERT INTO event_types (name, display_name, rubric_config) VALUES
-- Platform/Speaking Events (Vocal Delivery + Physical Delivery)
('persuasive', 'Persuasive', '{"categories": ["content", "organization_citations", "vocal_delivery", "physical_delivery", "impact"], "type": "platform"}'),
('informative', 'Informative', '{"categories": ["content", "organization_citations", "vocal_delivery", "physical_delivery", "impact"], "type": "platform"}'),
('impromptu', 'Impromptu', '{"categories": ["content", "organization_citations", "vocal_delivery", "physical_delivery", "impact"], "type": "platform"}'),
('extemporaneous', 'Extemporaneous', '{"categories": ["content", "organization_citations", "vocal_delivery", "physical_delivery", "impact"], "type": "platform"}'),
('digital_presentation', 'Digital Presentation', '{"categories": ["content", "organization_citations", "vocal_delivery", "physical_delivery", "impact"], "type": "platform"}'),
('apologetics', 'Apologetics', '{"categories": ["content", "organization_citations", "vocal_delivery", "physical_delivery", "impact"], "type": "platform"}'),

-- Interpretation Events (Characterization + Blocking)
('oratorical', 'Oratorical', '{"categories": ["content", "organization_citations", "characterization", "blocking", "impact"], "type": "interpretation"}'),
('open_interpretation', 'Open Interpretation', '{"categories": ["content", "organization_citations", "characterization", "blocking", "impact"], "type": "interpretation"}'),
('duo_interpretation', 'Duo Interpretation', '{"categories": ["content", "organization_citations", "characterization", "blocking", "impact"], "type": "interpretation"}'),
('biblical_thematic', 'Biblical Thematic', '{"categories": ["content", "organization_citations", "characterization", "blocking", "impact"], "type": "interpretation"}');
```

## TypeScript Type Definitions

```typescript
// types/database.ts
export interface Tournament {
  id: string;
  name: string;
  meeting_date: Date;
  status: 'active' | 'closed';
  created_at: Date;
  closed_at?: Date;
}

export interface Competitor {
  id: string;
  tournament_id: string;
  first_name: string;
  last_name: string;
  email: string;
  magic_token: string;
  magic_link_sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface EventType {
  id: number;
  name: string;
  display_name: string;
  rubric_config: {
    categories: string[];
  };
  created_at: Date;
}

export interface Ballot {
  id: string;
  tournament_id: string;
  competitor_id: string;
  event_type_id: number;
  judge_name: string;
  
  // Scores (1-5)
  score_content: number;
  score_organization: number;
  score_vocal_delivery: number;
  score_physical_delivery: number;
  score_impact: number;
  
  // Comments
  comments_content?: string;
  comments_organization?: string;
  comments_vocal_delivery?: string;
  comments_physical_delivery?: string;
  comments_impact?: string;
  overall_comments?: string;
  
  // Additional fields
  total_time_seconds?: number;
  speaker_rank?: number;
  
  // Status
  status: 'draft' | 'submitted';
  draft_saved_at?: Date;
  submitted_at?: Date;
  
  // Metadata
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  
  created_at: Date;
  updated_at: Date;
}

export interface BallotScores {
  content: number;
  organization_citations: number;
  category_3: number;  // vocal_delivery OR characterization
  category_4: number;  // physical_delivery OR blocking
  impact: number;
}

export interface BallotComments {
  content?: string;
  organization_citations?: string;
  category_3?: string;  // vocal_delivery OR characterization comments
  category_4?: string;  // physical_delivery OR blocking comments
  impact?: string;
  overall?: string;
}

// Helper types for specific event categories
export interface PlatformBallotScores {
  content: number;
  organization_citations: number;
  vocal_delivery: number;
  physical_delivery: number;
  impact: number;
}

export interface InterpretationBallotScores {
  content: number;
  organization_citations: number;
  characterization: number;
  blocking: number;
  impact: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  admin_user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  created_at: Date;
}

// Frontend-specific types
export interface BallotFormData {
  competitor_id: string;
  event_type_id: number;
  judge_name: string;
  scores: BallotScores;
  comments: BallotComments;
  total_time_seconds?: number;
  speaker_rank?: number;
}

export interface CompetitorWithBallots extends Competitor {
  ballots: Ballot[];
  event_types: { [event_type_id: number]: string };
}
```

## Auto-Save Implementation

### Frontend

- Use React Hook Form with `watch()` to detect changes
- Debounce saves (500ms delay)
- Generate device_id (UUID) on first visit, store in localStorage
- Send `{device_id, competitor_id, event_type_id, all_form_data}` to backend

### Backend

- Upsert ballot with `status='draft'`
- Store `draft_saved_at` timestamp
- On form load: Query for draft by `(device_id + competitor_id + event_type_id)`
- Return draft if exists and `status='draft'`

### Draft Expiry

- Drafts stored indefinitely in database
- Frontend only offers recovery if < 48 hours old
- Once submitted (`status='submitted'`), draft recovery disabled

## Magic Link System

### Token Generation

- Each competitor gets unique UUID v4 token on creation
- Token stored in `competitors.magic_token` column
- Never expires (valid for 1 year from meeting date, enforced by app logic)

### Email Template

```text
Subject: Your NCFCA Speech Ballots - [Tournament Name]

Hi [First Name],

Your speech ballots from [Tournament Name] on [Meeting Date] are now available.

View and download your ballots here:
[Magic Link URL]

This link will remain active for one year.

Best regards,
NCFCA Club Speech Ballot System
```

### Magic Link URL Format

```text
https://yourapp.com/ballots/{magic_token}
```

### Security

- UUID v4 tokens are cryptographically secure (unguessable)
- No additional authentication required
- Token IS the credential
- Check meeting_date + 1 year for expiry

## Tournament State Management

**Constraint:** Only ONE tournament can have `status='active'` at any time.

**Implementation:**

- Database constraint or application logic check
- When admin creates new tournament:
  1. Check for existing active tournament
  2. If found: Auto-close it (set `status='closed'`, `closed_at=NOW()`)
  3. Create new tournament with `status='active'`
  4. Return success

**Close Tournament Process:**

1. Set `status='closed'`
2. Set `closed_at=NOW()`
3. Query all competitors for this tournament
4. For each competitor:
   - Generate magic link URL with their token
   - Send email using configured email service
   - Update `magic_link_sent_at` timestamp
5. Create audit log entry
6. Return success with count of emails sent

## PDF Generation Requirements

**Critical:** PDF output must be **pixel-perfect** replicas of official NCFCA 2025-2026 ballots.

### Reference Files

All official ballot samples are stored in `/ballot-samples/`:

- 25-26-Ballot-Sample-_-Persuasive-.pdf
- 25-26-Ballot-Sample-_-Oratorical.pdf
- 25-26-Ballot-Sample-_-Open-.pdf
- 25-26-Ballot-Sample-_-Informative-.pdf
- 25-26-Ballot-Sample-_-Impromptu-.pdf
- 25-26-Ballot-Sample-_-Extemporaneous.pdf
- 25-26-Ballot-Sample-_-Duo-.pdf
- 25-26-Ballot-Sample-_-Digital-Presentation.pdf
- 25-26-Ballot-Sample-_-Biblical-.pdf
- 25-26-Ballot-Sample-_-Apologetics-.pdf

### PDF Requirements

Each PDF must include:

- NCFCA header/branding
- Event name
- Competitor name
- Judge name (as typed)
- All 5 scores with descriptors
- All comments
- Time and rank
- Official rubric descriptions for each score level (1-5)

## API Endpoints

### Public Endpoints (No Auth)

- `GET /api/status` - Check tournament status
- `GET /api/competitors` - List competitors for active tournament
- `GET /api/event-types` - List all event types
- `POST /api/ballots/draft` - Save ballot draft (auto-save)
- `POST /api/ballots/submit` - Submit ballot
- `GET /api/ballots/draft` - Get draft by device_id + competitor_id + event_type_id
- `GET /api/magic/:token` - Access competitor ballots via magic link
- `GET /api/ballots/:id/pdf` - Download ballot PDF

### Admin Endpoints (Password Auth)

- `POST /admin/login` - Admin authentication
- `POST /admin/tournaments` - Create new tournament (auto-closes previous)
- `PUT /admin/tournaments/:id/close` - Close tournament & send magic links
- `GET /admin/tournaments` - List all tournaments
- `POST /admin/competitors` - Add competitor
- `PUT /admin/competitors/:id` - Update competitor
- `DELETE /admin/competitors/:id` - Delete competitor
- `POST /admin/competitors/:id/resend` - Resend magic link
- `GET /admin/ballots` - View all ballots
- `GET /admin/ballots/export` - Bulk export as ZIP
- `GET /admin/audit-logs` - View audit log

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL client tools (psql)
- Git
- Code editor (VS Code recommended)
- Email service account (Gmail, SendGrid, or similar for magic link delivery)
- PDF generation library understanding (for matching NCFCA ballot templates)
- Access to NCFCA ballot samples (stored in `/ballot-samples/` directory)

## Step-by-Step Development Setup

### 1. Database Setup

```bash
# Connect to PostgreSQL
psql -h 192.168.1.46 -p 5432 -U bw_pg_admin -d postgres

# Create database
CREATE DATABASE ov_ballot_dev;

# Connect to the new database
\c ov_ballot_dev

# Run the table creation scripts from the Data Model section above
# (Execute each CREATE TABLE and CREATE INDEX statement)

# Seed event types
# (Execute the INSERT INTO event_types statement)
```

### 2. Initialize React/TypeScript Frontend

```bash
# Create React app with Vite and TypeScript
npm create vite@latest ov-ballot-frontend -- --template react-ts

cd ov-ballot-frontend

# Install dependencies
npm install
npm install tailwindcss postcss autoprefixer
npm install axios
npm install react-router-dom
npm install react-hook-form
npm install @react-pdf/renderer
# Or alternatively: npm install jspdf html2canvas
npm install uuid
npm install date-fns

# Install dev dependencies
npm install --save-dev @types/uuid

# Initialize Tailwind CSS
npx tailwindcss init -p
```

### 3. Initialize Backend API (Node.js/Express)

```bash
# Create backend directory
mkdir ov-ballot-backend
cd ov-ballot-backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors dotenv
npm install pg
npm install prisma @prisma/client
npm install express-validator
npm install bcrypt
npm install nodemailer
# Or: npm install @sendgrid/mail
npm install uuid

# Install TypeScript and dev dependencies
npm install --save-dev typescript @types/node @types/express @types/cors
npm install --save-dev ts-node nodemon
npm install --save-dev @types/pg @types/uuid @types/bcrypt @types/nodemailer

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

### 4. Configure Prisma for PostgreSQL

Create `.env` file in backend:

```env
DATABASE_URL="postgresql://bw_pg_admin:%LtT%23N492VFjXOso@192.168.1.46:5432/ov_ballot_dev?schema=public"
ADMIN_PASSWORD="your-secure-admin-password-here"
PORT=3001

# Email Configuration (choose one)
# Option 1: Gmail
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Option 2: SendGrid
# SENDGRID_API_KEY=your-sendgrid-api-key

# Application URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# Magic Link Configuration
MAGIC_LINK_EXPIRY_DAYS=365
```

Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tournament {
  id          String      @id @default(uuid()) @db.Uuid
  name        String      @db.VarChar(200)
  meetingDate DateTime    @map("meeting_date") @db.Date
  status      String      @default("active") @db.VarChar(20)
  createdAt   DateTime    @default(now()) @map("created_at") @db.Timestamp
  closedAt    DateTime?   @map("closed_at") @db.Timestamp
  
  competitors Competitor[]
  ballots     Ballot[]

  @@map("tournaments")
}

model Competitor {
  id              String     @id @default(uuid()) @db.Uuid
  tournamentId    String     @map("tournament_id") @db.Uuid
  firstName       String     @map("first_name") @db.VarChar(100)
  lastName        String     @map("last_name") @db.VarChar(100)
  email           String     @db.VarChar(255)
  magicToken      String     @unique @default(uuid()) @map("magic_token") @db.Uuid
  magicLinkSentAt DateTime?  @map("magic_link_sent_at") @db.Timestamp
  createdAt       DateTime   @default(now()) @map("created_at") @db.Timestamp
  updatedAt       DateTime   @updatedAt @map("updated_at") @db.Timestamp
  
  tournament      Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  ballots         Ballot[]

  @@map("competitors")
}

model EventType {
  id           Int       @id @default(autoincrement())
  name         String    @unique @db.VarChar(50)
  displayName  String    @map("display_name") @db.VarChar(100)
  rubricConfig Json      @map("rubric_config") @db.JsonB
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamp
  
  ballots      Ballot[]

  @@map("event_types")
}

model Ballot {
  id                     String     @id @default(uuid()) @db.Uuid
  tournamentId           String     @map("tournament_id") @db.Uuid
  competitorId           String     @map("competitor_id") @db.Uuid
  eventTypeId            Int        @map("event_type_id")
  judgeName              String     @map("judge_name") @db.VarChar(200)
  
  scoreContent                Int?       @map("score_content")
  scoreOrganizationCitations  Int?       @map("score_organization_citations")
  scoreCategory3              Int?       @map("score_category_3")
  // vocal_delivery OR characterization
  scoreCategory4              Int?       @map("score_category_4")
  // physical_delivery OR blocking
  scoreImpact                 Int?       @map("score_impact")
  
  commentsContent                String?    @map("comments_content") @db.Text
  commentsOrganizationCitations  String?    @map("comments_organization_citations") @db.Text
  commentsCategory3              String?    @map("comments_category_3") @db.Text
  // vocal_delivery OR characterization comments
  commentsCategory4              String?    @map("comments_category_4") @db.Text
  // physical_delivery OR blocking comments
  commentsImpact                 String?    @map("comments_impact") @db.Text
  overallComments                String?    @map("overall_comments") @db.Text
  
  totalTimeSeconds       Int?       @map("total_time_seconds")
  speakerRank            Int?       @map("speaker_rank")
  
  status                 String     @default("draft") @db.VarChar(20)
  draftSavedAt           DateTime?  @map("draft_saved_at") @db.Timestamp
  submittedAt            DateTime?  @map("submitted_at") @db.Timestamp
  
  ipAddress              String?    @map("ip_address")
  userAgent              String?    @map("user_agent") @db.Text
  deviceId               String?    @map("device_id") @db.VarChar(100)
  
  createdAt              DateTime   @default(now()) @map("created_at") @db.Timestamp
  updatedAt              DateTime   @updatedAt @map("updated_at") @db.Timestamp
  
  tournament             Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  competitor             Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  eventType              EventType  @relation(fields: [eventTypeId], references: [id])

  @@map("ballots")
}

model AdminUser {
  id           String      @id @default(uuid()) @db.Uuid
  username     String      @unique @db.VarChar(50)
  passwordHash String      @map("password_hash") @db.VarChar(255)
  createdAt    DateTime    @default(now()) @map("created_at") @db.Timestamp
  lastLogin    DateTime?   @map("last_login") @db.Timestamp
  
  auditLogs    AuditLog[]

  @@map("admin_users")
}

model AuditLog {
  id          String     @id @default(uuid()) @db.Uuid
  action      String     @db.VarChar(50)
  entityType  String?    @map("entity_type") @db.VarChar(50)
  entityId    String?    @map("entity_id") @db.Uuid
  adminUserId String?    @map("admin_user_id") @db.Uuid
  ipAddress   String?    @map("ip_address")
  userAgent   String?    @map("user_agent") @db.Text
  details     Json?      @db.JsonB
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamp
  
  adminUser   AdminUser? @relation(fields: [adminUserId], references: [id])

  @@map("audit_logs")
}
```

### 5. Project Structure

```text
ov-ballot/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/
│   │   │   │   ├── TournamentManager.tsx
│   │   │   │   ├── CompetitorManager.tsx
│   │   │   │   └── BallotViewer.tsx
│   │   │   ├── Judge/
│   │   │   │   ├── SpeakerSelector.tsx
│   │   │   │   ├── BallotForm.tsx
│   │   │   │   └── EventTypeSelector.tsx
│   │   │   ├── Competitor/
│   │   │   │   ├── MagicLinkAccess.tsx
│   │   │   │   ├── BallotList.tsx
│   │   │   │   └── BallotPDF.tsx
│   │   │   └── Shared/
│   │   │       ├── ScoreInput.tsx
│   │   │       └── TimeInput.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── autoSave.ts
│   │   │   └── pdfGenerator.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── validation.ts
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── tournamentController.ts
│   │   │   ├── competitorController.ts
│   │   │   ├── ballotController.ts
│   │   │   └── adminController.ts
│   │   ├── routes/
│   │   │   ├── admin.ts
│   │   │   ├── judge.ts
│   │   │   └── competitor.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   └── errorHandler.ts
│   │   ├── services/
│   │   │   ├── emailService.ts
│   │   │   └── pdfService.ts
│   │   ├── utils/
│   │   │   ├── magicLink.ts
│   │   │   └── deviceId.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── ballot-samples/
│   ├── 25-26-Ballot-Sample-_-Persuasive-.pdf
│   ├── 25-26-Ballot-Sample-_-Oratorical.pdf
│   └── ... (8 more ballot PDFs)
├── Requirement.md
└── TECHNICAL_IMPLEMENTATION_PLAN.md
```

### 6. Run Database Migrations

```bash
# From backend directory
npx prisma generate
npx prisma db push

# Run seed script to populate event types
npx prisma db seed
```

### 7. Start Development Servers

```bash
# Terminal 1 - Backend
cd ov-ballot-backend
npm run dev

# Terminal 2 - Frontend
cd ov-ballot-frontend
npm run dev
```

## Security Considerations

- **Password Storage**: Never commit passwords to Git. Use `.env` files and add to `.gitignore`
- **Admin Authentication**: Bcrypt hash the admin password, session-based auth
- **SQL Injection**: Prisma ORM provides protection via parameterized queries
- **Magic Link Security**: UUID v4 tokens (unguessable), expiry validation
- **Rate Limiting**: Implement on ballot submission to prevent spam
- **Input Validation**: Validate all inputs (scores 1-5, required fields)
- **HTTPS**: Required for production deployment (protects magic links in transit)
- **XSS Protection**: Sanitize all user text inputs (judge names, comments)
- **CORS**: Restrict to known frontend domains

## Development Checklist

### Phase 1: Database & Backend Foundation

- [ ] PostgreSQL database `ov_ballot_dev` created
- [ ] All tables created with indexes (tournaments, competitors, event_types, ballots, admin_users, audit_logs)
- [ ] Event types seeded with 10 NCFCA speech categories
- [ ] Prisma schema configured and synced
- [ ] Admin user created with bcrypt-hashed password
- [ ] Basic Express server setup with CORS
- [ ] Environment variables configured (.env file)

### Phase 2: Admin Panel

- [ ] Admin login endpoint (password verification)
- [ ] Tournament CRUD endpoints
- [ ] Competitor CRUD endpoints
- [ ] Tournament status management (start new, close tournament)
- [ ] Magic link regeneration endpoint
- [ ] Admin UI components (TournamentManager, CompetitorManager)
- [ ] Audit logging for all admin actions

### Phase 3: Judge Experience

- [ ] Landing page with tournament status check
- [ ] Competitor dropdown populated from active tournament
- [ ] Event type selector (10 options)
- [ ] Ballot form with 5 scoring categories (1-5 scale)
- [ ] Comment text areas for each category
- [ ] Time input (MM:SS format)
- [ ] Speaker rank selector (1-5)
- [ ] Auto-save implementation (debounced, every 500ms)
- [ ] Device ID generation and storage (localStorage)
- [ ] Draft recovery on page reload
- [ ] Submit ballot with validation
- [ ] Confirmation message on successful submission

### Phase 4: Magic Link & Competitor Access

- [ ] Email service configured (Nodemailer or SendGrid)
- [ ] Magic link generation on competitor creation
- [ ] Batch email sending on tournament close
- [ ] Magic link validation endpoint
- [ ] Competitor ballot listing page (by magic token)
- [ ] Display all ballots for competitor (all events, all judges)

### Phase 5: PDF Generation

- [ ] PDF library integrated (@react-pdf/renderer or jsPDF)
- [ ] Template created for each of 10 event types
- [ ] Match official NCFCA 2025-2026 ballot layouts
- [ ] PDF download endpoint
- [ ] Filename generation: `{EventType}_{CompetitorName}_{JudgeName}.pdf`
- [ ] Test PDF output against official samples in `/ballot-samples/`

### Phase 6: Polish & Testing

- [ ] Responsive design optimized for tablets (10-13")
- [ ] Error handling and user feedback
- [ ] Input validation (frontend and backend)
- [ ] Rate limiting on ballot submission
- [ ] Security review (XSS, SQL injection, magic link expiry)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile usability testing
- [ ] Load testing (multiple judges submitting simultaneously)
- [ ] End-to-end testing of complete workflow
- [ ] Documentation updated
- [ ] Ready for club pilot

## Testing Checklist

- [ ] Judge can submit ballot without any login
- [ ] Auto-save works during typing (no data loss)
- [ ] Draft recovery works on same device
- [ ] Draft does NOT appear on different device
- [ ] Only one tournament can be active
- [ ] Creating new tournament auto-closes previous
- [ ] Close tournament sends emails to all competitors
- [ ] Magic link gives access to only that competitor's ballots
- [ ] PDF matches official NCFCA ballot exactly
- [ ] All 10 event types work correctly
- [ ] Time input accepts MM:SS format
- [ ] Scores validate 1-5 range
- [ ] Rank validates 1-5 range
- [ ] Comments are optional
- [ ] Submitted ballots cannot be edited
- [ ] Magic links work for 1 year
- [ ] Magic links expire after 1 year
- [ ] Admin cannot access without password
- [ ] Resend magic link updates email
- [ ] Bulk export includes all ballots

## Migration Path to Azure/Dataverse (Future)

When ready to deploy to production:

1. Create Azure resources (Resource Group, Static Web App, Key Vault)
2. Set up Azure AD App Registration (optional)
3. Create Power Platform environment with Dataverse (optional)
4. Migrate data from PostgreSQL to Dataverse using Power Platform tools (optional)
5. Update API calls if migrating to Dataverse Web API
6. Deploy frontend to Azure Static Web Apps
7. Configure email service for production
8. Set up SSL certificates and custom domain

## Next Steps

1. ✅ Set up PostgreSQL database with provided credentials
2. ✅ Create database schema using SQL scripts above
3. Initialize Vite + React/TypeScript frontend
4. Initialize Node.js/Express backend with Prisma
5. Implement admin panel (tournament & competitor management)
6. Build judge ballot form with auto-save
7. Implement magic link email system
8. Create PDF generation matching NCFCA templates
9. Test complete workflow end-to-end
10. Deploy to production environment
