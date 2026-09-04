// ============================================================
//  CONFIG
// ============================================================
const API = window.EVENT_API_URL || 'api.php';   // Set EVENT_API_URL when the API is hosted separately
let currentUser = null;
let currentPage = 'dashboard';
let allEvents   = [];

// ============================================================
//  DEMO MODE — runs without a real PHP backend
//  Set DEMO = false when your backend is ready
// ============================================================
const DEMO = false;

// ============================================================
//  DEMO DATA
// ============================================================
const DEMO_DATA = {
  users: [
    { user_id:1, full_name:'Admin User',  email:'admin@ems.com',         phone:'+92-300-0000001', role_name:'admin',       is_active:1, created_at:'2025-01-01', total_bookings:0 },
    { user_id:2, full_name:'Sara Khan',   email:'sara@ems.com',           phone:'+92-301-1112222', role_name:'organizer',   is_active:1, created_at:'2025-01-15', total_bookings:0 },
    { user_id:4, full_name:'Ahmed Malik', email:'ahmed@student.edu.pk',   phone:'+92-303-5556666', role_name:'participant', is_active:1, created_at:'2025-02-10', total_bookings:2 },
    { user_id:5, full_name:'Fatima Noor', email:'fatima@student.edu.pk',  phone:'+92-304-7778888', role_name:'participant', is_active:1, created_at:'2025-02-20', total_bookings:2 },
    { user_id:6, full_name:'Usman Tariq', email:'usman@student.edu.pk',   phone:'+92-305-9990000', role_name:'participant', is_active:1, created_at:'2025-03-05', total_bookings:1 },
  ],
  events: [
    { event_id:1, title:'National Tech Conference 2025', category:'Conference', category_id:1, color_hex:'#6366f1', venue:'Grand Convention Hall', venue_id:1, city:'Islamabad', event_date:'2025-09-15', start_time:'09:00:00', end_time:'18:00:00', total_seats:500, available_seats:320, ticket_price:2500, status:'published', organizer:'Sara Khan', organizer_id:2, description:'Annual flagship technology conference.', seats_sold:180 },
    { event_id:2, title:'AI & Machine Learning Workshop', category:'Workshop', category_id:2, color_hex:'#f59e0b', venue:'Tech Hub Auditorium', venue_id:3, city:'Karachi', event_date:'2025-08-20', start_time:'10:00:00', end_time:'16:00:00', total_seats:80, available_seats:45, ticket_price:1500, status:'published', organizer:'Sara Khan', organizer_id:2, description:'Hands-on ML workshop.', seats_sold:35 },
    { event_id:3, title:'Startup Networking Night', category:'Networking', category_id:7, color_hex:'#14b8a6', venue:'Expo Center', venue_id:2, city:'Lahore', event_date:'2025-07-10', start_time:'18:00:00', end_time:'22:00:00', total_seats:200, available_seats:150, ticket_price:500, status:'published', organizer:'Ali Raza', organizer_id:3, description:'Connect with founders and investors.', seats_sold:50 },
    { event_id:4, title:'University Hackathon 2025', category:'Hackathon', category_id:8, color_hex:'#f97316', venue:'Tech Hub Auditorium', venue_id:3, city:'Karachi', event_date:'2025-10-05', start_time:'08:00:00', end_time:'20:00:00', total_seats:300, available_seats:210, ticket_price:0, status:'published', organizer:'Ali Raza', organizer_id:3, description:'48-hour coding competition.', seats_sold:90 },
    { event_id:5, title:'Cloud Computing Seminar', category:'Seminar', category_id:6, color_hex:'#8b5cf6', venue:'University Auditorium', venue_id:4, city:'Peshawar', event_date:'2025-07-25', start_time:'09:30:00', end_time:'14:00:00', total_seats:120, available_seats:70, ticket_price:800, status:'draft', organizer:'Sara Khan', organizer_id:2, description:'Deep dive into cloud platforms.', seats_sold:50 },
  ],
  venues: [
    { venue_id:1, name:'Grand Convention Hall', address:'Blue Area, Jinnah Ave', city:'Islamabad', country:'Pakistan', capacity:2000, contact_info:'+92-51-1234567', facilities:'WiFi, Projector, Stage, Parking, Cafeteria' },
    { venue_id:2, name:'Expo Center',           address:'Johar Town',             city:'Lahore',    country:'Pakistan', capacity:5000, contact_info:'+92-42-9876543', facilities:'WiFi, Multiple Halls, Food Court, AC' },
    { venue_id:3, name:'Tech Hub Auditorium',   address:'Gulshan-e-Iqbal',        city:'Karachi',   country:'Pakistan', capacity:800,  contact_info:'+92-21-5556677', facilities:'WiFi, Recording Studio, Green Room' },
    { venue_id:4, name:'University Auditorium', address:'University Road',         city:'Peshawar',  country:'Pakistan', capacity:600,  contact_info:'+92-91-9112233', facilities:'WiFi, AC, Stage, Projector' },
    { venue_id:5, name:'City Arts Center',      address:'Saddar',                  city:'Rawalpindi',country:'Pakistan', capacity:1200, contact_info:'+92-51-4441122', facilities:'Gallery, Stage, Parking' },
  ],
  categories: [
    { category_id:1, name:'Conference', icon:'microphone', color_hex:'#6366f1' },
    { category_id:2, name:'Workshop',   icon:'tool',       color_hex:'#f59e0b' },
    { category_id:3, name:'Concert',    icon:'music',      color_hex:'#ec4899' },
    { category_id:4, name:'Sports',     icon:'trophy',     color_hex:'#10b981' },
    { category_id:5, name:'Exhibition', icon:'image',      color_hex:'#3b82f6' },
    { category_id:6, name:'Seminar',    icon:'book',       color_hex:'#8b5cf6' },
    { category_id:7, name:'Networking', icon:'users',      color_hex:'#14b8a6' },
    { category_id:8, name:'Hackathon',  icon:'code',       color_hex:'#f97316' },
  ],
  bookings: [
    { booking_id:1, booking_ref:'EMS-2025-00001', full_name:'Ahmed Malik', email:'ahmed@student.edu.pk', event_title:'National Tech Conference 2025', event_date:'2025-09-15', ticket_type:'Student', num_tickets:1, total_amount:1000, status:'confirmed', booked_at:'2025-06-01 10:00:00', venue:'Grand Convention Hall' },
    { booking_id:2, booking_ref:'EMS-2025-00002', full_name:'Fatima Noor', email:'fatima@student.edu.pk', event_title:'National Tech Conference 2025', event_date:'2025-09-15', ticket_type:'General', num_tickets:2, total_amount:5000, status:'confirmed', booked_at:'2025-06-02 11:30:00', venue:'Grand Convention Hall' },
    { booking_id:3, booking_ref:'EMS-2025-00003', full_name:'Usman Tariq', email:'usman@student.edu.pk', event_title:'AI & Machine Learning Workshop', event_date:'2025-08-20', ticket_type:'Standard', num_tickets:1, total_amount:1500, status:'confirmed', booked_at:'2025-06-03 14:00:00', venue:'Tech Hub Auditorium' },
    { booking_id:4, booking_ref:'EMS-2025-00004', full_name:'Ahmed Malik', email:'ahmed@student.edu.pk', event_title:'Startup Networking Night', event_date:'2025-07-10', ticket_type:null, num_tickets:1, total_amount:500, status:'pending', booked_at:'2025-06-04 09:00:00', venue:'Expo Center' },
    { booking_id:5, booking_ref:'EMS-2025-00005', full_name:'Fatima Noor', email:'fatima@student.edu.pk', event_title:'University Hackathon 2025', event_date:'2025-10-05', ticket_type:null, num_tickets:1, total_amount:0, status:'confirmed', booked_at:'2025-06-05 16:00:00', venue:'Tech Hub Auditorium' },
  ],
  payments: [
    { payment_id:1, booking_ref:'EMS-2025-00001', full_name:'Ahmed Malik', event_title:'National Tech Conference 2025', amount:1000, method:'easypaisa',     status:'completed', transaction_ref:'EP-78451236', paid_at:'2025-06-01 10:05:00' },
    { payment_id:2, booking_ref:'EMS-2025-00002', full_name:'Fatima Noor', event_title:'National Tech Conference 2025', amount:5000, method:'card',          status:'completed', transaction_ref:'CARD-XY9912',  paid_at:'2025-06-02 11:35:00' },
    { payment_id:3, booking_ref:'EMS-2025-00003', full_name:'Usman Tariq', event_title:'AI & Machine Learning Workshop', amount:1500, method:'bank_transfer', status:'completed', transaction_ref:'BT-44123099',  paid_at:'2025-06-03 14:10:00' },
    { payment_id:4, booking_ref:'EMS-2025-00004', full_name:'Ahmed Malik', event_title:'Startup Networking Night',       amount:500,  method:'jazzcash',      status:'pending',   transaction_ref:null,            paid_at:null },
  ],
  dashboard: {
    stats: { total_events:5, published_events:4, total_users:5, total_participants:3, total_bookings:5, confirmed_bookings:3, total_revenue:7500, monthly_revenue:7500 },
    upcoming: [],
    recent_bookings: [],
    revenue_chart: [
      { month:'Jan 2025', revenue:0 },{ month:'Feb 2025', revenue:1200 },
      { month:'Mar 2025', revenue:3400 },{ month:'Apr 2025', revenue:2100 },
      { month:'May 2025', revenue:5800 },{ month:'Jun 2025', revenue:7500 },
    ],
    category_chart: [
      { name:'Conference', count:1 },{ name:'Workshop', count:1 },
      { name:'Networking', count:1 },{ name:'Hackathon', count:1 },
      { name:'Seminar', count:1 },
    ]
  }
};

