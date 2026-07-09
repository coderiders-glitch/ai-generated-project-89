// GAD-7 (Generalized Anxiety Disorder 7-item) scoring utility

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen'
];

const SCORE_VALUES = {
  'not_at_all': 0,
  'several_days': 1,
  'more_than_half_days': 2,
  'nearly_every_day': 3
};

const SEVERITY_LEVELS = {
  minimal: { min: 0, max: 4 },
  mild: { min: 5, max: 9 },
  moderate: { min: 10, max: 14 },
  severe: { min: 15, max: 21 }
};

function calculateGAD7Score(responses) {
  if (!responses || !Array.isArray(responses)) {
    throw new Error('Invalid responses format');
  }

  if (responses.length !== GAD7_QUESTIONS.length) {
    throw new Error(`Expected ${GAD7_QUESTIONS.length} responses, got ${responses.length}`);
  }

  let total_score = 0;

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    if (!response || typeof response.value === 'undefined') {
      throw new Error(`Missing response value for question ${i + 1}`);
    }

    const score_value = SCORE_VALUES[response.value];
    if (typeof score_value === 'undefined') {
      throw new Error(`Invalid response value: ${response.value}`);
    }

    total_score += score_value;
  }

  const severity_level = getSeverityLevel(total_score);

  return {
    score: total_score,
    severity_level,
    interpretation: getInterpretation(severity_level),
    recommendations: getRecommendations(severity_level)
  };
}

function getSeverityLevel(score) {
  for (const [level, range] of Object.entries(SEVERITY_LEVELS)) {
    if (score >= range.min && score <= range.max) {
      return level;
    }
  }
  return 'unknown';
}

function getInterpretation(severity_level) {
  const interpretations = {
    minimal: 'Minimal anxiety symptoms',
    mild: 'Mild anxiety symptoms',
    moderate: 'Moderate anxiety symptoms - consider treatment',
    severe: 'Severe anxiety symptoms - treatment recommended'
  };
  return interpretations[severity_level] || 'Unknown severity level';
}

function getRecommendations(severity_level) {
  const recommendations = {
    minimal: ['Continue current self-care practices', 'Monitor symptoms'],
    mild: ['Practice relaxation techniques', 'Consider lifestyle changes', 'Monitor symptoms'],
    moderate: ['Consider professional consultation', 'Practice stress management', 'Regular exercise'],
    severe: ['Seek professional help immediately', 'Consider therapy or counseling', 'Discuss treatment options with healthcare provider']
  };
  return recommendations[severity_level] || [];
}

function validateGAD7Response(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }
  return Object.keys(SCORE_VALUES).includes(response.value);
}

module.exports = {
  calculateGAD7Score,
  getSeverityLevel,
  getInterpretation,
  getRecommendations,
  validateGAD7Response,
  GAD7_QUESTIONS,
  SCORE_VALUES,
  SEVERITY_LEVELS
};