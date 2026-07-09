const mongoose = require('mongoose');
const { userSchema } = require('../schema');
const bcrypt = require('bcryptjs');

// Password hashing middleware is handled in schema.js

// Add password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Add method to get user without password
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

// Static method to find by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function() {
  return this.find({ is_active: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;