// ============================================================
//  API HELPERS
// ============================================================
async function apiCall(resource, method='GET', body=null, params={}) {
  if (DEMO) return demoPatch(resource, method, body, params);

  const url = new URL(API, location.href);
  url.searchParams.set('resource', resource);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));

  const opts = { method, credentials:'include', headers:{'Content-Type':'application/json'} };
  if (body) opts.body = JSON.stringify(body);
  if (location.protocol === 'file:') {
    throw new Error('Open this app through a PHP web server; do not open index.html directly.');
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch (error) {
    throw new Error(`Cannot reach the API at ${url.pathname}. Check that api.php is hosted with the app.`);
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.message || `API request failed (${res.status}).`);
  }
  if (!payload) throw new Error('The API returned an invalid response. Check the PHP server.');
  return payload;
}

// Demo mode response handler
function demoPatch(resource, method, body, params) {
  return new Promise(resolve => {
    setTimeout(() => {
      let data = null, message = 'OK', success = true;
      if (resource === 'login')      { data = { user_id:1, role_id:1, full_name:'Admin User', email:'admin@ems.com' }; }
      else if (resource === 'dashboard')  { data = DEMO_DATA.dashboard; }
      else if (resource === 'events')     { data = { events: DEMO_DATA.events, total: DEMO_DATA.events.length }; }
      else if (resource === 'venues')     { data = DEMO_DATA.venues; }
      else if (resource === 'categories') { data = DEMO_DATA.categories; }
      else if (resource === 'bookings')   { data = DEMO_DATA.bookings; }
      else if (resource === 'payments')   { data = DEMO_DATA.payments; }
      else if (resource === 'users')      { data = DEMO_DATA.users; }
      else if (resource === 'reports')    { data = getDemoReport(params.type); }
      else if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        message = 'Demo mode: action simulated successfully!';
      }
      resolve({ success, message, data });
    }, 300);
  });
}

