const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { User, Organization, Content, Assessment } = require('../models');

const router = express.Router();

// All admin routes require admin role
router.use(authenticate, requireRole('admin'));

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const stats = {
      total_users: await User.countDocuments(),
      active_users: await User.findActiveUsers().then(users => users.length),
      total_organizations: await Organization.countDocuments(),
      active_organizations: await Organization.findActiveOrganizations().then(orgs => orgs.length),
      total_content: await Content.countDocuments(),
      published_content: await Content.findPublishedContent().then(content => content.length),
      total_assessments: await Assessment.countDocuments(),
      active_assessments: await Assessment.findActiveAssessments().then(assessments => assessments.length)
    };
    
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.is_active = status === 'active';
    
    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });
    
    const total = await User.countDocuments(query);
    
    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user_id = req.params.id;
    const user = await User.findById(user_id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const user_id = req.params.id;
    const { role, is_active, first_name, last_name } = req.body;
    
    const user = await User.findById(user_id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (role) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    user.updated_at = new Date();
    
    await user.save();
    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Organization management
router.get('/organizations', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (status) query.is_active = status === 'active';
    
    const organizations = await Organization.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });
    
    const total = await Organization.countDocuments(query);
    
    res.json({ organizations, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get organization by ID
router.get('/organizations/:id', async (req, res) => {
  try {
    const organization_id = req.params.id;
    const organization = await Organization.findById(organization_id);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const member_count = await organization.getMemberCount();
    const content_count = await organization.getContentCount();
    
    res.json({ organization, member_count, content_count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update organization
router.put('/organizations/:id', async (req, res) => {
  try {
    const organization_id = req.params.id;
    const { name, description, is_active, settings } = req.body;
    
    const organization = await Organization.findById(organization_id);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    if (name) organization.name = name;
    if (description) organization.description = description;
    if (is_active !== undefined) organization.is_active = is_active;
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await organization.setSetting(key, value);
      }
    }
    organization.updated_at = new Date();
    
    await organization.save();
    res.json({ organization });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Content management
router.get('/content', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, status, author } = req.query;
    
    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) query.type = type;
    if (status) query.is_published = status === 'published';
    if (author) query.author_id = author;
    
    const content = await Content.find(query)
      .populate('author_id', 'username first_name last_name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });
    
    const total = await Content.countDocuments(query);
    
    res.json({ content, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System settings
router.get('/settings', async (req, res) => {
  try {
    // Mock implementation - replace with actual settings retrieval
    const settings = {
      site_name: 'Admin Portal',
      maintenance_mode: false,
      registration_enabled: true,
      email_notifications: true,
      max_file_size: '10MB',
      allowed_file_types: ['jpg', 'png', 'pdf', 'doc', 'docx']
    };
    
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update system settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Mock implementation - replace with actual settings update
    const updated_settings = {
      ...settings,
      updated_at: new Date()
    };
    
    res.json({ settings: updated_settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;