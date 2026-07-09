const mongoose = require('mongoose');
const { conversationSchema } = require('../schema');

// Add method to add message
conversationSchema.methods.addMessage = function(role, content) {
  const message = {
    message_id: new mongoose.Types.ObjectId().toString(),
    role,
    content,
    timestamp: new Date()
  };
  
  this.messages.push(message);
  this.updated_at = new Date();
  return this.save();
};

// Add method to get recent messages
conversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .reverse();
};

// Static method to find by user
conversationSchema.statics.findByUser = function(user_id) {
  return this.find({ user_id, status: 'active' })
    .sort({ updated_at: -1 });
};

// Static method to find active conversations
conversationSchema.statics.findActiveConversations = function() {
  return this.find({ status: 'active' })
    .populate('user_id', 'username email')
    .sort({ updated_at: -1 });
};

// Add method to archive conversation
conversationSchema.methods.archive = function() {
  this.status = 'archived';
  this.updated_at = new Date();
  return this.save();
};

// Add method to delete conversation
conversationSchema.methods.softDelete = function() {
  this.status = 'deleted';
  this.updated_at = new Date();
  return this.save();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;