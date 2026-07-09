const express = require('express');
const { authenticate } = require('../middleware/auth');
const { Conversation } = require('../database/models/Conversation');

const router = express.Router();

// Get user conversations
router.get('/', authenticate, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const conversations = await Conversation.findByUser(user_id);
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new conversation
router.post('/', authenticate, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { title, type } = req.body;
    
    const conversation = new Conversation({
      user_id,
      title,
      type,
      is_active: true
    });
    
    await conversation.save();
    res.status(201).json({ conversation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get conversation messages
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const conversation_id = req.params.id;
    const conversation = await Conversation.findById(conversation_id);
    
        if (!conversation || conversation.user_id.toString() !== req.user.user_id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const messages = await conversation.getRecentMessages();
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add message to conversation
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const conversation_id = req.params.id;
    const { content, role } = req.body;
    
    const conversation = await Conversation.findById(conversation_id);
    
    if (!conversation || conversation.user_id !== req.user.user_id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const message = await conversation.addMessage(role, content);
    res.status(201).json({ message });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Archive conversation
router.put('/:id/archive', authenticate, async (req, res) => {
  try {
    const conversation_id = req.params.id;
    const conversation = await Conversation.findById(conversation_id);
    
    if (!conversation || conversation.user_id !== req.user.user_id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    await conversation.archive();
    res.json({ message: 'Conversation archived' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete conversation
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const conversation_id = req.params.id;
    const conversation = await Conversation.findById(conversation_id);
    
    if (!conversation || conversation.user_id !== req.user.user_id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    await conversation.softDelete();
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;