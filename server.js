/**
 * server.js — MediAI Backend
 * Express server with NeDB database
 * 
 * Start: node server.js
 * Default port: 3000
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { seedDatabase } = require('./database/db');

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes         = require('./backend/routes/auth');
const doctorRoutes       = require('./backend/routes/doctors');
const appointmentRoutes  = require('./backend/routes/appointments');
const symptomRoutes      = require('./backend/routes/symptoms');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'frontend', 'public')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/doctors',      doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/symptoms',     symptomRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── SPA Fallback — serve index.html for all non-API routes ───────────────────
app.get('/{*splat}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend', 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`\n🏥 MediAI server running at http://localhost:${PORT}`);
    console.log(`📂 API docs: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Database: ./database/data/\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
