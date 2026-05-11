/**
 * app.js — MediAI Frontend
 * Full API integration: auth, doctors, bookings, symptoms
 */

'use strict';

const API = '/api';
let currentUser = null;
let allDoctors   = [];
let allAppointments = [];
let currentBookingDoctor = null;
let symptomResultSpecialty = null;

// ── Token helpers ─────────────────────────────────────────────────────────────
const getToken  = () => localStorage.getItem('mediai_token');
const setToken  = t  => localStorage.setItem('mediai_token', t);
const clearToken= ()  => localStorage.removeItem('mediai_token');

function authHeaders() {
  const t = getToken();
  return t ? { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
           : { 'Content-Type': 'application/json' };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: authHeaders(),
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Request failed');
  return data;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ── Navbar scroll behaviour ───────────────────────────────────────────────────
let lastScrollY = 0, ticking = false;
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const y = window.scrollY;
      navbar.classList.toggle('scrolled', y > 10);
      if (y > 80) navbar.classList.toggle('hidden', y > lastScrollY);
      else navbar.classList.remove('hidden');
      lastScrollY = y;
      ticking = false;
    });
    ticking = true;
  }
});

// ── Hamburger ─────────────────────────────────────────────────────────────────
const ham  = document.getElementById('hamburger');
const mmenu = document.getElementById('mobileMenu');
ham.addEventListener('click', () => { ham.classList.toggle('open'); mmenu.classList.toggle('open'); });
function closeMobile() { ham.classList.remove('open'); mmenu.classList.remove('open'); }

// ── Intersection Observer ─────────────────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Hero timer ────────────────────────────────────────────────────────────────
let secs = 8 * 60 + 24;
const timerEl = document.getElementById('heroTimer');
setInterval(() => {
  secs++;
  timerEl.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
}, 1000);

// ── Smooth scroll ─────────────────────────────────────────────────────────────
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) { const top = el.getBoundingClientRect().top + window.scrollY - 72; window.scrollTo({ top, behavior: 'smooth' }); }
}
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); const top = target.getBoundingClientRect().top + window.scrollY - 72; window.scrollTo({ top, behavior: 'smooth' }); }
  });
});

