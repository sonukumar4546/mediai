/**
 * database/db.js
 * MediAI — NeDB embedded database setup & seed
 * NeDB is a pure-JS embedded database (like SQLite but in JS)
 */

const Datastore = require('nedb-promises');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, 'data');

// ── Collections (equivalent to SQL tables) ──────────────────────────────────
const db = {
  users:        Datastore.create({ filename: path.join(DB_DIR, 'users.db'),        autoload: true }),
  doctors:      Datastore.create({ filename: path.join(DB_DIR, 'doctors.db'),      autoload: true }),
  appointments: Datastore.create({ filename: path.join(DB_DIR, 'appointments.db'), autoload: true }),
  symptoms:     Datastore.create({ filename: path.join(DB_DIR, 'symptoms.db'),     autoload: true }),
  reviews:      Datastore.create({ filename: path.join(DB_DIR, 'reviews.db'),      autoload: true }),
};

// ── Indexes ──────────────────────────────────────────────────────────────────
db.users.ensureIndex({ fieldName: 'email', unique: true });
db.doctors.ensureIndex({ fieldName: 'email', unique: true });
db.appointments.ensureIndex({ fieldName: 'userId' });
db.appointments.ensureIndex({ fieldName: 'doctorId' });

// ── Seed Data ────────────────────────────────────────────────────────────────
async function seedDatabase() {
  const doctorCount = await db.doctors.count({});
  if (doctorCount > 0) return; // already seeded

  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('doctor123', 10);

  const doctors = [
    {
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@mediai.com',
      password: passwordHash,
      specialty: 'General Practitioner',
      experience: 12,
      qualification: 'MBBS, MD',
      rating: 4.9,
      reviewCount: 312,
      fee: 500,
      bio: 'Dr. Priya Sharma is a compassionate and experienced general practitioner with over 12 years of clinical experience. She specializes in preventive care, chronic disease management, and telemedicine.',
      avatar: 'PS',
      avatarColor: '#2563EB',
      available: true,
      slots: ['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM'],
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Dr. Rahul Mehta',
      email: 'rahul.mehta@mediai.com',
      password: passwordHash,
      specialty: 'Cardiologist',
      experience: 18,
      qualification: 'MBBS, DM (Cardiology)',
      rating: 4.8,
      reviewCount: 528,
      fee: 800,
      bio: 'Dr. Rahul Mehta is a leading cardiologist with 18 years of expertise in interventional cardiology and heart failure management. He has helped over 5000 patients manage cardiac conditions effectively via telemedicine.',
      avatar: 'RM',
      avatarColor: '#7C3AED',
      available: true,
      slots: ['10:00 AM','11:00 AM','12:00 PM','03:00 PM','05:00 PM'],
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Dr. Anita Patel',
      email: 'anita.patel@mediai.com',
      password: passwordHash,
      specialty: 'Dermatologist',
      experience: 9,
      qualification: 'MBBS, MD (Dermatology)',
      rating: 4.7,
      reviewCount: 189,
      fee: 600,
      bio: 'Dr. Anita Patel is a skilled dermatologist specializing in medical dermatology, acne treatment, eczema, psoriasis, and skin cancer screening. She provides thorough consultations with detailed care plans.',
      avatar: 'AP',
      avatarColor: '#0D9488',
      available: true,
      slots: ['09:00 AM','10:00 AM','02:00 PM','03:00 PM','04:00 PM','05:00 PM'],
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Dr. Vikram Singh',
      email: 'vikram.singh@mediai.com',
      password: passwordHash,
      specialty: 'Neurologist',
      experience: 15,
      qualification: 'MBBS, DM (Neurology)',
      rating: 4.9,
      reviewCount: 241,
      fee: 900,
      bio: 'Dr. Vikram Singh is a specialist neurologist with deep expertise in headache disorders, epilepsy, stroke management, and neurodegenerative conditions.',
      avatar: 'VS',
      avatarColor: '#D97706',
      available: true,
      slots: ['11:00 AM','12:00 PM','02:00 PM','04:00 PM'],
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Dr. Meena Iyer',
      email: 'meena.iyer@mediai.com',
      password: passwordHash,
      specialty: 'Pediatrician',
      experience: 11,
      qualification: 'MBBS, MD (Pediatrics)',
      rating: 4.8,
      reviewCount: 402,
      fee: 550,
      bio: 'Dr. Meena Iyer is a dedicated pediatrician offering comprehensive child health services including immunizations, growth monitoring, and management of childhood illnesses.',
      avatar: 'MI',
      avatarColor: '#DB2777',
      available: true,
      slots: ['09:00 AM','10:00 AM','11:00 AM','03:00 PM','04:00 PM'],
      createdAt: new Date().toISOString(),
    },
    {
      name: 'Dr. Arjun Nair',
      email: 'arjun.nair@mediai.com',
      password: passwordHash,
      specialty: 'Psychiatrist',
      experience: 13,
      qualification: 'MBBS, MD (Psychiatry)',
      rating: 4.9,
      reviewCount: 178,
      fee: 700,
      bio: 'Dr. Arjun Nair is an empathetic psychiatrist specializing in anxiety disorders, depression, PTSD, and stress-related conditions through evidence-based therapy and medication management.',
      avatar: 'AN',
      avatarColor: '#059669',
      available: true,
      slots: ['10:00 AM','12:00 PM','02:00 PM','03:00 PM','05:00 PM'],
      createdAt: new Date().toISOString(),
    },
  ];

  await db.doctors.insert(doctors);

  // Demo user
  const userHash = await bcrypt.hash('patient123', 10);
  await db.users.insert({
    name: 'Demo Patient',
    email: 'patient@mediai.com',
    password: userHash,
    phone: '9876543210',
    dob: '1990-05-15',
    gender: 'Male',
    createdAt: new Date().toISOString(),
  }).catch(() => {}); // ignore duplicate

  // Sample reviews
  const allDoctors = await db.doctors.find({});
  const sampleReviews = [
    { rating: 5, comment: 'Excellent doctor! Very thorough and explained everything clearly.', patientName: 'Rahul K.' },
    { rating: 5, comment: 'Incredibly helpful consultation. Diagnosis was spot-on. Highly recommend.', patientName: 'Sneha M.' },
    { rating: 4, comment: 'Great experience overall. Booking was easy and the doctor was punctual.', patientName: 'Ananya P.' },
  ];
  for (const doc of allDoctors) {
    for (const rev of sampleReviews) {
      await db.reviews.insert({ ...rev, doctorId: doc._id, createdAt: new Date().toISOString() });
    }
  }

  console.log('✅ Database seeded successfully');
}

module.exports = { db, seedDatabase };
