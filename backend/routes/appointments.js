/**
 * backend/routes/appointments.js
 * Full appointment CRUD + status management
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db }  = require('../../database/db');
const auth    = require('../middleware/auth');

const router = express.Router();

// ── POST /api/appointments ────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { doctorId, date, time, reason, symptoms } = req.body;

    if (!doctorId || !date || !time) {
      return res.status(400).json({ error: 'doctorId, date and time are required' });
    }

    // Validate date is not in the past
    const apptDate = new Date(date);
    const today = new Date(); today.setHours(0,0,0,0);
    if (apptDate < today) return res.status(400).json({ error: 'Cannot book past dates' });

    // Check slot not already taken
    const conflict = await db.appointments.findOne({
      doctorId, date, time, status: { $in: ['confirmed', 'pending'] }
    });
    if (conflict) return res.status(409).json({ error: 'This slot is already booked' });

    const doctor = await db.doctors.findOne({ _id: doctorId });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const user = await db.users.findOne({ _id: req.user.id });

    const appt = await db.appointments.insert({
      _id: uuidv4(),
      userId: req.user.id,
      doctorId,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorAvatar: doctor.avatar,
      doctorAvatarColor: doctor.avatarColor,
      patientName: user.name,
      patientEmail: user.email,
      date,
      time,
      reason: reason || '',
      symptoms: symptoms || '',
      fee: doctor.fee,
      status: 'confirmed',
      paymentStatus: 'paid',
      meetingLink: `https://meet.mediai.com/room/${uuidv4().slice(0,8)}`,
      prescription: null,
      notes: '',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/appointments ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const appts = await db.appointments.find({ userId: req.user.id });
    // Sort by date desc
    appts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/appointments/stats/summary ──────────────────────────────────────
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const all = await db.appointments.find({ userId: req.user.id });
    res.json({
      total: all.length,
      upcoming: all.filter(a => a.status === 'confirmed' && new Date(a.date) >= new Date()).length,
      completed: all.filter(a => a.status === 'completed').length,
      cancelled: all.filter(a => a.status === 'cancelled').length,
      totalSpent: all.filter(a => a.paymentStatus === 'paid').reduce((s, a) => s + (a.fee || 0), 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/appointments/:id ─────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const appt = await db.appointments.findOne({ _id: req.params.id, userId: req.user.id });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/appointments/:id/cancel ─────────────────────────────────────────
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const appt = await db.appointments.findOne({ _id: req.params.id, userId: req.user.id });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.status === 'completed') return res.status(400).json({ error: 'Cannot cancel completed appointment' });

    await db.appointments.update({ _id: req.params.id }, { $set: { status: 'cancelled' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/appointments/:id/prescription ────────────────────────────────────
router.put('/:id/prescription', auth, async (req, res) => {
  try {
    const { prescription, notes } = req.body;
    await db.appointments.update(
      { _id: req.params.id },
      { $set: { prescription, notes, status: 'completed' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
