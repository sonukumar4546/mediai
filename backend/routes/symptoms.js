/**
 * backend/routes/symptoms.js
 * AI symptom analysis using rule-based logic + keyword matching
 * (In production, replace with actual AI/ML API call)
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db }  = require('../../database/db');
const auth    = require('../middleware/auth');

const router = express.Router();

// ── Symptom analysis engine ──────────────────────────────────────────────────
const SYMPTOM_RULES = [
  {
    keywords: ['chest pain','chest tightness','palpitation','heart','shortness of breath','breathless','angina'],
    specialty: 'Cardiologist',
    urgency: 'HIGH',
    confidence: 91,
    analysis: 'Symptoms suggest potential cardiac involvement. Chest pain, palpitations, or shortness of breath can indicate conditions ranging from anxiety to serious cardiac events. Immediate evaluation by a cardiologist is strongly recommended.',
    conditions: ['Angina Pectoris', 'Arrhythmia', 'Myocardial Infarction (rule out)', 'Anxiety Disorder'],
  },
  {
    keywords: ['headache','migraine','head pain','vision blurred','dizziness','vertigo','neck stiff','stiff neck','confusion','seizure'],
    specialty: 'Neurologist',
    urgency: 'MEDIUM',
    confidence: 84,
    analysis: 'The described symptoms indicate neurological involvement. Persistent headache combined with visual disturbances, neck stiffness, or dizziness warrants evaluation by a neurologist to rule out serious conditions like meningitis, migraine variants, or vascular causes.',
    conditions: ['Tension Headache', 'Migraine', 'Cervicogenic Headache', 'Viral Meningitis (rule out)'],
  },
  {
    keywords: ['rash','acne','skin','itch','itching','hives','eczema','psoriasis','spot','lesion','mole','hair loss'],
    specialty: 'Dermatologist',
    urgency: 'LOW',
    confidence: 88,
    analysis: 'Skin-related symptoms are present. A dermatologist can provide accurate diagnosis and treatment for skin conditions. Most skin conditions are non-urgent but should be evaluated to prevent worsening or secondary infection.',
    conditions: ['Contact Dermatitis', 'Atopic Eczema', 'Psoriasis', 'Acne Vulgaris'],
  },
  {
    keywords: ['anxiety','depression','stress','mental','panic','mood','sad','hopeless','sleep','insomnia','trauma','phobia'],
    specialty: 'Psychiatrist',
    urgency: 'MEDIUM',
    confidence: 86,
    analysis: 'The symptoms described indicate possible mental health concerns. A consultation with a psychiatrist can help identify the underlying condition and begin appropriate therapy or medication management.',
    conditions: ['Generalized Anxiety Disorder', 'Major Depressive Disorder', 'Sleep Disorder', 'PTSD'],
  },
  {
    keywords: ['child','baby','infant','toddler','fever child','vaccination','growth','development','cough child'],
    specialty: 'Pediatrician',
    urgency: 'MEDIUM',
    confidence: 89,
    analysis: 'Child health concerns require specialized pediatric care. A pediatrician is best equipped to evaluate symptoms in infants and children given their unique physiology and developmental considerations.',
    conditions: ['Viral Fever', 'Upper Respiratory Infection', 'Developmental Concern', 'Allergic Reaction'],
  },
  {
    keywords: ['stomach','abdomen','nausea','vomiting','diarrhea','constipation','bloating','indigestion','acidity','gastric','bowel'],
    specialty: 'Gastroenterologist',
    urgency: 'LOW',
    confidence: 82,
    analysis: 'Gastrointestinal symptoms are present. These may be caused by dietary issues, infections, or chronic conditions like IBS or GERD. A gastroenterologist consultation will provide a thorough evaluation and treatment plan.',
    conditions: ['GERD / Acid Reflux', 'Irritable Bowel Syndrome', 'Gastroenteritis', 'Peptic Ulcer Disease'],
  },
  {
    keywords: ['joint pain','arthritis','back pain','knee','shoulder','hip','bone','fracture','muscle pain','swelling joint'],
    specialty: 'Orthopedist',
    urgency: 'LOW',
    confidence: 85,
    analysis: 'Musculoskeletal symptoms suggest involvement of joints, bones, or muscles. An orthopedic specialist can evaluate the cause—ranging from overuse injuries to inflammatory arthritis—and recommend appropriate treatment.',
    conditions: ['Osteoarthritis', 'Rheumatoid Arthritis', 'Muscle Strain', 'Tendinitis'],
  },
];

const DEFAULT_RESULT = {
  specialty: 'General Practitioner',
  urgency: 'LOW',
  confidence: 78,
  analysis: 'Based on the symptoms described, a general health evaluation is recommended. A General Practitioner can perform a comprehensive assessment and refer you to a specialist if necessary.',
  conditions: ['Viral Illness', 'Fatigue Syndrome', 'Nutritional Deficiency', 'General Malaise'],
};

function analyzeSymptoms(text, age, gender) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const rule of SYMPTOM_RULES) {
    const score = rule.keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  // Urgency modifiers
  const result = best || { ...DEFAULT_RESULT };
  if (lower.includes('severe') || lower.includes('unbearable') || lower.includes('emergency')) {
    result.urgency = result.urgency === 'LOW' ? 'MEDIUM' : 'HIGH';
  }
  if (age && (parseInt(age) > 65 || parseInt(age) < 5)) {
    result.urgency = result.urgency === 'LOW' ? 'MEDIUM' : result.urgency;
  }

  return {
    specialty: result.specialty,
    urgency: result.urgency,
    confidence: result.confidence,
    analysis: result.analysis,
    possibleConditions: result.conditions,
    disclaimer: 'This analysis is AI-generated for informational triage purposes only and does not constitute a medical diagnosis. Always consult a licensed physician.',
  };
}

// ── POST /api/symptoms/analyze ────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms || symptoms.trim().length < 10) {
      return res.status(400).json({ error: 'Please describe symptoms in more detail (at least 10 characters)' });
    }

    const result = analyzeSymptoms(symptoms, age, gender);

    // Save to DB if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        await db.symptoms.insert({
          userId: decoded.id,
          symptoms,
          age: age || '',
          gender: gender || '',
          result,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {}
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/symptoms/history ─────────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const history = await db.symptoms.find({ userId: req.user.id });
    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
