import axios from 'axios';
import type {
  StatusResponse,
  CompetitorsResponse,
  EventType,
  DraftResponse,
  SubmitResponse,
  MagicLinkResponse,
  LoginResponse,
  Tournament,
  Competitor,
  Ballot,
  BallotFormData
} from '../types';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add session ID to admin requests
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('adminSessionId');
  if (sessionId && config.url?.startsWith('/admin')) {
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

// Handle 401 errors - clear session and reload
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url?.startsWith('/admin')) {
      localStorage.removeItem('adminSessionId');
      localStorage.removeItem('adminSessionExpires');
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

// Public API
export const publicApi = {
  // Check tournament status
  getStatus: async (): Promise<StatusResponse> => {
    const { data } = await api.get('/api/status');
    return data;
  },

  // Get competitors for active tournament
  getCompetitors: async (): Promise<CompetitorsResponse> => {
    const { data } = await api.get('/api/competitors');
    return data;
  },

  // Get all event types
  getEventTypes: async (): Promise<EventType[]> => {
    const { data } = await api.get('/api/event-types');
    return data;
  },

  // Save ballot draft (auto-save)
  saveDraft: async (deviceId: string, formData: BallotFormData): Promise<{ success: boolean; ballotId: string; savedAt: string }> => {
    const { data } = await api.post('/api/ballots/draft', {
      deviceId,
      ...formData
    });
    return data;
  },

  // Get existing draft
  getDraft: async (deviceId: string, competitorId: string, eventTypeId: number): Promise<DraftResponse> => {
    const { data } = await api.get('/api/ballots/draft', {
      params: { deviceId, competitorId, eventTypeId }
    });
    return data;
  },

  // Submit ballot
  submitBallot: async (deviceId: string, formData: BallotFormData): Promise<SubmitResponse> => {
    const { data } = await api.post('/api/ballots/submit', {
      deviceId,
      ...formData
    });
    return data;
  },

  // Access ballots via magic link
  getMagicLinkBallots: async (token: string): Promise<MagicLinkResponse> => {
    const { data } = await api.get(`/api/magic/${token}`);
    return data;
  }
};

// Admin API
export const adminApi = {
  // Login
  login: async (password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/admin/login', { password });
    if (data.success) {
      localStorage.setItem('adminSessionId', data.sessionId);
      localStorage.setItem('adminSessionExpires', data.expiresAt);
    }
    return data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post('/admin/logout');
    localStorage.removeItem('adminSessionId');
    localStorage.removeItem('adminSessionExpires');
  },

  // Check if logged in
  isLoggedIn: (): boolean => {
    const sessionId = localStorage.getItem('adminSessionId');
    const expiresAt = localStorage.getItem('adminSessionExpires');
    if (!sessionId || !expiresAt) return false;
    return new Date(expiresAt) > new Date();
  },

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => {
    const { data } = await api.get('/admin/tournaments');
    return data;
  },

  createTournament: async (name: string, meetingDate: string): Promise<{ success: boolean; tournament: Tournament }> => {
    const { data } = await api.post('/admin/tournaments', { name, meetingDate });
    return data;
  },

  closeTournament: async (id: string): Promise<{ success: boolean; tournament: Tournament; emailsSent: number; totalCompetitors: number }> => {
    const { data } = await api.put(`/admin/tournaments/${id}/close`);
    return data;
  },

  getTournament: async (id: string): Promise<Tournament> => {
    const { data } = await api.get(`/admin/tournaments/${id}`);
    return data;
  },

  sendAllMagicLinks: async (tournamentId: string): Promise<{ success: boolean; emailsSent: number; totalCompetitors: number; errors?: string[] }> => {
    const { data } = await api.post(`/admin/tournaments/${tournamentId}/send-all-links`);
    return data;
  },

  // Competitors
  getCompetitors: async (tournamentId: string): Promise<Competitor[]> => {
    const { data } = await api.get('/admin/competitors', { params: { tournamentId } });
    return data;
  },

  addCompetitor: async (tournamentId: string, firstName: string, lastName: string, email: string): Promise<{ success: boolean; competitor: Competitor }> => {
    const { data } = await api.post('/admin/competitors', { tournamentId, firstName, lastName, email });
    return data;
  },

  updateCompetitor: async (id: string, firstName: string, lastName: string, email: string): Promise<{ success: boolean; competitor: Competitor }> => {
    const { data } = await api.put(`/admin/competitors/${id}`, { firstName, lastName, email });
    return data;
  },

  deleteCompetitor: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await api.delete(`/admin/competitors/${id}`);
    return data;
  },

  resendMagicLink: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/admin/competitors/${id}/resend`);
    return data;
  },

  // Ballots
  getBallots: async (tournamentId?: string, status?: string): Promise<Ballot[]> => {
    const { data } = await api.get('/admin/ballots', { params: { tournamentId, status } });
    return data;
  },

  // Rankings
  getRankings: async (tournamentId: string): Promise<Array<{
    eventTypeId: number;
    eventTypeName: string;
    competitors: Array<{
      competitorId: string;
      competitorName: string;
      totalScore: number;
      ballotCount: number;
      averageScore: number;
      rank: number;
    }>;
  }>> => {
    const { data } = await api.get(`/admin/tournaments/${tournamentId}/rankings`);
    return data;
  },

  // Past Tournaments (for import)
  getPastTournaments: async (): Promise<Tournament[]> => {
    const { data } = await api.get('/admin/past-tournaments');
    return data;
  },

  // Get competitors from a specific tournament for import
  getTournamentCompetitorsForImport: async (tournamentId: string): Promise<Array<{
    firstName: string;
    lastName: string;
    email: string;
  }>> => {
    const { data } = await api.get(`/admin/tournaments/${tournamentId}/competitors-for-import`);
    return data;
  },

  // Import competitors to a tournament
  importCompetitors: async (tournamentId: string, competitors: Array<{ firstName: string; lastName: string; email: string }>): Promise<{ success: boolean; imported: number; skipped: number }> => {
    const { data } = await api.post(`/admin/tournaments/${tournamentId}/import-competitors`, { competitors });
    return data;
  }
};

export default api;
