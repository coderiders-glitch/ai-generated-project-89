const express = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get available time slots
router.get('/slots', optionalAuth, async (req, res) => {
  try {
    const { date, service_type } = req.query;
    
    // Mock implementation - replace with actual booking logic
    const available_slots = [
      { time: '09:00', available: true },
      { time: '10:00', available: true },
      { time: '11:00', available: false },
      { time: '14:00', available: true },
      { time: '15:00', available: true },
      { time: '16:00', available: true }
    ];
    
    res.json({ date, service_type, available_slots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user bookings
router.get('/', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Mock implementation - replace with actual booking retrieval
    const bookings = [
      {
        id: 1,
        user_id,
        service_type: 'consultation',
        date: '2024-01-15',
        time: '10:00',
        status: 'confirmed',
        created_at: new Date()
      }
    ];
    
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new booking
router.post('/', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { service_type, date, time, notes } = req.body;
    
    if (!service_type || !date || !time) {
      return res.status(400).json({ error: 'Service type, date, and time are required' });
    }
    
    // Mock implementation - replace with actual booking creation
    const booking = {
      id: Date.now(),
      user_id,
      service_type,
      date,
      time,
      notes: notes || '',
      status: 'pending',
      created_at: new Date()
    };
    
    res.status(201).json({ booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get booking by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking_id = req.params.id;
    const user_id = req.user.id;
    
    // Mock implementation - replace with actual booking retrieval
    const booking = {
      id: parseInt(booking_id),
      user_id,
      service_type: 'consultation',
      date: '2024-01-15',
      time: '10:00',
      status: 'confirmed',
      created_at: new Date()
    };
    
    if (booking.user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update booking
router.put('/:id', authenticate, async (req, res) => {
  try {
    const booking_id = req.params.id;
    const user_id = req.user.id;
    const { service_type, date, time, notes, status } = req.body;
    
    // Mock implementation - replace with actual booking update
    const booking = {
      id: parseInt(booking_id),
      user_id,
      service_type: service_type || 'consultation',
      date: date || '2024-01-15',
      time: time || '10:00',
      notes: notes || '',
      status: status || 'confirmed',
      updated_at: new Date()
    };
    
    if (booking.user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancel booking
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking_id = req.params.id;
    const user_id = req.user.id;
    
    // Mock implementation - replace with actual booking cancellation
    const booking = {
      id: parseInt(booking_id),
      user_id,
      service_type: 'consultation',
      date: '2024-01-15',
      time: '10:00',
      status: 'cancelled',
      updated_at: new Date()
    };
    
    if (booking.user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete booking
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const booking_id = req.params.id;
    const user_id = req.user.id;
    
    // Mock implementation - replace with actual booking deletion
    const booking = {
      id: parseInt(booking_id),
      user_id
    };
    
    if (booking.user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;