function getDemoReport(type) {
  if (type === 'top_events')  return DEMO_DATA.events.map(e => ({ title:e.title, total_bookings:Math.floor(Math.random()*50+10), total_revenue:e.ticket_price*30, seats_sold:e.seats_sold }));
  if (type === 'revenue')     return DEMO_DATA.dashboard.revenue_chart.map(r => ({ month:r.month, transactions: Math.floor(r.revenue/1000), revenue:r.revenue }));
  if (type === 'payments')    return [{method:'card',count:2,total:6000},{method:'easypaisa',count:1,total:1000},{method:'jazzcash',count:1,total:500}];
  return { events_by_status:[{status:'published',count:4},{status:'draft',count:1}], bookings_by_status:[{status:'confirmed',count:3},{status:'pending',count:2}], revenue_today:0, revenue_month:7500, top_venue:{name:'Tech Hub Auditorium',events:2} };
}

// ============================================================
//  TOAST
// ============================================================
function toast(msg, type='success') {
  const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type]} ${type}"></i> ${msg}`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ============================================================
//  AUTH
// ============================================================
function switchAuthTab(tab) {
  document.querySelectorAll('.login-tab').forEach((t,i) => t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='register')));
  document.getElementById('loginForm').style.display    = tab==='login'    ? '' : 'none';
  document.getElementById('registerForm').style.display = tab==='register' ? '' : 'none';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { toast('Please enter email and password.', 'warning'); return; }

  try {
    const res = await apiCall('login', 'POST', { email, password: pass });
    if (res.success && res.data) {
      currentUser = res.data;
      initApp();
    } else {
      toast(res.message || 'Login failed.', 'error');
    }
  } catch (error) {
    toast(error.message || 'Unable to connect to the server.', 'error');
  }
}

