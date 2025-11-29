import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../services/api';
import type { MagicLinkResponse } from '../types';
import { formatDate, formatTime } from '../utils/formatters';
import { SCORE_LABELS } from '../types';

export default function MagicLinkPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<MagicLinkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      
      try {
        const result = await publicApi.getMagicLinkBallots(token);
        setData(result);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load ballots');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          {data.competitor.firstName} {data.competitor.lastName}
        </h1>
        <p className="text-gray-600 mt-2">
          Speech Ballots from {data.tournament.name}
        </p>
        <p className="text-gray-500 text-sm">
          {formatDate(data.tournament.meetingDate)}
        </p>
      </header>

      {data.ballots.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No ballots have been submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.ballots.map((ballot) => (
            <BallotCard key={ballot.id} ballot={ballot} />
          ))}
        </div>
      )}
    </div>
  );
}

function BallotCard({ ballot }: { ballot: MagicLinkResponse['ballots'][0] }) {
  const [expanded, setExpanded] = useState(false);
  const totalScore = (ballot.scoreContent || 0) + 
                     (ballot.scoreOrganizationCitations || 0) + 
                     (ballot.scoreCategory3 || 0) + 
                     (ballot.scoreCategory4 || 0) + 
                     (ballot.scoreImpact || 0);

  const category3Label = ballot.eventTypeConfig?.categoryLabels?.category_3 || 'Category 3';
  const category4Label = ballot.eventTypeConfig?.categoryLabels?.category_4 || 'Category 4';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">
              {ballot.eventType}
            </span>
            {ballot.speakerRank && (
              <span className="text-gray-500 text-sm">
                Rank: {ballot.speakerRank}
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">Judge: {ballot.judgeName}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">{totalScore}/25</div>
          <p className="text-gray-500 text-sm">{expanded ? '▲ Hide' : '▼ Show'} details</p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Scores Grid */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            <ScoreBox label="Content" score={ballot.scoreContent} />
            <ScoreBox label="Org & Citations" score={ballot.scoreOrganizationCitations} />
            <ScoreBox label={category3Label} score={ballot.scoreCategory3} />
            <ScoreBox label={category4Label} score={ballot.scoreCategory4} />
            <ScoreBox label="Impact" score={ballot.scoreImpact} />
          </div>

          {/* Comments */}
          <div className="space-y-4">
            {ballot.commentsContent && (
              <CommentSection label="Content" comment={ballot.commentsContent} />
            )}
            {ballot.commentsOrganizationCitations && (
              <CommentSection label="Organization & Citations" comment={ballot.commentsOrganizationCitations} />
            )}
            {ballot.commentsCategory3 && (
              <CommentSection label={category3Label} comment={ballot.commentsCategory3} />
            )}
            {ballot.commentsCategory4 && (
              <CommentSection label={category4Label} comment={ballot.commentsCategory4} />
            )}
            {ballot.commentsImpact && (
              <CommentSection label="Impact" comment={ballot.commentsImpact} />
            )}
            {ballot.overallComments && (
              <CommentSection label="Overall Comments" comment={ballot.overallComments} />
            )}
          </div>

          {/* Time */}
          {ballot.totalTimeSeconds && (
            <div className="mt-4 text-gray-600 text-sm">
              Time: {formatTime(ballot.totalTimeSeconds)}
            </div>
          )}

          {/* Download PDF Button (placeholder) */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              className="bg-gray-200 text-gray-600 px-4 py-2 rounded cursor-not-allowed"
              disabled
            >
              📄 Download PDF (Coming Soon)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBox({ label, score }: { label: string; score: number }) {
  const bgColor = score >= 4 ? 'bg-green-100' : score >= 3 ? 'bg-yellow-100' : 'bg-red-100';
  const textColor = score >= 4 ? 'text-green-800' : score >= 3 ? 'text-yellow-800' : 'text-red-800';

  return (
    <div className={`${bgColor} rounded-lg p-3 text-center`}>
      <div className={`text-2xl font-bold ${textColor}`}>{score}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
      <div className="text-xs text-gray-500">{SCORE_LABELS[score]}</div>
    </div>
  );
}

function CommentSection({ label, comment }: { label: string; comment: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700">{label}</h4>
      <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{comment}</p>
    </div>
  );
}
