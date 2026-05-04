# 🏥 MediAI — Full-Stack AI Doctor Appointment System

A complete, production-ready telemedicine platform built with Node.js + Express + NeDB (embedded database).

## 📦 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Node.js + Express.js                |
| Database  | NeDB (embedded, file-based, no setup needed) |
| Auth      | JWT (JSON Web Tokens) + bcrypt      |
| Frontend  | Vanilla HTML / CSS / JavaScript     |
| Fonts     | Google Fonts (DM Sans + DM Serif Display) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Internet connection (for Google Fonts)

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open the app
```
http://localhost:3000
```

That's it! The database seeds automatically on first run.

---

## 🔑 Demo Credentials

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Patient | patient@mediai.com       | patient123  |

> Register your own account from the site as well.

---

## 📂 Project Structure

```
mediai/
├── server.js               # Express server entry point
├── .env                    # Environment variables
├── package.json
│
├── database/
│   ├── db.js               # NeDB setup + seed data
│   └── data/               # Auto-created DB files
│       ├── users.db
│       ├── doctors.db
│       ├── appointments.db
│       ├── symptoms.db
│       └── reviews.db
│
├── backend/
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   └── routes/
│       ├── auth.js         # Register, Login, Profile
│       ├── doctors.js      # Doctor listing, slots, reviews
│       ├── appointments.js # Book, list, cancel appointments
│       └── symptoms.js     # AI symptom analysis + history
│
└── frontend/
    └── public/
        ├── index.html      # Single-page application
        ├── css/
        │   └── style.css   # All styles
        └── js/
            └── app.js      # All frontend logic + API calls
```

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint            | Description       | Auth |
|--------|---------------------|-------------------|------|
| POST   | /api/auth/register  | Register new user | No   |
| POST   | /api/auth/login     | Login             | No   |
| GET    | /api/auth/me        | Get current user  | Yes  |
| PUT    | /api/auth/profile   | Update profile    | Yes  |

### Doctors
| Method | Endpoint                    | Description            | Auth |
|--------|-----------------------------|------------------------|------|
| GET    | /api/doctors                | List all doctors       | No   |
| GET    | /api/doctors/specialties    | List specialties       | No   |
| GET    | /api/doctors/:id            | Doctor detail + reviews| No   |
| GET    | /api/doctors/:id/slots      | Available time slots   | No   |
| POST   | /api/doctors/:id/review     | Add review             | Yes  |

### Appointments
| Method | Endpoint                        | Description          | Auth |
|--------|---------------------------------|----------------------|------|
| POST   | /api/appointments               | Book appointment     | Yes  |
| GET    | /api/appointments               | My appointments      | Yes  |
| GET    | /api/appointments/:id           | Appointment detail   | Yes  |
| PUT    | /api/appointments/:id/cancel    | Cancel appointment   | Yes  |
| GET    | /api/appointments/stats/summary | Dashboard stats      | Yes  |

### Symptoms
| Method | Endpoint                | Description       | Auth |
|--------|-------------------------|-------------------|------|
| POST   | /api/symptoms/analyze   | AI symptom check  | No   |
| GET    | /api/symptoms/history   | Symptom history   | Yes  |

---

## 🏥 Features

- **AI Symptom Checker** — Rule-based medical triage engine with urgency levels
- **Doctor Directory** — 6 pre-seeded doctors across specialties with real slot availability
- **Appointment Booking** — Full booking with conflict detection, meeting link generation
- **User Dashboard** — Stats, upcoming appointments, symptom history
- **JWT Auth** — Secure token-based authentication, 7-day sessions
- **Patient Profile** — Editable personal information
- **Reviews** — Patients can review doctors, rating auto-updates

---

## ⚙️ Environment Variables (.env)

```
PORT=3000
JWT_SECRET=change_this_in_production_to_a_long_random_string
NODE_ENV=development
```

---

## 📝 Notes

- **No database setup needed** — NeDB creates `.db` files automatically in `database/data/`
- **No build step** — Pure HTML/CSS/JS frontend served by Express
- **Data persists** — All bookings and users survive server restarts
- Delete `database/data/` folder to reset all data and re-seed

---

© 2025 MediAI. Not a substitute for professional medical advice.
 mediai
