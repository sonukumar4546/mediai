/**
 * backend/routes/doctors.js
 * Doctor listing, search, detail, available slots
 */

const express = require('express');
const { db }  = require('../../database/db');
const auth    = require('../middleware/auth');

const router = express.Router();

// ── GET /api/doctors ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { specialty, search } = req.query;
    let query = { available: true };
    if (specialty && specialty !== 'all') query.specialty = specialty;

    let doctors = await db.doctors.find(query);

    if (search) {
      const s = search.toLowerCase();
      doctors = doctors.filter(d =>
        d.name.toLowerCase().includes(s) ||
        d.specialty.toLowerCase().includes(s)
      );
    }

    // Remove passwords
    doctors = doctors.map(({ password, ...d }) => d);
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/doctors/specialties ──────────────────────────────────────────────
router.get('/specialties', async (req, res) => {
  try {
    const doctors = await db.doctors.find({});
    const specialties = [...new Set(doctors.map(d => d.specialty))];
    res.json(specialties);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/doctors/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.doctors.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });
    const { password, ...safe } = doc;

    // Attach reviews
    const reviews = await db.reviews.find({ doctorId: req.params.id });
    res.json({ ...safe, reviews });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/doctors/:id/slots ────────────────────────────────────────────────
router.get('/:id/slots', async (req, res) => {
  try {
    const { date } = req.query;
    const doc = await db.doctors.findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    // Find booked slots for this doctor on the given date
    const booked = await db.appointments.find({
      doctorId: req.params.id,
      date,
      status: { $in: ['confirmed', 'pending'] },
    });
    const bookedTimes = booked.map(a => a.time);

    const available = (doc.slots || []).filter(s => !bookedTimes.includes(s));
    res.json({ slots: available, allSlots: doc.slots || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/doctors/:id/review ──────────────────────────────────────────────
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1–5 required' });

    const user = await db.users.findOne({ _id: req.user.id });
    const review = await db.reviews.insert({
      doctorId: req.params.id,
      userId: req.user.id,
      patientName: user.name,
      rating: Number(rating),
      comment: comment || '',
      createdAt: new Date().toISOString(),
    });

    // Update doctor's aggregate rating
    const allReviews = await db.reviews.find({ doctorId: req.params.id });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await db.doctors.update({ _id: req.params.id }, { $set: { rating: Math.round(avg * 10) / 10, reviewCount: allReviews.length } });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
