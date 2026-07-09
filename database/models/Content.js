const mongoose = require('mongoose');
const { contentSchema } = require('../schema');

// Add method to publish content
contentSchema.methods.publish = function() {
  this.is_published = true;
  this.updated_at = new Date();
  return this.save();
};

// Add method to unpublish content
contentSchema.methods.unpublish = function() {
  this.is_published = false;
  this.updated_at = new Date();
  return this.save();
};

// Add method to add tag
contentSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    this.updated_at = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Add method to remove tag
contentSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  this.updated_at = new Date();
  return this.save();
};

// Static method to find by author
contentSchema.statics.findByAuthor = function(author_id) {
  return this.find({ author_id })
    .sort({ created_at: -1 });
};

// Static method to find published content
contentSchema.statics.findPublishedContent = function() {
  return this.find({ is_published: true })
    .populate('author_id', 'username email')
    .populate('organization_id', 'name')
    .sort({ created_at: -1 });
};

// Static method to find by content type
contentSchema.statics.findByType = function(content_type) {
  return this.find({ content_type, is_published: true })
    .populate('author_id', 'username email')
    .sort({ created_at: -1 });
};

// Static method to find by organization
contentSchema.statics.findByOrganization = function(organization_id) {
  return this.find({ organization_id })
    .populate('author_id', 'username email')
    .sort({ created_at: -1 });
};

// Static method to search by tags
contentSchema.statics.findByTags = function(tags) {
  return this.find({ 
    tags: { $in: tags },
    is_published: true 
  })
    .populate('author_id', 'username email')
    .sort({ created_at: -1 });
};

// Static method to search content
contentSchema.statics.searchContent = function(searchTerm) {
  return this.find({
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ],
    is_published: true
  })
    .populate('author_id', 'username email')
    .sort({ created_at: -1 });
};

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;