const mongoose = require('mongoose');
const { organizationSchema } = require('../schema');

// Add method to update settings
organizationSchema.methods.updateSettings = function(newSettings) {
  this.settings = { ...this.settings, ...newSettings };
  this.updated_at = new Date();
  return this.save();
};

// Add method to get setting value
organizationSchema.methods.getSetting = function(key, defaultValue = null) {
  return this.settings[key] || defaultValue;
};

// Add method to set setting value
organizationSchema.methods.setSetting = function(key, value) {
  this.settings[key] = value;
  this.updated_at = new Date();
  return this.save();
};

// Static method to find active organizations
organizationSchema.statics.findActiveOrganizations = function() {
  return this.find({ is_active: true })
    .sort({ name: 1 });
};

// Static method to find by type
organizationSchema.statics.findByType = function(organization_type) {
  return this.find({ organization_type, is_active: true })
    .sort({ name: 1 });
};

// Add method to deactivate organization
organizationSchema.methods.deactivate = function() {
  this.is_active = false;
  this.updated_at = new Date();
  return this.save();
};

// Add method to activate organization
organizationSchema.methods.activate = function() {
  this.is_active = true;
  this.updated_at = new Date();
  return this.save();
};

// Add method to get member count
organizationSchema.methods.getMemberCount = async function() {
  const User = mongoose.model('User');
  return await User.countDocuments({ 
    organization_id: this._id,
    is_active: true 
  });
};

// Add method to get content count
organizationSchema.methods.getContentCount = async function() {
  const Content = mongoose.model('Content');
  return await Content.countDocuments({ 
    organization_id: this._id,
    is_published: true 
  });
};

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;