// Rubric criteria for each scoring category, organized by event type group
// Platform & Limited Prep events use Vocal/Physical Delivery
// Interpretation events use Characterization/Blocking

export type ScoreLevel = 1 | 2 | 3 | 4 | 5;

export interface CategoryCriteria {
  [key: number]: string;
}

export interface RubricCategory {
  name: string;
  criteria: CategoryCriteria;
}

// Platform events (Digital Presentation, Informative, Persuasive)
// Limited Prep events (Apologetics, Extemporaneous, Impromptu)
export const platformRubric: Record<string, RubricCategory> = {
  content: {
    name: 'Content',
    criteria: {
      1: 'Beginning: Vague, general topic. Inadequate content. Unclear relevance or application.',
      2: 'Developing: Interesting topic/thesis. Unclear links between points. Some relevance or application.',
      3: 'Capable: Engaging topic/thesis. Generally clear analysis and connections. Clear relevance or application.',
      4: 'Proficient: Engaging, relevant topic/thesis. Strong ideas with clear connections. Strong relevance or application.',
      5: 'Excellent: Compelling topic/thesis. Robust content with sophisticated analysis. Powerful relevance or application.',
    },
  },
  organizationCitations: {
    name: 'Organization & Citations',
    criteria: {
      1: 'Beginning: Confusing structure. Missing or unclear citations. Poor transitions.',
      2: 'Developing: Some structure apparent. Confusing attributions. Basic transitions.',
      3: 'Capable: Mostly clear thesis and structure. Acceptable citations. Reasonable transitions.',
      4: 'Proficient: Clear structure with smooth transitions. Proper citations throughout.',
      5: 'Excellent: Elegant structure. Seamless transitions. Elegant and well-integrated citations.',
    },
  },
  vocalDelivery: {
    name: 'Vocal Delivery',
    criteria: {
      1: 'Beginning: Mumbling, halting, or monotone. Lack of energy. Difficult to understand.',
      2: 'Developing: Inconsistent effectiveness. Variable volume, pace, or clarity.',
      3: 'Capable: Generally accurate articulation. Appropriate volume and pace. Clear to understand.',
      4: 'Proficient: Overall command of vocal elements. Effective use of energy and emphasis.',
      5: 'Excellent: Powerful, memorable vocal style. Masterful control of pace, tone, and emphasis.',
    },
  },
  physicalDelivery: {
    name: 'Physical Delivery',
    criteria: {
      1: 'Beginning: Nervous or stiff. Minimal eye contact. Distracting movements.',
      2: 'Developing: Inconsistent physical control. Some eye contact. Occasional distractions.',
      3: 'Capable: Poised and confident. Effective use of body and gestures. Good eye contact.',
      4: 'Proficient: Confident, professional control. Purposeful gestures. Strong audience connection.',
      5: 'Excellent: Compelling, masterful use of space. Natural and engaging physical presence.',
    },
  },
  impact: {
    name: 'Impact',
    criteria: {
      1: 'Beginning: Minimally persuasive or engaging. Limited audience connection.',
      2: 'Developing: Somewhat persuasive or engaging. Building audience connection.',
      3: 'Capable: Generally persuasive or engaging. Consistent audience connection.',
      4: 'Proficient: Persuasive and engaging. Meaningful audience connection established.',
      5: 'Excellent: Memorably persuasive and engaging. Strong, lasting audience connection.',
    },
  },
};

// Interpretation events (Biblical, Duo, Open, Oratorical)
export const interpretationRubric: Record<string, RubricCategory> = {
  content: {
    name: 'Content',
    criteria: {
      1: 'Beginning: Minimal literary merit or style. Minimal context for actions and events.',
      2: 'Developing: Some literary merit or style. Some context for actions and events.',
      3: 'Capable: Sufficient literary merit or style for artful storytelling. Clear context.',
      4: 'Proficient: Engaging literary merit and style. Clear context for actions and events.',
      5: 'Excellent: Captivating literary merit and style. Exceptional context for actions and events.',
    },
  },
  organizationCitations: {
    name: 'Organization & Citations',
    criteria: {
      1: 'Beginning: Minimal structure or storyline. Ineffective intro/conclusion. Source unclear.',
      2: 'Developing: Confusing structure or storyline. Basic intro/conclusion. Source stated.',
      3: 'Capable: Mostly clear structure. Theme drawn from text. Intro/conclusion enhance speech.',
      4: 'Proficient: Clear structure or storyline. Theme well-developed. Intro/conclusion enhance speech.',
      5: 'Excellent: Elegant structure or storyline. Theme drawn out beautifully. Intro/conclusion enhance speech.',
    },
  },
  characterization: {
    name: 'Characterization',
    criteria: {
      1: 'Beginning: Vague characters. Minimal vocal mannerisms, postures, or expressions. Unclear transitions.',
      2: 'Developing: Somewhat distinct characters. Inconsistent mannerisms and expressions. Basic transitions.',
      3: 'Capable: Distinct characters. Generally consistent mannerisms and expressions. Reasonable transitions.',
      4: 'Proficient: Realistic characters. Variety of vocal mannerisms and expressions. Clear transitions.',
      5: 'Excellent: Rich, believable characters. Skillful vocal mannerisms and expressions. Seamless transitions.',
    },
  },
  blocking: {
    name: 'Blocking',
    criteria: {
      1: 'Beginning: Vague scenes. Minimal character positioning and movement. Unclear scene transitions.',
      2: 'Developing: Somewhat distinct scenes. Some positioning and movement. Basic scene transitions.',
      3: 'Capable: Distinct scenes. Reasonable positioning and imaginative movement. Generally clear transitions.',
      4: 'Proficient: Realistic scenes. Effective positioning and movement. Smooth scene transitions.',
      5: 'Excellent: Immersive scenes. Purposeful positioning and movement. Seamless scene transitions.',
    },
  },
  impact: {
    name: 'Impact',
    criteria: {
      1: 'Beginning: Minimally thought-provoking or engaging. Attempts audience connection.',
      2: 'Developing: Somewhat thought-provoking or engaging. Builds some audience connection.',
      3: 'Capable: Generally thought-provoking or engaging. Consistent audience connection.',
      4: 'Proficient: Consistently thought-provoking or engaging. Meaningful audience connection.',
      5: 'Excellent: Profoundly thought-provoking or engaging. Strong audience connection secured.',
    },
  },
};

// Helper to get the right rubric based on event type group
export function getRubricForEventType(group: string | undefined): Record<string, RubricCategory> {
  if (group === 'Interpretation') {
    return interpretationRubric;
  }
  // Platform and Limited Prep use the same rubric
  return platformRubric;
}

// Get criteria for a specific category and event type
export function getCriteriaForCategory(
  categoryKey: string,
  eventGroup: string | undefined
): CategoryCriteria | null {
  const rubric = getRubricForEventType(eventGroup);
  const category = rubric[categoryKey];
  return category?.criteria || null;
}

// Map form field names to rubric category keys
export const categoryKeyMap: Record<string, { platform: string; interpretation: string }> = {
  scoreContent: { platform: 'content', interpretation: 'content' },
  scoreOrganizationCitations: { platform: 'organizationCitations', interpretation: 'organizationCitations' },
  scoreCategory3: { platform: 'vocalDelivery', interpretation: 'characterization' },
  scoreCategory4: { platform: 'physicalDelivery', interpretation: 'blocking' },
  scoreImpact: { platform: 'impact', interpretation: 'impact' },
};
