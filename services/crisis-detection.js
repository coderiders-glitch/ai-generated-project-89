const { getSuicideRisk } = require('../utils/phq9-scoring');

// Crisis keywords and phrases that may indicate immediate risk
const CRISIS_KEYWORDS = [
  'kill myself',
  'end my life',
  'suicide',
  'suicidal',
  'want to die',
  'better off dead',
  'no point living',
  'hurt myself',
  'harm myself',
  'self harm',
  'cut myself',
  'overdose',
  'jump off',
  'hang myself',
  'shoot myself'
];

const CRISIS_PHRASES = [
  'i want to kill myself',
  'i am going to kill myself',
  'i have a plan to',
  'nobody would miss me',
  'world would be better without me',
  'i have nothing to live for',
  'i cannot go on',
  'i want to end it all',
  'i am planning to hurt myself',
  'i have been thinking about suicide'
];

// Immediate help resources
const CRISIS_RESOURCES = {
  us: {
    name: 'National Suicide Prevention Lifeline',
    phone: '988',
    text: 'Text HOME to 741741',
    website: 'https://suicidepreventionlifeline.org'
  },
  international: {
    name: 'International Association for Suicide Prevention',
    website: 'https://www.iasp.info/resources/Crisis_Centres'
  }
};

function detectCrisis(responses, assessment_type = null) {
  let crisis_detected = false;
  const crisis_indicators = [];

  try {
    // Check PHQ-9 specific suicide question
    if (assessment_type === 'PHQ-9') {
      const suicide_risk = getSuicideRisk(responses);
      if (suicide_risk) {
        crisis_detected = true;
        crisis_indicators.push('Positive response to suicide ideation question');
      }
    }

    // Check text responses for crisis keywords
    if (responses && Array.isArray(responses)) {
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (response && response.text) {
          const text_analysis = analyzeTextForCrisis(response.text);
          if (text_analysis.crisis_detected) {
            crisis_detected = true;
            crisis_indicators.push(...text_analysis.indicators);
          }
        }
      }
    }

    return {
      crisis_detected,
      crisis_indicators,
      severity: crisis_detected ? getCrisisSeverity(crisis_indicators) : 'none',
      resources: crisis_detected ? CRISIS_RESOURCES : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in crisis detection:', error);
    return {
      crisis_detected: false,
      crisis_indicators: [],
      severity: 'none',
      resources: null,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function analyzeTextForCrisis(text) {
  if (!text || typeof text !== 'string') {
    return { crisis_detected: false, indicators: [] };
  }

  const normalized_text = text.toLowerCase().trim();
  const indicators = [];
  let crisis_detected = false;

  // Check for exact phrase matches (higher priority)
  for (const phrase of CRISIS_PHRASES) {
    if (normalized_text.includes(phrase)) {
      crisis_detected = true;
      indicators.push(`Crisis phrase detected: "${phrase}"`);
    }
  }

  // Check for individual keywords
  for (const keyword of CRISIS_KEYWORDS) {
    if (normalized_text.includes(keyword)) {
      crisis_detected = true;
      indicators.push(`Crisis keyword detected: "${keyword}"`);
    }
  }

  return {
    crisis_detected,
    indicators
  };
}

function getCrisisSeverity(indicators) {
  if (!indicators || indicators.length === 0) {
    return 'none';
  }

  // Check for high-severity indicators
  const high_severity_patterns = [
    'plan to',
    'going to kill',
    'have a plan',
    'tonight',
    'today',
    'right now'
  ];

  const indicator_text = indicators.join(' ').toLowerCase();
  
  for (const pattern of high_severity_patterns) {
    if (indicator_text.includes(pattern)) {
      return 'high';
    }
  }

  // Check for medium-severity indicators
  if (indicators.length >= 3) {
    return 'medium';
  }

  return 'low';
}

function getCrisisResponse(severity) {
  const responses = {
    high: {
      message: 'IMMEDIATE CRISIS DETECTED: Please seek emergency help right now.',
      actions: [
        'Call 911 or go to nearest emergency room',
        'Call National Suicide Prevention Lifeline: 988',
        'Do not leave the person alone',
        'Remove any means of self-harm'
      ],
      priority: 'EMERGENCY'
    },
    medium: {
      message: 'Crisis indicators detected. Please seek professional help soon.',
      actions: [
        'Contact a mental health professional',
        'Call National Suicide Prevention Lifeline: 988',
        'Reach out to trusted friends or family',
        'Consider going to emergency room if feelings worsen'
      ],
      priority: 'URGENT'
    },
    low: {
      message: 'Some concerning responses detected. Please consider seeking support.',
      actions: [
        'Talk to a counselor or therapist',
        'Call National Suicide Prevention Lifeline: 988',
        'Reach out to trusted friends or family',
        'Monitor your feelings and seek help if they worsen'
      ],
      priority: 'IMPORTANT'
    }
  };

  return responses[severity] || responses.low;
}

function logCrisisEvent(user_id, crisis_data) {
  // Log crisis detection event for follow-up and monitoring
  const log_entry = {
    user_id,
    timestamp: new Date().toISOString(),
    crisis_detected: crisis_data.crisis_detected,
    severity: crisis_data.severity,
    indicators: crisis_data.crisis_indicators,
    resources_provided: crisis_data.resources !== null
  };

  console.log('CRISIS EVENT LOGGED:', JSON.stringify(log_entry, null, 2));
  
  // In production, this should be logged to a secure, monitored system
  // and trigger appropriate alerts to mental health professionals
  
  return log_entry;
}

module.exports = {
  detectCrisis,
  analyzeTextForCrisis,
  getCrisisSeverity,
  getCrisisResponse,
  logCrisisEvent,
  CRISIS_KEYWORDS,
  CRISIS_PHRASES,
  CRISIS_RESOURCES
};