// ── Auth UI helpers ───────────────────────────────────────────────────────────
function setLoggedIn(user) {
  currentUser = user;
  document.getElementById('navLoginBtn').classList.add('hidden');
  document.getElementById('userMenu').classList.remove('hidden');
  document.getElementById('navAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('dropdownName').textContent = user.name;
}
function setLoggedOut() {
  currentUser = null;
  document.getElementById('navLoginBtn').classList.remove('hidden');
  document.getElementById('userMenu').classList.add('hidden');
  hideAllAppSections();
  document.getElementById('landingPage').classList.remove('hidden');
}
function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('hidden');
}
document.addEventListener('click', e => {
  const menu = document.getElementById('userDropdown');
  const btn  = document.getElementById('userAvatarBtn');
  if (!menu.classList.contains('hidden') && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// ── Auth modal ────────────────────────────────────────────────────────────────
function openAuthModal(tab = 'login') {
  switchAuth(tab);
  document.getElementById('authError').classList.add('hidden');
  openModal('authModal');
}
function switchAuth(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
}

async function login() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  if (!email || !password) return showAuthError('Please enter email and password.');
  btn.disabled = true; btn.textContent = 'Logging in...';
  try {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setLoggedIn(data.user);
    closeModal('authModal');
    toast(`Welcome back, ${data.user.name}! 👋`);
    loadDoctors();
  } catch (err) {
    showAuthError(err.message);
  } finally { btn.disabled = false; btn.textContent = 'Log In'; }
}

async function register() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const phone    = document.getElementById('regPhone').value.trim();
  const gender   = document.getElementById('regGender').value;
  const btn      = document.getElementById('registerBtn');
  if (!name || !email || !password) return showAuthError('Name, email and password are required.');
  btn.disabled = true; btn.textContent = 'Creating account...';
  try {
    const data = await apiFetch('/auth/register', { method: 'POST', body: { name, email, password, phone, gender } });
    setToken(data.token);
    setLoggedIn(data.user);
    closeModal('authModal');
    toast(`Account created! Welcome, ${data.user.name} 🎉`);
    loadDoctors();
  } catch (err) {
    showAuthError(err.message);
  } finally { btn.disabled = false; btn.textContent = 'Create Account'; }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function logout() {
  clearToken();
  setLoggedOut();
  toast('Signed out successfully.', 'success');
  document.getElementById('userDropdown').classList.add('hidden');
}

// ── Section navigation ────────────────────────────────────────────────────────
function hideAllAppSections() {
  document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
  document.getElementById('appSections').classList.add('hidden');
}

function showSection(name) {
  document.getElementById('userDropdown').classList.add('hidden');
  if (!currentUser) { openAuthModal('login'); return; }
  document.getElementById('landingPage').classList.add('hidden');
  hideAllAppSections();
  document.getElementById('appSections').classList.remove('hidden');
  window.scrollTo(0, 0);
  switch (name) {
    case 'dashboard':     showDashboard();         break;
    case 'appointments':  showAppointments();      break;
    case 'symptomHistory':showSymptomHistory();    break;
    case 'profile':       showProfile();           break;
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function showDashboard() {
  document.getElementById('dashboardSection').classList.remove('hidden');
  document.getElementById('dashName').textContent = currentUser.name.split(' ')[0];
  try {
    const stats = await apiFetch('/appointments/stats/summary');
    const appts = await apiFetch('/appointments');
    const upcoming = appts.filter(a => a.status === 'confirmed' && new Date(a.date) >= new Date());

    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card"><div class="val">${stats.total}</div><div class="lbl">Total Appointments</div></div>
      <div class="stat-card"><div class="val">${stats.upcoming}</div><div class="lbl">Upcoming</div></div>
      <div class="stat-card"><div class="val">${stats.completed}</div><div class="lbl">Completed</div></div>
      <div class="stat-card"><div class="val">${stats.cancelled}</div><div class="lbl">Cancelled</div></div>
      <div class="stat-card"><div class="val">₹${stats.totalSpent}</div><div class="lbl">Total Spent</div></div>
    `;
    document.getElementById('dashUpcoming').innerHTML = upcoming.length
      ? upcoming.map(renderApptCard).join('')
      : '<div class="empty-state">🗓 No upcoming appointments. <a href="#" onclick="openBookModal()" style="color:var(--blue)">Book one now →</a></div>';
  } catch (e) { console.error(e); }
}

// ── Appointments ──────────────────────────────────────────────────────────────
let apptFilter = 'all';
async function showAppointments() {
  document.getElementById('appointmentsSection').classList.remove('hidden');
  try {
    allAppointments = await apiFetch('/appointments');
    renderAppointments();
  } catch (e) { toast('Could not load appointments', 'error'); }
}
function filterAppts(filter, btn) {
  apptFilter = filter;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAppointments();
}
function renderAppointments() {
  let list = allAppointments;
  if (apptFilter === 'confirmed') list = list.filter(a => a.status === 'confirmed' && new Date(a.date) >= new Date());
  else if (apptFilter !== 'all') list = list.filter(a => a.status === apptFilter);
  document.getElementById('apptList').innerHTML = list.length
    ? list.map(renderApptCard).join('')
    : '<div class="empty-state">No appointments found.</div>';
}
function renderApptCard(a) {
  const statusClass = `status-${a.status}`;
  const statusLabel = a.status === 'confirmed' ? 'Confirmed' : a.status.charAt(0).toUpperCase() + a.status.slice(1);
  const canCancel = a.status === 'confirmed';
  const meetBtn = a.meetingLink && a.status === 'confirmed'
    ? `<a href="${a.meetingLink}" target="_blank" class="btn btn-outline btn-sm">🎥 Join Call</a>` : '';
  const rxBtn = a.prescription
    ? `<button class="btn btn-outline btn-sm" onclick="showPrescription('${a._id}')">💊 Prescription</button>` : '';
  const cancelBtn = canCancel
    ? `<button class="btn btn-danger btn-sm" onclick="cancelAppt('${a._id}')">Cancel</button>` : '';
  return `
    <div class="appt-card" id="appt-${a._id}">
      <div class="appt-avatar" style="background:${a.doctorAvatarColor||'#2563EB'}">${a.doctorAvatar||'?'}</div>
      <div class="appt-info">
        <div class="appt-doc">${a.doctorName}</div>
        <div class="appt-spec">${a.doctorSpecialty}</div>
        <div class="appt-meta">📅 ${formatDate(a.date)} &nbsp;⏰ ${a.time} &nbsp;💰 ₹${a.fee}</div>
        ${a.reason ? `<div class="appt-meta" style="margin-top:4px">📋 ${a.reason}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">
        <span class="appt-status ${statusClass}">${statusLabel}</span>
        <div class="appt-actions">${meetBtn}${rxBtn}${cancelBtn}</div>
      </div>
    </div>`;
}
async function cancelAppt(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    await apiFetch(`/appointments/${id}/cancel`, { method: 'PUT' });
    toast('Appointment cancelled.');
    allAppointments = await apiFetch('/appointments');
    renderAppointments();
  } catch (e) { toast(e.message, 'error'); }
}
async function showPrescription(id) {
  try {
    const a = await apiFetch(`/appointments/${id}`);
    if (!a.prescription) return;
    alert(`💊 Prescription\n\n${a.prescription}\n\n📝 Notes: ${a.notes || 'None'}`);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Symptom History ───────────────────────────────────────────────────────────
async function showSymptomHistory() {
  document.getElementById('symptomHistorySection').classList.remove('hidden');
  try {
    const history = await apiFetch('/symptoms/history');
    document.getElementById('symptomHistoryList').innerHTML = history.length
      ? history.map(s => `
        <div class="sym-card">
          <div class="sym-header">
            <div class="urgency-badge urgency-${s.result.urgency}">${s.result.urgency} Urgency</div>
            <div class="sym-date">${new Date(s.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <div class="sym-text">"${s.symptoms.slice(0, 180)}${s.symptoms.length > 180 ? '…' : ''}"</div>
          <div class="result-chips">
            <div class="result-chip">→ ${s.result.specialty}</div>
            <div class="result-chip">Confidence: ${s.result.confidence}%</div>
          </div>
        </div>`).join('')
      : '<div class="empty-state">No symptom analyses yet. Try the AI Checker!</div>';
  } catch (e) { toast('Could not load history', 'error'); }
}

// ── Profile ───────────────────────────────────────────────────────────────────
async function showProfile() {
  document.getElementById('profileSection').classList.remove('hidden');
  try {
    const user = await apiFetch('/auth/me');
    document.getElementById('profileAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('profileName').value  = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profilePhone').value = user.phone || '';
    document.getElementById('profileDob').value   = user.dob || '';
    document.getElementById('profileGender').value= user.gender || '';
  } catch (e) { toast(e.message, 'error'); }
}
async function saveProfile() {
  try {
    await apiFetch('/auth/profile', { method: 'PUT', body: {
      name:   document.getElementById('profileName').value.trim(),
      phone:  document.getElementById('profilePhone').value.trim(),
      dob:    document.getElementById('profileDob').value,
      gender: document.getElementById('profileGender').value,
    }});
    const msg = document.getElementById('profileMsg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
    // Refresh name in navbar
    const user = await apiFetch('/auth/me');
    currentUser = { ...currentUser, ...user };
    document.getElementById('navAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('dropdownName').textContent = user.name;
  } catch (e) { toast(e.message, 'error'); }
}

// ── Doctors ───────────────────────────────────────────────────────────────────
async function loadDoctors() {
  try {
    const [doctors, specialties] = await Promise.all([
      apiFetch('/doctors'),
      apiFetch('/doctors/specialties'),
    ]);
    allDoctors = doctors;

    // Populate specialty filter
    const sel = document.getElementById('specialtyFilter');
    specialties.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });

    renderDoctors(doctors);
  } catch (e) { console.error(e); }
}

function renderDoctors(doctors) {
  const grid = document.getElementById('doctorsGrid');
  if (!doctors.length) { grid.innerHTML = '<div class="empty-state">No doctors found.</div>'; return; }
  grid.innerHTML = doctors.map(d => `
    <div class="doctor-card fade-in">
      <div class="doc-avatar" style="background:${d.avatarColor}">${d.avatar}</div>
      <div class="doc-name">${d.name}</div>
      <div class="doc-spec">${d.specialty}</div>
      <div class="doc-exp">${d.experience} yrs experience · ${d.qualification}</div>
      <div class="doc-meta">
        <div><div class="stars">${'★'.repeat(Math.floor(d.rating))}${'☆'.repeat(5-Math.floor(d.rating))}</div><div style="font-size:12px;color:var(--gray-400)">${d.rating} · ${d.reviewCount} reviews</div></div>
        <div class="doc-fee">₹${d.fee} <span>/ session</span></div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-outline btn-sm" onclick="viewDoctor('${d._id}')">View Profile</button>
        <button class="btn btn-primary btn-sm" onclick="openBookModal('${d._id}')">Book Now</button>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

function filterDoctors() {
  const search    = document.getElementById('doctorSearch').value.toLowerCase();
  const specialty = document.getElementById('specialtyFilter').value;
  let filtered = allDoctors;
  if (specialty !== 'all') filtered = filtered.filter(d => d.specialty === specialty);
  if (search) filtered = filtered.filter(d => d.name.toLowerCase().includes(search) || d.specialty.toLowerCase().includes(search));
  renderDoctors(filtered);
}

async function viewDoctor(id) {
  try {
    const d = await apiFetch(`/doctors/${id}`);
    document.getElementById('docModalName').textContent = d.name;
    const stars = '★'.repeat(Math.floor(d.rating)) + '☆'.repeat(5 - Math.floor(d.rating));
    document.getElementById('docModalBody').innerHTML = `
      <div class="doc-detail-header">
        <div class="doc-detail-avatar" style="background:${d.avatarColor}">${d.avatar}</div>
        <div>
          <div class="doc-spec" style="font-size:15px">${d.specialty}</div>
          <div style="font-size:13px;color:var(--gray-400);margin-top:4px">${d.experience} years experience · ${d.qualification}</div>
          <div style="margin-top:8px"><span class="stars">${stars}</span> <span style="font-size:13px;color:var(--gray-400)">${d.rating} (${d.reviewCount} reviews)</span></div>
        </div>
      </div>
      <p class="doc-detail-bio">${d.bio}</p>
      <div class="doc-detail-stats">
        <div class="detail-stat"><div class="val">${d.experience}+</div><div class="lbl">Years Exp.</div></div>
        <div class="detail-stat"><div class="val">${d.reviewCount}</div><div class="lbl">Reviews</div></div>
        <div class="detail-stat"><div class="val">₹${d.fee}</div><div class="lbl">Per Session</div></div>
        <div class="detail-stat"><div class="val">${d.rating}</div><div class="lbl">Rating</div></div>
      </div>
      <h4 style="margin-bottom:12px;font-size:16px;color:var(--gray-900)">Patient Reviews</h4>
      <div>${(d.reviews||[]).slice(0,3).map(r => `
        <div style="border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <strong style="font-size:14px;color:var(--gray-900)">${r.patientName}</strong>
            <span style="color:#F59E0B">${'★'.repeat(r.rating)}</span>
          </div>
          <p style="font-size:14px">${r.comment}</p>
        </div>`).join('') || '<p>No reviews yet.</p>'}
      </div>
      <div style="margin-top:20px;display:flex;gap:10px">
        <button class="btn btn-primary" onclick="closeModal('doctorModal');openBookModal('${d._id}')">Book Appointment</button>
        <button class="btn btn-outline" onclick="closeModal('doctorModal')">Close</button>
      </div>`;
    openModal('doctorModal');
  } catch (e) { toast(e.message, 'error'); }
}

// ── AI Symptom Checker ────────────────────────────────────────────────────────
async function analyzeSymptoms() {
  const symptoms = document.getElementById('symptomText').value.trim();
  const age      = document.getElementById('ageSelect').value;
  const gender   = document.getElementById('genderSelect').value;
  if (symptoms.length < 10) {
    document.getElementById('symptomText').style.borderColor = 'var(--red)';
    setTimeout(() => { document.getElementById('symptomText').style.borderColor = ''; }, 2000);
    return toast('Please describe symptoms in more detail.', 'error');
  }
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  document.getElementById('analyzeBtnText').textContent = 'Analyzing...';
  document.getElementById('aiResult').classList.add('hidden');
  try {
    const result = await apiFetch('/symptoms/analyze', { method: 'POST', body: { symptoms, age, gender } });
    symptomResultSpecialty = result.specialty;
    const badge = document.getElementById('urgencyBadge');
    badge.textContent = `${result.urgency === 'HIGH' ? '🚨' : result.urgency === 'MEDIUM' ? '⚠' : '✅'} ${result.urgency} Urgency`;
    badge.className = `urgency-badge urgency-${result.urgency}`;
    document.getElementById('resultChips').innerHTML = `
      <div class="result-chip">→ ${result.specialty}</div>
      <div class="result-chip">Confidence: ${result.confidence}%</div>`;
    document.getElementById('resultAnalysis').textContent = result.analysis;
    document.getElementById('conditionsList').innerHTML = (result.possibleConditions || []).map(c => `<div class="condition-pill">${c}</div>`).join('');
    document.getElementById('aiResult').classList.remove('hidden');
    document.getElementById('aiResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; document.getElementById('analyzeBtnText').textContent = 'Analyze Symptoms'; }
}

function bookFromSymptomResult() {
  if (!symptomResultSpecialty) return;
  // Find matching doctor
  const matched = allDoctors.find(d => d.specialty.toLowerCase().includes(symptomResultSpecialty.toLowerCase()));
  openBookModal(matched ? matched._id : null);
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
async function openBookModal(doctorId = null) {
  // Populate doctor select
  const sel = document.getElementById('bookDoctorSelect');
  sel.innerHTML = '<option value="">Select a doctor...</option>';
  if (!allDoctors.length) {
    try { allDoctors = await apiFetch('/doctors'); } catch {}
  }
  allDoctors.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d._id; opt.textContent = `${d.name} — ${d.specialty} (₹${d.fee})`;
    sel.appendChild(opt);
  });

  if (doctorId) {
    sel.value = doctorId;
    const doc = allDoctors.find(d => d._id === doctorId);
    if (doc) {
      document.getElementById('bookDoctorInfo').innerHTML = `<strong>${doc.name}</strong> · ${doc.specialty}`;
      document.getElementById('bookDoctorInfo').classList.remove('hidden');
      document.getElementById('bookFeeAmt').textContent = `₹${doc.fee}`;
      document.getElementById('bookFeeRow').style.display = 'flex';
    }
  } else {
    document.getElementById('bookDoctorInfo').classList.add('hidden');
    document.getElementById('bookFeeRow').style.display = 'none';
  }

  // Pre-fill if logged in
  if (currentUser) {
    document.getElementById('bookName').value  = currentUser.name || '';
    document.getElementById('bookEmail').value = currentUser.email || '';
  }

  // Set min date
  document.getElementById('bookDate').min = new Date().toISOString().split('T')[0];
  document.getElementById('bookDate').value = '';
  document.getElementById('bookTime').innerHTML = '<option value="">Select date first</option>';

  // Reset states
  document.getElementById('bookFormState').classList.remove('hidden');
  document.getElementById('bookSuccessState').classList.add('hidden');
  document.getElementById('bookError').classList.add('hidden');

  openModal('bookModal');
}

async function loadSlots() {
  const doctorId = document.getElementById('bookDoctorSelect').value;
  const date     = document.getElementById('bookDate').value;
  const feeRow   = document.getElementById('bookFeeRow');

  // Update fee
  if (doctorId) {
    const doc = allDoctors.find(d => d._id === doctorId);
    if (doc) { document.getElementById('bookFeeAmt').textContent = `₹${doc.fee}`; feeRow.style.display = 'flex'; }
  } else { feeRow.style.display = 'none'; }

  if (!doctorId || !date) return;
  try {
    const { slots } = await apiFetch(`/doctors/${doctorId}/slots?date=${date}`);
    const sel = document.getElementById('bookTime');
    sel.innerHTML = slots.length
      ? slots.map(s => `<option value="${s}">${s}</option>`).join('')
      : '<option value="">No slots available for this date</option>';
  } catch (e) { console.error(e); }
}

async function confirmBooking() {
  if (!currentUser) { closeModal('bookModal'); openAuthModal('login'); return; }
  const doctorId = document.getElementById('bookDoctorSelect').value;
  const name     = document.getElementById('bookName').value.trim();
  const email    = document.getElementById('bookEmail').value.trim();
  const date     = document.getElementById('bookDate').value;
  const time     = document.getElementById('bookTime').value;
  const reason   = document.getElementById('bookReason').value.trim();

  if (!doctorId || !name || !email || !date || !time) {
    return showBookError('Please fill in all required fields.');
  }

  const btn = document.getElementById('confirmBookBtn');
  btn.disabled = true; btn.textContent = 'Booking...';
  try {
    const appt = await apiFetch('/appointments', { method: 'POST', body: { doctorId, date, time, reason } });
    document.getElementById('bookFormState').classList.add('hidden');
    document.getElementById('meetingLinkBox').innerHTML = `
      🎥 <strong>Meeting Link:</strong><br>
      <a href="${appt.meetingLink}" target="_blank" style="word-break:break-all">${appt.meetingLink}</a>`;
    document.getElementById('bookSuccessState').classList.remove('hidden');
    toast('Appointment confirmed! 🎉');
    // Refresh doctors to update slot availability
    allDoctors = await apiFetch('/doctors');
  } catch (e) { showBookError(e.message); }
  finally { btn.disabled = false; btn.textContent = 'Confirm & Pay'; }
}

function showBookError(msg) {
  const el = document.getElementById('bookError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.add('hidden');
  document.body.style.overflow = '';
}
function handleOverlayClick(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['authModal','bookModal','doctorModal'].forEach(id => {
      const el = document.getElementById(id);
      if (!el.classList.contains('hidden')) closeModal(id);
    });
  }
});

// ── Date formatter ─────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Check existing session
  const token = getToken();
  if (token) {
    try {
      const user = await apiFetch('/auth/me');
      setLoggedIn(user);
    } catch {
      clearToken();
    }
  }
  loadDoctors();
}

init();
