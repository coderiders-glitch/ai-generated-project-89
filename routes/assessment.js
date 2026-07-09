const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { Assessment } = require('../database/models/Assessment');

const router = express.Router();

// Get all active assessments
router.get('/', async (req, res) => {
  try {
    const assessments = await Assessment.findActiveAssessments();
    res.json({ assessments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get assessment by ID
router.get('/:id', async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const assessment = await Assessment.findById(assessment_id);
    
    if (!assessment || !assessment.is_active) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new assessment (admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { title, description, questions, total_points } = req.body;
    
    const assessment = new Assessment({
            title,
      description,
      questions: questions || [],
      total_points: total_points || 0,
      is_active: true,
      user_id: req.user.user_id
    });
    
    await assessment.save();
    res.status(201).json({ assessment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update assessment (admin only)
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const { title, description, questions, total_points } = req.body;
    
    const assessment = await Assessment.findById(assessment_id);
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    if (title) assessment.title = title;
    if (description) assessment.description = description;
    if (questions) assessment.questions = questions;
    if (total_points !== undefined) assessment.total_points = total_points;
    
    await assessment.save();
    res.json({ assessment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add question to assessment (admin only)
router.post('/:id/questions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const question = req.body;
    
    const assessment = await Assessment.findById(assessment_id);
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    await assessment.addQuestion(question);
    res.status(201).json({ message: 'Question added', assessment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove question from assessment (admin only)
router.delete('/:id/questions/:questionId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const question_id = req.params.questionId;
    
    const assessment = await Assessment.findById(assessment_id);
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    await assessment.removeQuestion(question_id);
    res.json({ message: 'Question removed', assessment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Activate assessment (admin only)
router.put('/:id/activate', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const assessment = await Assessment.findById(assessment_id);
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    await assessment.activate();
    res.json({ message: 'Assessment activated', assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate assessment (admin only)
router.put('/:id/deactivate', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const assessment_id = req.params.id;
    const assessment = await Assessment.findById(assessment_id);
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    await assessment.deactivate();
    res.json({ message: 'Assessment deactivated', assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;