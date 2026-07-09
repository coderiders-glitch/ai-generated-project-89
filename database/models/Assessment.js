const mongoose = require('mongoose');
const { assessmentSchema } = require('../schema');

// Add method to calculate total points
assessmentSchema.methods.calculateTotalPoints = function() {
  this.total_points = this.questions.reduce((total, question) => {
    return total + (question.points || 1);
  }, 0);
  return this.total_points;
};

// Add method to add question
assessmentSchema.methods.addQuestion = function(questionData) {
  const question = {
    question_id: new mongoose.Types.ObjectId().toString(),
    ...questionData
  };
  
  this.questions.push(question);
  this.calculateTotalPoints();
  this.updated_at = new Date();
  return this.save();
};

// Add method to remove question
assessmentSchema.methods.removeQuestion = function(question_id) {
  this.questions = this.questions.filter(q => q.question_id !== question_id);
  this.calculateTotalPoints();
  this.updated_at = new Date();
  return this.save();
};

// Static method to find by user
assessmentSchema.statics.findByUser = function(user_id) {
  return this.find({ user_id, is_active: true })
    .sort({ created_at: -1 });
};

// Static method to find active assessments
assessmentSchema.statics.findActiveAssessments = function() {
  return this.find({ is_active: true })
    .populate('user_id', 'username email')
    .sort({ created_at: -1 });
};

// Add method to deactivate assessment
assessmentSchema.methods.deactivate = function() {
  this.is_active = false;
  this.updated_at = new Date();
  return this.save();
};

// Add method to activate assessment
assessmentSchema.methods.activate = function() {
  this.is_active = true;
  this.updated_at = new Date();
  return this.save();
};

// Pre-save middleware to calculate total points
assessmentSchema.pre('save', function(next) {
  if (this.isModified('questions')) {
    this.calculateTotalPoints();
  }
  next();
});

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = { Assessment };