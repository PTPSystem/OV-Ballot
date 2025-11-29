import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { adminApi } from '../services/api';
import type { Tournament, Competitor } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';

// Login Component
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await adminApi.login(password);
      onLogin();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Login</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Dashboard Component
type ImportCompetitor = {
  firstName: string;
  lastName: string;
  email: string;
};

function Dashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournament, setNewTournament] = useState({ name: '', meetingDate: '' });
  const [creating, setCreating] = useState(false);
  
  // Import from past tournament
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [selectedPastTournamentId, setSelectedPastTournamentId] = useState<string>('');
  const [competitorsToImport, setCompetitorsToImport] = useState<ImportCompetitor[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [newTournamentId, setNewTournamentId] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    try {
      const [allTournaments, closedTournaments] = await Promise.all([
        adminApi.getTournaments(),
        adminApi.getPastTournaments()
      ]);
      setTournaments(allTournaments);
      setPastTournaments(closedTournaments);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompetitorsFromTournament(tournamentId: string) {
    if (!tournamentId) {
      setCompetitorsToImport([]);
      setSelectedCompetitors(new Set());
      return;
    }
    setLoadingCompetitors(true);
    try {
      const data = await adminApi.getTournamentCompetitorsForImport(tournamentId);
      setCompetitorsToImport(data);
      setSelectedCompetitors(new Set(data.map(c => c.email))); // Select all by default
    } catch (err) {
      console.error('Failed to load competitors:', err);
    } finally {
      setLoadingCompetitors(false);
    }
  }

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await adminApi.createTournament(newTournament.name, newTournament.meetingDate);
      setNewTournamentId(result.tournament.id);
      setNewTournament({ name: '', meetingDate: '' });
      setShowCreateForm(false);
      
      // Show import modal if there are past tournaments
      if (pastTournaments.length > 0) {
        setSelectedPastTournamentId('');
        setCompetitorsToImport([]);
        setSelectedCompetitors(new Set());
        setShowImportModal(true);
      }
      
      loadTournaments();
    } catch (err) {
      console.error('Failed to create tournament:', err);
    } finally {
      setCreating(false);
    }
  }

  function handleOpenCreateForm() {
    setShowCreateForm(true);
  }

  async function handlePastTournamentChange(tournamentId: string) {
    setSelectedPastTournamentId(tournamentId);
    await loadCompetitorsFromTournament(tournamentId);
  }

  async function handleImportCompetitors() {
    if (!newTournamentId || selectedCompetitors.size === 0) return;
    
    setImporting(true);
    try {
      const toImport = competitorsToImport
        .filter(c => selectedCompetitors.has(c.email))
        .map(c => ({ firstName: c.firstName, lastName: c.lastName, email: c.email }));
      
      const result = await adminApi.importCompetitors(newTournamentId, toImport);
      alert(`Imported ${result.imported} competitors${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}`);
      setShowImportModal(false);
      setNewTournamentId(null);
      setSelectedPastTournamentId('');
      setCompetitorsToImport([]);
      setSelectedCompetitors(new Set());
      loadTournaments();
    } catch (err) {
      console.error('Failed to import competitors:', err);
      alert('Failed to import competitors');
    } finally {
      setImporting(false);
    }
  }

  function toggleCompetitor(email: string) {
    setSelectedCompetitors(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  }

  function selectAllCompetitors() {
    setSelectedCompetitors(new Set(competitorsToImport.map(c => c.email)));
  }

  function deselectAllCompetitors() {
    setSelectedCompetitors(new Set());
  }

  async function handleCloseTournament(id: string) {
    if (!confirm('Are you sure you want to close this tournament and send magic links to all competitors?')) return;
    
    try {
      const result = await adminApi.closeTournament(id);
      alert(`Tournament closed! ${result.emailsSent} of ${result.totalCompetitors} emails sent.`);
      loadTournaments();
    } catch (err) {
      console.error('Failed to close tournament:', err);
      alert('Failed to close tournament');
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const activeTournament = tournaments.find(t => t.status === 'active');

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tournament Dashboard</h1>
        <button
          onClick={handleOpenCreateForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Tournament
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold">Import Competitors from Past Tournament</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select a past tournament to import competitors from
              </p>
            </div>
            
            {/* Tournament Selection */}
            <div className="p-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Tournament</label>
              <select
                value={selectedPastTournamentId}
                onChange={(e) => handlePastTournamentChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">Choose a tournament...</option>
                {pastTournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({formatDate(t.meetingDate)}) - {t._count?.competitors || 0} competitors
                  </option>
                ))}
              </select>
            </div>

            {/* Competitor Selection */}
            {selectedPastTournamentId && (
              <>
                <div className="p-4 border-b flex gap-2">
                  <button
                    onClick={selectAllCompetitors}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={deselectAllCompetitors}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Deselect All
                  </button>
                  <span className="ml-auto text-sm text-gray-500">
                    {selectedCompetitors.size} of {competitorsToImport.length} selected
                  </span>
                </div>
                
                <div className="overflow-y-auto max-h-[40vh]">
                  {loadingCompetitors ? (
                    <div className="p-8 text-center text-gray-500">Loading competitors...</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-10"></th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {competitorsToImport.map((c) => (
                          <tr 
                            key={c.email} 
                            className={`cursor-pointer hover:bg-gray-50 ${selectedCompetitors.has(c.email) ? 'bg-blue-50' : ''}`}
                            onClick={() => toggleCompetitor(c.email)}
                          >
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedCompetitors.has(c.email)}
                                onChange={() => {}}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded text-blue-600 pointer-events-none"
                              />
                            </td>
                            <td className="px-4 py-2 font-medium">
                              {c.lastName}, {c.firstName}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {c.email}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setNewTournamentId(null);
                  setSelectedPastTournamentId('');
                  setCompetitorsToImport([]);
                  setSelectedCompetitors(new Set());
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Skip
              </button>
              <button
                onClick={handleImportCompetitors}
                disabled={importing || selectedCompetitors.size === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400"
              >
                {importing ? 'Importing...' : `Import ${selectedCompetitors.size} Competitors`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Tournament</h2>
          <form onSubmit={handleCreateTournament} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newTournament.name}
                onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Date</label>
              <input
                type="date"
                value={newTournament.meetingDate}
                onChange={(e) => setNewTournament({ ...newTournament, meetingDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>
            {pastTournaments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                ℹ️ After creating, you can import competitors from {pastTournaments.length} past tournament{pastTournaments.length !== 1 ? 's' : ''}.
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400"
              >
                {creating ? 'Creating...' : 'Create Tournament'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTournament && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded uppercase font-semibold">Active</span>
              <h2 className="text-xl font-bold text-green-800 mt-2">{activeTournament.name}</h2>
              <p className="text-green-700">{formatDate(activeTournament.meetingDate)}</p>
              <p className="text-sm text-green-600 mt-1">
                {activeTournament._count?.competitors || 0} competitors • {activeTournament._count?.ballots || 0} ballots
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/admin/competitors/${activeTournament.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Manage Competitors
              </Link>
              <button
                onClick={() => handleCloseTournament(activeTournament.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Close Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Past Tournaments</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competitors</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ballots</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tournaments.filter(t => t.status === 'closed').map(tournament => (
              <tr key={tournament.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link to={`/admin/competitors/${tournament.id}`} className="text-blue-600 hover:underline">
                    {tournament.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(tournament.meetingDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">Closed</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tournament._count?.competitors || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tournament._count?.ballots || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/admin/rankings/${tournament.id}`}
                    className="text-green-600 hover:underline mr-3"
                  >
                    🏆 Rankings
                  </Link>
                  <Link
                    to={`/admin/competitors/${tournament.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Manage / Send Links
                  </Link>
                </td>
              </tr>
            ))}
            {tournaments.filter(t => t.status === 'closed').length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No closed tournaments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Competitors Component
function CompetitorsPage() {
  const location = useLocation();
  const tournamentId = location.pathname.split('/').pop() || '';
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ firstName: '', lastName: '', email: '' });
  const [adding, setAdding] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  async function loadData() {
    try {
      const [tournamentData, competitorsData] = await Promise.all([
        adminApi.getTournament(tournamentId),
        adminApi.getCompetitors(tournamentId)
      ]);
      setTournament(tournamentData);
      setCompetitors(competitorsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompetitors() {
    try {
      const data = await adminApi.getCompetitors(tournamentId);
      setCompetitors(data);
    } catch (err) {
      console.error('Failed to load competitors:', err);
    }
  }

  async function handleAddCompetitor(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await adminApi.addCompetitor(tournamentId, newCompetitor.firstName, newCompetitor.lastName, newCompetitor.email);
      setNewCompetitor({ firstName: '', lastName: '', email: '' });
      setShowAddForm(false);
      loadCompetitors();
    } catch (err) {
      console.error('Failed to add competitor:', err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteCompetitor(id: string) {
    if (!confirm('Are you sure you want to delete this competitor?')) return;
    
    try {
      await adminApi.deleteCompetitor(id);
      loadCompetitors();
    } catch (err) {
      console.error('Failed to delete competitor:', err);
    }
  }

  async function handleResendMagicLink(id: string) {
    try {
      await adminApi.resendMagicLink(id);
      alert('Magic link sent!');
      loadCompetitors();
    } catch (err) {
      console.error('Failed to resend magic link:', err);
      alert('Failed to send magic link');
    }
  }

  async function handleSendAllMagicLinks() {
    if (!confirm(`Send magic links to all ${competitors.length} competitors?`)) return;
    
    setSendingAll(true);
    try {
      const result = await adminApi.sendAllMagicLinks(tournamentId);
      let message = `Sent ${result.emailsSent} of ${result.totalCompetitors} emails.`;
      if (result.errors && result.errors.length > 0) {
        message += `\n\nErrors:\n${result.errors.join('\n')}`;
      }
      alert(message);
      loadCompetitors();
    } catch (err) {
      console.error('Failed to send magic links:', err);
      alert('Failed to send magic links');
    } finally {
      setSendingAll(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/admin" className="text-blue-600 hover:underline text-sm">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">
            {tournament?.name || 'Competitors'}
          </h1>
          {tournament && (
            <p className="text-gray-500 text-sm">
              {formatDate(tournament.meetingDate)} • 
              <span className={tournament.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                {' '}{tournament.status === 'active' ? 'Active' : 'Closed'}
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSendAllMagicLinks}
            disabled={sendingAll || competitors.length === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-purple-400"
          >
            {sendingAll ? 'Sending...' : `📧 Send All Links (${competitors.length})`}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Competitor
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Competitor</h2>
          <form onSubmit={handleAddCompetitor} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={newCompetitor.firstName}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, firstName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newCompetitor.lastName}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, lastName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={newCompetitor.email}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400"
              >
                {adding ? 'Adding...' : 'Add Competitor'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ballots</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Magic Link</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {competitors.map(competitor => (
              <tr key={competitor.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {competitor.lastName}, {competitor.firstName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {competitor.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {competitor._count?.ballots || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {competitor.magicLinkSentAt ? (
                    <span className="text-green-600">Sent {formatDateTime(competitor.magicLinkSentAt)}</span>
                  ) : (
                    <span className="text-gray-400">Not sent</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleResendMagicLink(competitor.id)}
                    className="text-blue-600 hover:underline mr-4"
                  >
                    Send Link
                  </button>
                  <button
                    onClick={() => handleDeleteCompetitor(competitor.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {competitors.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No competitors yet. Click "Add Competitor" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

// Rankings Component
type RankingEntry = {
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
};

function RankingsPage() {
  const location = useLocation();
  const tournamentId = location.pathname.split('/').pop() || '';
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId]);

  async function loadData() {
    try {
      const [tournamentData, rankingsData] = await Promise.all([
        adminApi.getTournament(tournamentId),
        adminApi.getRankings(tournamentId)
      ]);
      setTournament(tournamentData);
      setRankings(rankingsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/admin" className="text-blue-600 hover:underline text-sm">← Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          Rankings: {tournament?.name || 'Tournament'}
        </h1>
        {tournament && (
          <p className="text-gray-500 text-sm">{formatDate(tournament.meetingDate)}</p>
        )}
      </div>

      {rankings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No ballots have been submitted for this tournament yet.
        </div>
      ) : (
        <div className="space-y-8">
          {rankings.map((eventRanking) => (
            <div key={eventRanking.eventTypeId} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-3">
                <h2 className="text-lg font-semibold">{eventRanking.eventTypeName}</h2>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competitor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Score</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ballots</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eventRanking.competitors.map((competitor) => (
                    <tr key={competitor.competitorId} className={competitor.rank <= 3 ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          competitor.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                          competitor.rank === 2 ? 'bg-gray-300 text-gray-700' :
                          competitor.rank === 3 ? 'bg-amber-600 text-white' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {competitor.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {competitor.competitorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-lg font-bold text-gray-900">
                        {competitor.totalScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                        {competitor.ballotCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                        {competitor.averageScore.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Admin Page
export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(adminApi.isLoggedIn());

  const handleLogout = async () => {
    await adminApi.logout();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/admin" className="text-xl font-bold text-gray-800">
            OV-Ballot Admin
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-800">
              View Judge Page
            </Link>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/competitors/:tournamentId" element={<CompetitorsPage />} />
          <Route path="/rankings/:tournamentId" element={<RankingsPage />} />
        </Routes>
      </div>
    </div>
  );
}
