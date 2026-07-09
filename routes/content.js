const express = require('express');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const Content = require('../models/Content');

const router = express.Router();

// Get published content
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, tags, author, organization, search } = req.query;
    let query = { is_published: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content_text: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) {
      query.content_type = type;
    }
    if (tags) {
      const tag_array = tags.split(',');
      query.tags = { $in: tag_array };
    }
    if (author) {
      query.author_id = author;
    }
    if (organization) {
      query.organization_id = organization;
    }
    
    const content = await Content.find(query).sort({ created_at: -1 });
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get content by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const content_id = req.params.id;
    const content = await Content.findById(content_id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Only show published content to non-authenticated users
    if (!req.user && !content.is_published) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new content
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content_text, content_type, tags, is_published } = req.body;
    
    if (!title || !content_text || !content_type) {
      return res.status(400).json({ error: 'Title, content, and type are required' });
    }
    
    const content = new Content({
      title,
      content_text,
      content_type,
      author_id: req.user.user_id,
      organization_id: req.user.organization_id,
      tags: tags || [],
      is_published: is_published || false,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    await content.save();
    res.status(201).json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update content
router.put('/:id', authenticate, async (req, res) => {
  try {
    const content_id = req.params.id;
    const { title, content_text, content_type, tags, is_published } = req.body;
    
    const existing_content = await Content.findById(content_id);
    if (!existing_content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user owns the content or is admin
    if (existing_content.author_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (title) existing_content.title = title;
    if (content_text) existing_content.content_text = content_text;
    if (content_type) existing_content.content_type = content_type;
    if (tags) existing_content.tags = tags;
    if (is_published !== undefined) existing_content.is_published = is_published;
    existing_content.updated_at = new Date();
    
    await existing_content.save();
    res.json({ content: existing_content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish content
router.put('/:id/publish', authenticate, async (req, res) => {
  try {
    const content_id = req.params.id;
    const content = await Content.findById(content_id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user owns the content or is admin
    if (content.author_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    content.is_published = true;
    content.updated_at = new Date();
    await content.save();
    
    res.json({ message: 'Content published', content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unpublish content
router.put('/:id/unpublish', authenticate, async (req, res) => {
  try {
    const content_id = req.params.id;
    const content = await Content.findById(content_id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user owns the content or is admin
    if (content.author_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    content.is_published = false;
    content.updated_at = new Date();
    await content.save();
    
    res.json({ message: 'Content unpublished', content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add tag to content
router.post('/:id/tags', authenticate, async (req, res) => {
  try {
    const content_id = req.params.id;
    const { tag } = req.body;
    
    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' });
    }
    
    const content = await Content.findById(content_id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user owns the content or is admin
    if (content.author_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!content.tags.includes(tag)) {
      content.tags.push(tag);
      content.updated_at = new Date();
      await content.save();
    }
    
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove tag from content
router.delete('/:id/tags/:tag', authenticate, async (req, res) => {
  try {
    const content_id = req.params.id;
    const tag = req.params.tag;
    
    const content = await Content.findById(content_id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user owns the content or is admin
    if (content.author_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    content.tags = content.tags.filter(t => t !== tag);
    content.updated_at = new Date();
    await content.save();
    
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete content
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const content_id = req.params.id;
    
    const content = await Content.findById(content_id);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if user owns the content or is admin
    if (content.author_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Content.findByIdAndDelete(content_id);
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;