function initApp() {
  document.getElementById('loginPage').style.display  = 'none';
  document.getElementById('mainApp').style.display    = 'flex';

  const name = currentUser.full_name;
  const roles = { 1:'Administrator', 2:'Organizer', 3:'Participant' };
  document.getElementById('sidebarAvatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('sidebarName').textContent   = name;
  document.getElementById('sidebarRole').textContent   = roles[currentUser.role_id] || 'User';
  document.getElementById('dashName').textContent      = name.split(' ')[0];

  const now = new Date();
  document.getElementById('dashDate').textContent = now.toLocaleDateString('en-US',{ weekday:'long', year:'numeric', month:'long', day:'numeric' });

  loadDashboard();
  loadEventsCount();
}

async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass  = document.getElementById('regPass').value;
  if (!name || !email || !pass) { toast('Name, email and password required.', 'warning'); return; }

  try {
    const res = await apiCall('register', 'POST', { full_name:name, email, phone, password:pass });
    if (res.success) {
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPass').value = '';
      toast('Registered! Please sign in.');
      switchAuthTab('login');
      document.getElementById('loginPass').focus();
    } else {
      toast(res.message || 'Registration failed.', 'error');
    }
  } catch (error) {
    toast(error.message || 'Unable to connect to the server.', 'error');
  }
}

async function doLogout() {
  await apiCall('logout', 'POST');
  currentUser = null;
  document.getElementById('mainApp').style.display   = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  toast('Logged out successfully.');
}

// ============================================================
//  NAVIGATION
// ============================================================
function showPage(name, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  const titles = { dashboard:'Dashboard', events:'Events', venues:'Venues', categories:'Categories', bookings:'Bookings', payments:'Payments', users:'Users', reports:'Reports' };
  document.getElementById('pageTitle').textContent = titles[name] || name;

  currentPage = name;

  const loaders = { events: loadEvents, venues: loadVenues, categories: loadCategories, bookings: loadBookings, payments: loadPayments, users: loadUsers, reports: () => loadReport('overview', document.querySelector('#page-reports .filter-chip')) };
  if (loaders[name]) loaders[name]();
}

function refreshCurrentPage() { showPage(currentPage, null); }

function openAddModal() {
  const modals = { events:'eventModal', venues:'venueModal', bookings:'bookingModal' };
  if (modals[currentPage]) openModal(modals[currentPage]);
}

