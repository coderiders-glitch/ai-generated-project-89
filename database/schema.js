const mongoose = require('mongoose');
const { Schema } = mongoose;

// User Schema
const userSchema = new Schema({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  first_name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Conversation Schema
const conversationSchema = new Schema({
  conversation_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  messages: [{
    message_id: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Assessment Schema
const assessmentSchema = new Schema({
  assessment_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  questions: [{
    question_id: {
      type: String,
      required: true
    },
    question_text: {
      type: String,
      required: true
    },
    question_type: {
      type: String,
      enum: ['multiple_choice', 'short_answer', 'essay'],
      required: true
    },
    options: [{
      option_id: String,
      option_text: String,
      is_correct: Boolean
    }],
    correct_answer: String,
    points: {
      type: Number,
      default: 1
    }
  }],
  total_points: {
    type: Number,
    default: 0
  },
  time_limit: {
    type: Number // in minutes
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Content Schema
const contentSchema = new Schema({
  content_id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  content_type: {
    type: String,
    enum: ['lesson', 'video', 'document', 'quiz', 'assignment'],
    required: true
  },
  content_data: {
    type: Schema.Types.Mixed
  },
  author_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  tags: [{
    type: String
  }],
  is_published: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Organization Schema
const organizationSchema = new Schema({
  organization_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  organization_type: {
    type: String,
    enum: ['school', 'university', 'company', 'nonprofit'],
    required: true
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {}
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps on save
userSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

conversationSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

assessmentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

contentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

organizationSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = {
  userSchema,
  conversationSchema,
  assessmentSchema,
  contentSchema,
  organizationSchema
};