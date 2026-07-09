// PHQ-9 (Patient Health Questionnaire-9) scoring utility

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed, or the opposite being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself'
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
  moderately_severe: { min: 15, max: 19 },
  severe: { min: 20, max: 27 }
};

// Question 9 is the suicide ideation question (index 8)
const SUICIDE_QUESTION_INDEX = 8;

function calculatePHQ9Score(responses) {
  if (!responses || !Array.isArray(responses)) {
    throw new Error('Invalid responses format');
  }

  if (responses.length !== PHQ9_QUESTIONS.length) {
    throw new Error(`Expected ${PHQ9_QUESTIONS.length} responses, got ${responses.length}`);
  }

  let total_score = 0;
  let suicide_risk = false;

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

    // Check for suicide ideation (question 9)
    if (i === SUICIDE_QUESTION_INDEX && score_value > 0) {
      suicide_risk = true;
    }
  }

  const severity_level = getSeverityLevel(total_score);

  return {
    score: total_score,
    severity_level,
    suicide_risk,
    interpretation: getInterpretation(severity_level),
    recommendations: getRecommendations(severity_level, suicide_risk)
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
    minimal: 'Minimal depression symptoms',
    mild: 'Mild depression symptoms',
    moderate: 'Moderate depression symptoms - consider treatment',
    moderately_severe: 'Moderately severe depression - treatment recommended',
    severe: 'Severe depression - immediate treatment required'
  };
  return interpretations[severity_level] || 'Unknown severity level';
}

function getRecommendations(severity_level, suicide_risk) {
  let recommendations = [];

  if (suicide_risk) {
    recommendations.push('IMMEDIATE ATTENTION: Suicide risk detected - seek emergency help');
    recommendations.push('Contact crisis hotline or emergency services');
    recommendations.push('Do not leave person alone');
  }

  const base_recommendations = {
    minimal: ['Continue current self-care practices', 'Monitor symptoms'],
    mild: ['Practice self-care activities', 'Consider lifestyle changes', 'Monitor symptoms'],
    moderate: ['Consider professional consultation', 'Practice stress management', 'Regular exercise', 'Social support'],
    moderately_severe: ['Seek professional help', 'Consider therapy or counseling', 'Discuss medication options'],
    severe: ['Seek immediate professional help', 'Consider intensive treatment', 'Discuss hospitalization if necessary']
  };

  recommendations = recommendations.concat(base_recommendations[severity_level] || []);
  return recommendations;
}

function validatePHQ9Response(response) {
  if (!response || typeof response !== 'object') {
    return false;
  }
  return Object.keys(SCORE_VALUES).includes(response.value);
}

function getSuicideRisk(responses) {
  if (!responses || !Array.isArray(responses) || responses.length <= SUICIDE_QUESTION_INDEX) {
    return false;
  }

  const suicide_response = responses[SUICIDE_QUESTION_INDEX];
  if (!suicide_response || typeof suicide_response.value === 'undefined') {
    return false;
  }

  const score_value = SCORE_VALUES[suicide_response.value];
  return score_value > 0;
}

module.exports = {
  calculatePHQ9Score,
  getSeverityLevel,
  getInterpretation,
  getRecommendations,
  validatePHQ9Response,
  getSuicideRisk,
  PHQ9_QUESTIONS,
  SCORE_VALUES,
  SEVERITY_LEVELS,
  SUICIDE_QUESTION_INDEX
};