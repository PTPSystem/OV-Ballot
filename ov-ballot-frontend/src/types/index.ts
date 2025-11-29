// Tournament Types
export interface Tournament {
  id: string;
  name: string;
  meetingDate: string;
  status: 'active' | 'closed';
  createdAt: string;
  closedAt?: string;
  _count?: {
    competitors: number;
    ballots: number;
  };
}

// Competitor Types
export interface Competitor {
  id: string;
  tournamentId: string;
  firstName: string;
  lastName: string;
  email: string;
  magicToken: string;
  magicLinkSentAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    ballots: number;
  };
}

// Event Type
export interface EventType {
  id: number;
  name: string;
  displayName: string;
  rubricConfig: {
    categories: string[];
    type: 'platform' | 'interpretation';
    group?: string;
    sortOrder?: number;
    categoryLabels: {
      category_3: string;
      category_4: string;
    };
  };
  createdAt: string;
}

// Ballot Types
export interface Ballot {
  id: string;
  tournamentId: string;
  competitorId: string;
  eventTypeId: number;
  judgeName: string;
  
  scoreContent: number | null;
  scoreOrganizationCitations: number | null;
  scoreCategory3: number | null;
  scoreCategory4: number | null;
  scoreImpact: number | null;
  
  commentsContent?: string;
  commentsOrganizationCitations?: string;
  commentsCategory3?: string;
  commentsCategory4?: string;
  commentsImpact?: string;
  overallComments?: string;
  
  totalTimeSeconds?: number;
  speakerRank?: number;
  
  status: 'draft' | 'submitted';
  draftSavedAt?: string;
  submittedAt?: string;
  
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated relations
  competitor?: {
    firstName: string;
    lastName: string;
  };
  eventType?: EventType;
}

// Form Data
export interface BallotFormData {
  competitorId: string;
  eventTypeId: number;
  judgeName: string;
  scoreContent: number | null;
  scoreOrganizationCitations: number | null;
  scoreCategory3: number | null;
  scoreCategory4: number | null;
  scoreImpact: number | null;
  commentsContent: string;
  commentsOrganizationCitations: string;
  commentsCategory3: string;
  commentsCategory4: string;
  commentsImpact: string;
  overallComments: string;
  totalTimeSeconds: number | null;
  speakerRank: number | null;
}

// API Response Types
export interface StatusResponse {
  hasActiveTournament: boolean;
  tournament: Tournament | null;
  message?: string;
}

export interface CompetitorsResponse {
  tournamentId: string;
  tournamentName: string;
  competitors: Pick<Competitor, 'id' | 'firstName' | 'lastName'>[];
}

export interface DraftResponse {
  hasDraft: boolean;
  draft?: Ballot;
  message?: string;
}

export interface SubmitResponse {
  success: boolean;
  ballotId: string;
  message: string;
}

export interface MagicLinkResponse {
  competitor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  tournament: {
    id: string;
    name: string;
    meetingDate: string;
  };
  ballots: Array<{
    id: string;
    eventType: string;
    eventTypeConfig: EventType['rubricConfig'];
    judgeName: string;
    scoreContent: number;
    scoreOrganizationCitations: number;
    scoreCategory3: number;
    scoreCategory4: number;
    scoreImpact: number;
    commentsContent?: string;
    commentsOrganizationCitations?: string;
    commentsCategory3?: string;
    commentsCategory4?: string;
    commentsImpact?: string;
    overallComments?: string;
    totalTimeSeconds?: number;
    speakerRank?: number;
    submittedAt: string;
  }>;
}

// Admin Types
export interface LoginResponse {
  success: boolean;
  sessionId: string;
  expiresAt: string;
}

// Score descriptors
export const SCORE_LABELS: Record<number, string> = {
  1: 'Beginning',
  2: 'Developing',
  3: 'Capable',
  4: 'Proficient',
  5: 'Excellent'
};