// ============================================================
//  MODAL
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'eventModal') { populateEventModal(); }
  if (id === 'bookingModal') { populateBookingModal(); }
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ============================================================
//  DASHBOARD
// ============================================================
async function loadDashboard() {
  const res = await apiCall('dashboard');
  if (!res.success) { toast('Failed to load dashboard.', 'error'); return; }

  const d = res.data;
  const s = d.stats;

  document.getElementById('statEvents').textContent          = s.total_events;
  document.getElementById('statEventsPublished').textContent = `${s.published_events} published`;
  document.getElementById('statUsers').textContent           = s.total_users;
  document.getElementById('statParticipants').textContent    = `${s.total_participants} participants`;
  document.getElementById('statBookings').textContent        = s.total_bookings;
  document.getElementById('statConfirmed').textContent       = `${s.confirmed_bookings} confirmed`;
  document.getElementById('statRevenue').textContent         = formatCurrency(s.total_revenue);
  document.getElementById('statMonthRevenue').textContent    = `This month: ${formatCurrency(s.monthly_revenue)}`;

  renderRevenueChart(d.revenue_chart);
  renderDonutChart(d.category_chart);

  const upcoming = d.upcoming.length ? d.upcoming : DEMO_DATA.events.slice(0,4);
  document.getElementById('upcomingEventsTable').innerHTML = upcoming.map(e => `
    <tr>
      <td><span style="font-weight:600;">${e.title}</span></td>
      <td>${formatDate(e.event_date)}</td>
      <td><span style="color:var(--accent);">${e.available_seats}</span></td>
      <td>${e.ticket_price > 0 ? 'PKR '+e.ticket_price : '<span style="color:var(--success);">Free</span>'}</td>
    </tr>
  `).join('');

  const recent = d.recent_bookings.length ? d.recent_bookings : DEMO_DATA.bookings.slice(0,5);
  document.getElementById('recentBookingsTable').innerHTML = recent.map(b => `
    <tr>
      <td><code style="font-size:12px;color:var(--accent);">${b.booking_ref}</code></td>
      <td>${b.full_name}</td>
      <td>${formatCurrency(b.total_amount)}</td>
      <td>${badgeHtml(b.status)}</td>
    </tr>
  `).join('');
}
function renderRevenueChart(data) {
  const box = document.getElementById('revenueChart');
  if (!data || !data.length) { box.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No data</p></div>'; return; }
  const max = Math.max(...data.map(d => parseFloat(d.revenue) || 0), 1);
  box.innerHTML = data.map(d => {
    const pct = Math.max(4, ((parseFloat(d.revenue)||0) / max) * 140);
    return `<div class="chart-bar-wrap">
      <div class="chart-bar" style="height:${pct}px;" title="PKR ${d.revenue}"></div>
      <div class="chart-bar-label">${(d.month||'').substring(0,3)}</div>
    </div>`;
  }).join('');
}

function renderDonutChart(data) {
  if (!data || !data.length) return;
  const canvas = document.getElementById('donutCanvas');
  const ctx    = canvas.getContext('2d');
  const colors = ['#7c6ef5','#e066a0','#29d9b0','#f5a623','#3b82f6','#f97316','#ec4899','#14b8a6'];
  const total  = data.reduce((s,d) => s + (parseInt(d.count)||0), 0) || 1;

  let startAngle = -Math.PI/2;
  ctx.clearRect(0,0,130,130);

  data.forEach((d, i) => {
    const slice = (parseInt(d.count)||0) / total * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(65,65);
    ctx.arc(65,65,55,startAngle,startAngle+slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    startAngle += slice;
  });

  // Hole
  ctx.beginPath();
  ctx.arc(65,65,32,0,Math.PI*2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#111220';
  ctx.fill();

  // Center label
  ctx.fillStyle = '#e8eaf6';
  ctx.font = 'bold 16px Syne, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, 65, 65);

  document.getElementById('donutLegend').innerHTML = data.slice(0,5).map((d,i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i%colors.length]};"></div>
      <span>${d.name} <span style="color:var(--muted);font-size:11px;">(${d.count})</span></span>
    </div>
  `).join('');
}

// ============================================================
//  EVENTS
// ============================================================
async function loadEvents(statusFilter) {
  const params = { status: statusFilter || 'all', limit: 50 };
  if (params.status === 'all') delete params.status;
  const res = await apiCall('events', 'GET', null, params);
  if (!res.success) { toast('Failed to load events.', 'error'); return; }

  allEvents = (res.data?.events) || [];
  document.getElementById('eventsCount').textContent = allEvents.length;
  renderEvents(allEvents);
}

async function loadEventsCount() {
  const res = await apiCall('events', 'GET', null, { limit:1 });
  if (res.success) document.getElementById('eventsCount').textContent = res.data?.total || res.data?.events?.length || '—';
}

function renderEvents(events) {
  const grid = document.getElementById('eventsGrid');
  if (!events.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No events found.</p></div>';
    return;
  }

  const gradients = {
    '#6366f1': 'linear-gradient(135deg,#312e81,#6366f1)',
    '#f59e0b': 'linear-gradient(135deg,#78350f,#f59e0b)',
    '#14b8a6': 'linear-gradient(135deg,#134e4a,#14b8a6)',
    '#f97316': 'linear-gradient(135deg,#7c2d12,#f97316)',
    '#8b5cf6': 'linear-gradient(135deg,#4c1d95,#8b5cf6)',
    '#ec4899': 'linear-gradient(135deg,#831843,#ec4899)',
    '#10b981': 'linear-gradient(135deg,#064e3b,#10b981)',
    '#3b82f6': 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
  };

  const soldPct = e => Math.round(((e.total_seats - e.available_seats) / Math.max(e.total_seats,1)) * 100);

  grid.innerHTML = events.map(e => `
    <div class="event-card">
      <div class="event-banner" style="background:${gradients[e.color_hex]||'linear-gradient(135deg,#312e81,#6366f1)'};">
        <div class="event-category-tag" style="color:${e.color_hex||'#7c6ef5'};">${e.category}</div>
        <div style="position:absolute;top:12px;right:12px;">${badgeHtml(e.status)}</div>
      </div>
      <div class="event-body">
        <div class="event-title">${e.title}</div>
        <div class="event-meta">
          <div class="event-meta-item"><i class="fas fa-calendar"></i>${formatDate(e.event_date)}</div>
          <div class="event-meta-item"><i class="fas fa-clock"></i>${e.start_time?.substring(0,5)} – ${e.end_time?.substring(0,5)}</div>
          <div class="event-meta-item"><i class="fas fa-map-marker-alt"></i>${e.venue}, ${e.city}</div>
          <div class="event-meta-item"><i class="fas fa-chair"></i>${e.available_seats} seats left</div>
        </div>
        <div class="seats-bar">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:5px;">
            <span>${soldPct(e)}% filled</span><span>${e.total_seats - e.available_seats}/${e.total_seats}</span>
          </div>
          <div class="seats-bar-track"><div class="seats-bar-fill" style="width:${soldPct(e)}%;"></div></div>
        </div>
        <div class="event-footer">
          <div class="event-price">
            ${e.ticket_price > 0 ? 'PKR '+Number(e.ticket_price).toLocaleString() : '<span style="color:var(--success);">Free</span>'}
            ${e.ticket_price > 0 ? '<small>/ticket</small>' : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="editEvent(${e.event_id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-primary btn-sm" onclick="bookEvent(${e.event_id})"><i class="fas fa-ticket-alt"></i> Book</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function filterEvents(status, el) {
  document.querySelectorAll('#page-events .filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  if (status === 'all') renderEvents(allEvents);
  else renderEvents(allEvents.filter(e => e.status === status));
}

async function populateEventModal() {
  const [catRes, venueRes] = await Promise.all([apiCall('categories'), apiCall('venues')]);
  const cats   = catRes.data   || [];
  const venues = venueRes.data || [];
  document.getElementById('evCategory').innerHTML = '<option value="">Select category…</option>' + cats.map(c => `<option value="${c.category_id}">${c.name}</option>`).join('');
  document.getElementById('evVenue').innerHTML    = '<option value="">Select venue…</option>'    + venues.map(v => `<option value="${v.venue_id}">${v.name} (${v.city})</option>`).join('');
}

async function submitEvent() {
  const body = {
    title:       document.getElementById('evTitle').value.trim(),
    category_id: document.getElementById('evCategory').value,
    venue_id:    document.getElementById('evVenue').value,
    event_date:  document.getElementById('evDate').value,
    start_time:  document.getElementById('evStart').value,
    end_time:    document.getElementById('evEnd').value,
    total_seats: document.getElementById('evSeats').value,
    ticket_price:document.getElementById('evPrice').value || 0,
    status:      document.getElementById('evStatus').value,
    description: document.getElementById('evDesc').value.trim(),
  };

  if (!body.title || !body.category_id || !body.venue_id || !body.event_date) {
    toast('Please fill all required fields.', 'warning'); return;
  }

  const res = await apiCall('events', 'POST', body);
  if (res.success) {
    toast('Event created successfully!');
    closeModal('eventModal');
    loadEvents();
  } else {
    toast(res.message || 'Failed to create event.', 'error');
  }
}

function editEvent(id) {
  const ev = allEvents.find(e => e.event_id === id);
  if (!ev) return;
  openModal('eventModal');

  setTimeout(() => {
    document.getElementById('evTitle').value  = ev.title;
    document.getElementById('evDate').value   = ev.event_date;
    document.getElementById('evStart').value  = ev.start_time;
    document.getElementById('evEnd').value    = ev.end_time;
    document.getElementById('evSeats').value  = ev.total_seats;
    document.getElementById('evPrice').value  = ev.ticket_price;
    document.getElementById('evStatus').value = ev.status;
    document.getElementById('evDesc').value   = ev.description || '';
  }, 100);
}

function bookEvent(id) {
  openModal('bookingModal');
  document.getElementById('bkEvent').value = id;
}

// ============================================================
//  VENUES
// ============================================================
async function loadVenues() {
  const res = await apiCall('venues');
  if (!res.success) { toast('Failed to load venues.', 'error'); return; }
  const venues = res.data || [];

  document.getElementById('venuesTable').innerHTML = venues.map(v => `
    <tr>
      <td><strong>${v.name}</strong></td>
      <td>${v.city}</td>
      <td>${Number(v.capacity).toLocaleString()}</td>
      <td>${v.contact_info || '—'}</td>
      <td style="max-width:200px;font-size:12px;color:var(--muted);">${v.facilities || '—'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="toast('Edit venue: ${v.name}','warning')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" style="margin-left:4px;" onclick="deleteVenue(${v.venue_id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

async function submitVenue() {
  const body = {
    name: document.getElementById('vnName').value.trim(),
    city: document.getElementById('vnCity').value.trim(),
    capacity: document.getElementById('vnCap').value,
    address:  document.getElementById('vnAddr').value.trim(),
    contact_info: document.getElementById('vnContact').value.trim(),
    country:  document.getElementById('vnCountry').value.trim(),
    facilities: document.getElementById('vnFacilities').value.trim(),
  };

  if (!body.name || !body.city || !body.capacity) {
    toast('Name, city, and capacity are required.', 'warning'); return;
  }

  const res = await apiCall('venues', 'POST', body);
  if (res.success) {
    toast('Venue added!');
    closeModal('venueModal');
    loadVenues();
  } else {
    toast(res.message || 'Failed to add venue.', 'error');
  }
}

async function deleteVenue(id) {
  if (!confirm('Deactivate this venue?')) return;
  const res = await apiCall(`venues`, 'DELETE', null, { id });
  if (res.success) { toast('Venue deactivated.'); loadVenues(); }
  else { toast(res.message, 'error'); }
}
// ============================================================
//  CATEGORIES
// ============================================================
async function loadCategories() {
  const res = await apiCall('categories');
  if (!res.success) return;
  const cats = res.data || [];
  const icons = {
    microphone:'fas fa-microphone',
    tool:'fas fa-tools',
    music:'fas fa-music',
    trophy:'fas fa-trophy',
    image:'fas fa-images',
    book:'fas fa-book',
    users:'fas fa-users',
    code:'fas fa-code',
    tag:'fas fa-tag'
  };

  document.getElementById('categoriesGrid').innerHTML = cats.map(c => `
    <div class="card" style="border-left:4px solid ${c.color_hex};">
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:${c.color_hex}22;display:flex;align-items:center;justify-content:center;color:${c.color_hex};font-size:20px;">
          <i class="${icons[c.icon]||'fas fa-tag'}"></i>
        </div>
        <div>
          <div style="font-weight:700;font-family:var(--font-head);">${c.name}</div>
          <div style="font-size:12px;color:var(--muted);">Category #${c.category_id}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  BOOKINGS
// ============================================================
async function loadBookings() {
  const res = await apiCall('bookings');
  if (!res.success) { toast('Failed to load bookings.', 'error'); return; }

  const bookings = res.data || [];

  document.getElementById('bookingsTable').innerHTML = bookings.map(b => `
    <tr>
      <td><code style="color:var(--accent);font-size:12px;">${b.booking_ref}</code></td>
      <td>
        <div style="font-weight:600;">${b.full_name}</div>
        <div style="font-size:12px;color:var(--muted);">${b.email}</div>
      </td>
      <td>
        <div>${b.event_title}</div>
        <div style="font-size:12px;color:var(--muted);">${formatDate(b.event_date)}</div>
      </td>
      <td>${b.num_tickets} × ${b.ticket_type || 'General'}</td>
      <td><strong>${formatCurrency(b.total_amount)}</strong></td>
      <td>${badgeHtml(b.status)}</td>
      <td style="font-size:12px;color:var(--muted);">${formatDateTime(b.booked_at)}</td>
      <td>
        <select class="form-control" style="padding:5px 8px;font-size:12px;width:120px;" onchange="updateBookingStatus(${b.booking_id},this.value)">
          ${['pending','confirmed','cancelled','attended'].map(s => `<option value="${s}" ${b.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

async function populateBookingModal() {
  const res = await apiCall('events', 'GET', null, { status:'published', limit:50 });
  const events = res.data?.events || DEMO_DATA.events;

  document.getElementById('bkEvent').innerHTML =
    '<option value="">Choose an event…</option>' +
    events.map(e => `<option value="${e.event_id}">${e.title} (${formatDate(e.event_date)})</option>`).join('');
}

async function submitBooking() {
  const eventId = document.getElementById('bkEvent').value;
  const num     = document.getElementById('bkNum').value;
  const method  = document.getElementById('bkMethod').value;

  if (!eventId) {
    toast('Please select an event.', 'warning');
    return;
  }

  const res = await apiCall('bookings', 'POST', {
    event_id: eventId,
    num_tickets: num
  });

  if (res.success) {
    toast(`Booking created! Ref: ${res.data?.booking_ref||'—'}`);
    closeModal('bookingModal');
    loadBookings();
  } else {
    toast(res.message || 'Booking failed.', 'error');
  }
}

async function updateBookingStatus(id, status) {
  const res = await apiCall('bookings', 'PUT', { status }, { id });
  toast(
    res.success ? 'Status updated.' : (res.message||'Update failed.'),
    res.success ? 'success' : 'error'
  );
}

// ============================================================
//  PAYMENTS
// ============================================================
async function loadPayments() {
  const res = await apiCall('payments');
  if (!res.success) { toast('Failed to load payments.', 'error'); return; }

  const payments = res.data || [];

  document.getElementById('paymentsTable').innerHTML = payments.map(p => `
    <tr>
      <td><code style="color:var(--accent);font-size:12px;">${p.booking_ref}</code></td>
      <td>${p.full_name}</td>
      <td style="font-size:13px;">${p.event_title}</td>
      <td><strong>${formatCurrency(p.amount)}</strong></td>
      <td><span class="badge" style="background:rgba(124,110,245,0.1);color:var(--accent);">${p.method?.replace('_',' ')}</span></td>
      <td>${badgeHtml(p.status)}</td>
      <td style="font-size:12px;color:var(--muted);">${p.paid_at ? formatDateTime(p.paid_at) : '—'}</td>
    </tr>
  `).join('');
}

// ============================================================
//  USERS
// ============================================================
async function loadUsers() {
  const res = await apiCall('users');
  if (!res.success) { toast('Failed to load users.', 'error'); return; }

  const users = res.data || [];

  document.getElementById('usersTable').innerHTML = users.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${u.full_name.charAt(0)}</div>
          <strong>${u.full_name}</strong>
        </div>
      </td>
      <td style="font-size:13px;">${u.email}</td>
      <td style="font-size:13px;color:var(--muted);">${u.phone||'—'}</td>
      <td><span class="badge badge-${u.role_name==='admin'?'published':u.role_name==='organizer'?'attended':'confirmed'}">${u.role_name}</span></td>
      <td style="text-align:center;">${u.total_bookings}</td>
      <td>${u.is_active ? '<span class="badge badge-published">Active</span>' : '<span class="badge badge-cancelled">Inactive</span>'}</td>
      <td style="font-size:12px;color:var(--muted);">${formatDate(u.created_at)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deactivateUser(${u.user_id})"><i class="fas fa-ban"></i></button>
      </td>
    </tr>
  `).join('');
}

async function deactivateUser(id) {
  if (!confirm('Deactivate this user?')) return;

  const res = await apiCall('users', 'DELETE', null, { id });

  toast(
    res.success ? 'User deactivated.' : (res.message||'Failed.'),
    res.success ? 'success' : 'error'
  );

  if (res.success) loadUsers();
}

// ============================================================
//  REPORTS
// ============================================================
async function loadReport(type, el) {
  if (el) {
    document.querySelectorAll('#page-reports .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  }

  const res = await apiCall('reports', 'GET', null, { type });
  const data = res.data;
  const box  = document.getElementById('reportsContent');

  if (type === 'overview') {
    box.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-chart-pie"></i></div>
          <div class="stat-value">PKR ${formatCurrency(data.revenue_month)}</div>
          <div class="stat-label">This Month Revenue</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-building"></i></div>
          <div class="stat-value">${data.top_venue?.name||'—'}</div>
          <div class="stat-label">Top Venue</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-rupee-sign"></i></div>
          <div class="stat-value">PKR ${formatCurrency(data.revenue_today)}</div>
          <div class="stat-label">Revenue Today</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:20px;">
        <div class="table-wrapper">
          <div class="table-header">
            <span class="table-title">Bookings by Status</span>
          </div>
          <table>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              ${(data.bookings_by_status||[]).map(r=>`
                <tr>
                  <td>${badgeHtml(r.status)}</td>
                  <td>${r.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="table-wrapper">
          <div class="table-header">
            <span class="table-title">Events by Status</span>
          </div>
          <table>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              ${(data.events_by_status||[]).map(r=>`
                <tr>
                  <td>${badgeHtml(r.status)}</td>
                  <td>${r.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  else if (type === 'top_events') {
    box.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Bookings</th>
              <th>Seats Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${(data||[]).map(e=>`
              <tr>
                <td><strong>${e.title}</strong></td>
                <td>${e.total_bookings}</td>
                <td>${e.seats_sold}</td>
                <td>${formatCurrency(e.total_revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  else if (type === 'revenue') {
    box.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Transactions</th>
              <th>Revenue (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${(data||[]).map(r=>`
              <tr>
                <td>${r.month}</td>
                <td>${r.transactions}</td>
                <td><strong>${formatCurrency(r.revenue)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  else if (type === 'payments') {
    box.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Payment Method</th>
              <th>Transactions</th>
              <th>Total Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${(data||[]).map(r=>`
              <tr>
                <td>
                  <span class="badge badge-confirmed">${r.method?.replace('_',' ')}</span>
                </td>
                <td>${r.count}</td>
                <td><strong>${formatCurrency(r.total)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }
}

// ============================================================
//  SEARCH
// ============================================================
let searchTimer;

function handleGlobalSearch(val) {
  clearTimeout(searchTimer);
  if (!val.trim()) return;

  searchTimer = setTimeout(async () => {
    if (currentPage === 'events') {
      const filtered = allEvents.filter(
        e =>
          e.title.toLowerCase().includes(val.toLowerCase()) ||
          (e.category||'').toLowerCase().includes(val.toLowerCase())
      );

      renderEvents(filtered);
    }
  }, 300);
}

// ============================================================
//  HELPERS
// ============================================================
function formatCurrency(v) {
  const n = parseFloat(v) || 0;
  if (n === 0) return '0';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(
    'en-GB',
    { day:'2-digit', month:'short', year:'numeric' }
  );
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(
    'en-GB',
    { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }
  );
}

function badgeHtml(status) {
  if (!status) return '';
  return `<span class="badge badge-${status}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>`;
}

// ============================================================
//  INIT — demo auto-login
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  if (DEMO) {
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value  = '';
  }

  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString(
      'en-US',
      {
        weekday:'long',
        year:'numeric',
        month:'long',
        day:'numeric'
      }
    );
});
