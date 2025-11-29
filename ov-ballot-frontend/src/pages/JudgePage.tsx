import { useState, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { publicApi } from '../services/api';
import { getDeviceId } from '../utils/deviceId';
import { formatTime, parseTime } from '../utils/formatters';
import type { EventType, Competitor, BallotFormData, StatusResponse } from '../types';
import { SCORE_LABELS } from '../types';
import { getRubricForEventType, type CategoryCriteria } from '../data/rubricCriteria';

type FormData = {
  competitorId: string;
  eventTypeId: string;
  judgeName: string;
  scoreContent: string;
  scoreOrganizationCitations: string;
  scoreCategory3: string;
  scoreCategory4: string;
  scoreImpact: string;
  commentsContent: string;
  commentsOrganizationCitations: string;
  commentsCategory3: string;
  commentsCategory4: string;
  commentsImpact: string;
  overallComments: string;
  totalTime: string;
  speakerRank: string;
};

export default function JudgePage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [competitors, setCompetitors] = useState<Pick<Competitor, 'id' | 'firstName' | 'lastName'>[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      competitorId: '',
      eventTypeId: '',
      judgeName: '',
      scoreContent: '',
      scoreOrganizationCitations: '',
      scoreCategory3: '',
      scoreCategory4: '',
      scoreImpact: '',
      commentsContent: '',
      commentsOrganizationCitations: '',
      commentsCategory3: '',
      commentsCategory4: '',
      commentsImpact: '',
      overallComments: '',
      totalTime: '',
      speakerRank: ''
    }
  });

  const watchedValues = useWatch({ control });
  const selectedEventTypeId = watchedValues.eventTypeId;
  const selectedCompetitorId = watchedValues.competitorId;

  const selectedEventType = eventTypes.find(et => et.id === parseInt(selectedEventTypeId || '0'));

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [statusRes, eventTypesRes] = await Promise.all([
          publicApi.getStatus(),
          publicApi.getEventTypes()
        ]);
        
        setStatus(statusRes);
        setEventTypes(eventTypesRes);

        if (statusRes.hasActiveTournament) {
          const competitorsRes = await publicApi.getCompetitors();
          setCompetitors(competitorsRes.competitors);
        }
      } catch (err) {
        setError('Failed to load data. Please refresh the page.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load draft when competitor and event type are selected
  useEffect(() => {
    async function loadDraft() {
      if (!selectedCompetitorId || !selectedEventTypeId) return;
      
      try {
        const deviceId = getDeviceId();
        const draftRes = await publicApi.getDraft(deviceId, selectedCompetitorId, parseInt(selectedEventTypeId));
        
        if (draftRes.hasDraft && draftRes.draft) {
          const draft = draftRes.draft;
          setValue('judgeName', draft.judgeName || '');
          setValue('scoreContent', draft.scoreContent?.toString() || '');
          setValue('scoreOrganizationCitations', draft.scoreOrganizationCitations?.toString() || '');
          setValue('scoreCategory3', draft.scoreCategory3?.toString() || '');
          setValue('scoreCategory4', draft.scoreCategory4?.toString() || '');
          setValue('scoreImpact', draft.scoreImpact?.toString() || '');
          setValue('commentsContent', draft.commentsContent || '');
          setValue('commentsOrganizationCitations', draft.commentsOrganizationCitations || '');
          setValue('commentsCategory3', draft.commentsCategory3 || '');
          setValue('commentsCategory4', draft.commentsCategory4 || '');
          setValue('commentsImpact', draft.commentsImpact || '');
          setValue('overallComments', draft.overallComments || '');
          setValue('totalTime', draft.totalTimeSeconds ? formatTime(draft.totalTimeSeconds) : '');
          setValue('speakerRank', draft.speakerRank?.toString() || '');
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }
    loadDraft();
  }, [selectedCompetitorId, selectedEventTypeId, setValue]);

  // Auto-save functionality
  const saveDraft = useCallback(async () => {
    if (!selectedCompetitorId || !selectedEventTypeId || !watchedValues.judgeName) return;
    
    setSaving(true);
    try {
      const deviceId = getDeviceId();
      const formData: BallotFormData = {
        competitorId: selectedCompetitorId,
        eventTypeId: parseInt(selectedEventTypeId),
        judgeName: watchedValues.judgeName || '',
        scoreContent: watchedValues.scoreContent ? parseInt(watchedValues.scoreContent) : null,
        scoreOrganizationCitations: watchedValues.scoreOrganizationCitations ? parseInt(watchedValues.scoreOrganizationCitations) : null,
        scoreCategory3: watchedValues.scoreCategory3 ? parseInt(watchedValues.scoreCategory3) : null,
        scoreCategory4: watchedValues.scoreCategory4 ? parseInt(watchedValues.scoreCategory4) : null,
        scoreImpact: watchedValues.scoreImpact ? parseInt(watchedValues.scoreImpact) : null,
        commentsContent: watchedValues.commentsContent || '',
        commentsOrganizationCitations: watchedValues.commentsOrganizationCitations || '',
        commentsCategory3: watchedValues.commentsCategory3 || '',
        commentsCategory4: watchedValues.commentsCategory4 || '',
        commentsImpact: watchedValues.commentsImpact || '',
        overallComments: watchedValues.overallComments || '',
        totalTimeSeconds: watchedValues.totalTime ? parseTime(watchedValues.totalTime) : null,
        speakerRank: watchedValues.speakerRank ? parseInt(watchedValues.speakerRank) : null
      };
      
      await publicApi.saveDraft(deviceId, formData);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [watchedValues, selectedCompetitorId, selectedEventTypeId]);

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft();
    }, 500);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError(null);
    
    try {
      const deviceId = getDeviceId();
      const formData: BallotFormData = {
        competitorId: data.competitorId,
        eventTypeId: parseInt(data.eventTypeId),
        judgeName: data.judgeName,
        scoreContent: parseInt(data.scoreContent),
        scoreOrganizationCitations: parseInt(data.scoreOrganizationCitations),
        scoreCategory3: parseInt(data.scoreCategory3),
        scoreCategory4: parseInt(data.scoreCategory4),
        scoreImpact: parseInt(data.scoreImpact),
        commentsContent: data.commentsContent,
        commentsOrganizationCitations: data.commentsOrganizationCitations,
        commentsCategory3: data.commentsCategory3,
        commentsCategory4: data.commentsCategory4,
        commentsImpact: data.commentsImpact,
        overallComments: data.overallComments,
        totalTimeSeconds: data.totalTime ? parseTime(data.totalTime) : null,
        speakerRank: data.speakerRank ? parseInt(data.speakerRank) : null
      };

      await publicApi.submitBallot(deviceId, formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit ballot');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBallot = () => {
    setSubmitted(false);
    reset();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!status?.hasActiveTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Active Tournament</h1>
          <p className="text-gray-600">There is currently no active tournament. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center bg-green-50 rounded-lg p-8">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-green-800 mb-4">Ballot Submitted!</h1>
          <p className="text-green-700 mb-6">Thank you for your feedback.</p>
          <button
            onClick={handleNewBallot}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Submit Another Ballot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{status.tournament?.name}</h1>
        <p className="text-gray-600">Speech Ballot</p>
        {lastSaved && (
          <p className="text-xs text-gray-400 mt-1">
            {saving ? 'Saving...' : `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </p>
        )}
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Competitor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Speaker</label>
          <select
            {...register('competitorId', { required: 'Please select a speaker' })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a speaker...</option>
            {competitors.map(c => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
          {errors.competitorId && <p className="text-red-500 text-sm mt-1">{errors.competitorId.message}</p>}
        </div>

        {/* Event Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
          <select
            {...register('eventTypeId', { required: 'Please select an event type' })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select an event...</option>
            {(() => {
              // Group events by their group property, sorted by sortOrder
              const sortedEvents = [...eventTypes].sort((a, b) => 
                (a.rubricConfig?.sortOrder || 0) - (b.rubricConfig?.sortOrder || 0)
              );
              const groups: Record<string, typeof eventTypes> = {};
              for (const et of sortedEvents) {
                const group = et.rubricConfig?.group || 'Other';
                if (!groups[group]) groups[group] = [];
                groups[group].push(et);
              }
              // Render optgroups in order: Platform, Limited Prep, Interpretation
              const groupOrder = ['Platform', 'Limited Prep', 'Interpretation', 'Other'];
              return groupOrder.map(groupName => {
                const groupEvents = groups[groupName];
                if (!groupEvents || groupEvents.length === 0) return null;
                return (
                  <optgroup key={groupName} label={groupName}>
                    {groupEvents.map(et => (
                      <option key={et.id} value={et.id}>
                        {et.displayName}
                      </option>
                    ))}
                  </optgroup>
                );
              });
            })()}
          </select>
          {errors.eventTypeId && <p className="text-red-500 text-sm mt-1">{errors.eventTypeId.message}</p>}
        </div>

        {/* Judge Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judge Name</label>
          <input
            type="text"
            {...register('judgeName', { required: 'Please enter your name' })}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Your name"
          />
          {errors.judgeName && <p className="text-red-500 text-sm mt-1">{errors.judgeName.message}</p>}
        </div>

        {/* Scoring Categories */}
        {selectedEventType && (
          <div className="space-y-6 bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800">Scoring</h2>
            
            {(() => {
              const eventGroup = selectedEventType.rubricConfig?.group;
              const rubric = getRubricForEventType(eventGroup);
              const isInterp = eventGroup === 'Interpretation';
              
              return (
                <>
                  {/* Content */}
                  <ScoreCategory
                    label="Content"
                    scoreName="scoreContent"
                    commentName="commentsContent"
                    register={register}
                    errors={errors}
                    rubricCriteria={rubric.content.criteria}
                  />

                  {/* Organization & Citations */}
                  <ScoreCategory
                    label="Organization & Citations"
                    scoreName="scoreOrganizationCitations"
                    commentName="commentsOrganizationCitations"
                    register={register}
                    errors={errors}
                    rubricCriteria={rubric.organizationCitations.criteria}
                  />

                  {/* Category 3 (Vocal Delivery / Characterization) */}
                  <ScoreCategory
                    label={selectedEventType.rubricConfig.categoryLabels.category_3}
                    scoreName="scoreCategory3"
                    commentName="commentsCategory3"
                    register={register}
                    errors={errors}
                    rubricCriteria={isInterp ? rubric.characterization.criteria : rubric.vocalDelivery.criteria}
                  />

                  {/* Category 4 (Physical Delivery / Blocking) */}
                  <ScoreCategory
                    label={selectedEventType.rubricConfig.categoryLabels.category_4}
                    scoreName="scoreCategory4"
                    commentName="commentsCategory4"
                    register={register}
                    errors={errors}
                    rubricCriteria={isInterp ? rubric.blocking.criteria : rubric.physicalDelivery.criteria}
                  />

                  {/* Impact */}
                  <ScoreCategory
                    label="Impact"
                    scoreName="scoreImpact"
                    commentName="commentsImpact"
                    register={register}
                    errors={errors}
                    rubricCriteria={rubric.impact.criteria}
                  />
                </>
              );
            })()}
          </div>
        )}

        {/* Overall Comments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overall Comments</label>
          <textarea
            {...register('overallComments')}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="General feedback for the speaker..."
          />
        </div>

        {/* Time and Rank */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Time (MM:SS)</label>
            <input
              type="text"
              {...register('totalTime', {
                pattern: {
                  value: /^\d{1,2}:\d{2}$/,
                  message: 'Format: MM:SS'
                }
              })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="7:00"
            />
            {errors.totalTime && <p className="text-red-500 text-sm mt-1">{errors.totalTime.message}</p>}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition"
        >
          {submitting ? 'Submitting...' : 'Submit Ballot'}
        </button>
      </form>
    </div>
  );
}

// Score Category Component
function ScoreCategory({ 
  label, 
  scoreName, 
  commentName, 
  register, 
  errors,
  rubricCriteria 
}: { 
  label: string; 
  scoreName: keyof FormData; 
  commentName: keyof FormData; 
  register: any; 
  errors: any;
  rubricCriteria?: CategoryCriteria;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="border-b border-gray-200 pb-4 last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {rubricCriteria && (
          <div className="relative">
            <button
              type="button"
              className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold flex items-center justify-center transition"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label={`View scoring criteria for ${label}`}
            >
              ?
            </button>
            {showTooltip && (
              <div className="absolute left-6 top-0 z-50 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs">
                <div className="font-semibold text-gray-800 mb-2 border-b pb-1">Scoring Criteria for {label}</div>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map(score => (
                    <div key={score} className="flex gap-2">
                      <span className={`font-bold w-4 flex-shrink-0 ${
                        score === 5 ? 'text-green-600' :
                        score === 4 ? 'text-blue-600' :
                        score === 3 ? 'text-yellow-600' :
                        score === 2 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>{score}</span>
                      <span className="text-gray-700">{rubricCriteria[score]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 mb-2">
        {[1, 2, 3, 4, 5].map(score => (
          <label key={score} className="flex-1">
            <input
              type="radio"
              {...register(scoreName, { required: `${label} score is required` })}
              value={score}
              className="sr-only peer"
            />
            <div className="text-center py-3 px-2 border-2 rounded-lg cursor-pointer transition
              peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600
              hover:bg-blue-50 border-gray-300">
              <div className="font-semibold">{score}</div>
              <div className="text-xs">{SCORE_LABELS[score]}</div>
            </div>
          </label>
        ))}
      </div>
      {errors[scoreName] && <p className="text-red-500 text-sm mb-2">{errors[scoreName].message}</p>}
      
      <textarea
        {...register(commentName)}
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={`Comments for ${label.toLowerCase()}...`}
      />
    </div>
  );
}
