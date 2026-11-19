// Supabase adapter for the vanilla HTML application.
// This file preserves the old apiCall() response shape so the existing UI can
// use Supabase without a PHP server or a Next.js build step.
(function () {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://ilbddtaqibxauqfenopn.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = window.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_EGPEFH1G7RJrCl072yBUDQ_lmn6JPlf';

  if (!window.supabase?.createClient) {
    window.supabaseApiCall = async function () {
      return { success: false, message: 'Supabase client failed to load. Check your internet connection.', data: null };
    };
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.supabaseClient = client;

  const roleNames = { 1: 'admin', 2: 'organizer', 3: 'participant' };

  function success(data = null, message = 'OK') {
    return { success: true, message, data };
  }

  function failure(error, fallback = 'Supabase request failed.') {
    const message = error?.message || error?.details || fallback;
    return { success: false, message, data: null };
  }

  function related(value) {
    return Array.isArray(value) ? (value[0] || {}) : (value || {});
  }

  function mapProfile(profile, authUser = null) {
    return {
      ...profile,
      user_id: profile.user_id || authUser?.id,
      email: profile.email || authUser?.email || '',
      role_name: profile.role_name || roleNames[profile.role_id] || 'participant',
      is_active: profile.is_active !== false,
    };
  }

  function mapEvent(row) {
    const category = related(row.categories);
    const venue = related(row.venues);
    const organizer = related(row.profiles);
    return {
      ...row,
      category: category.name || '',
      color_hex: category.color_hex || '#6366f1',
      venue: venue.name || '',
      city: venue.city || '',
      organizer: organizer.full_name || '',
      seats_sold: Math.max(0, Number(row.total_seats || 0) - Number(row.available_seats || 0)),
    };
  }

  function mapBooking(row) {
    const profile = related(row.profiles);
    const event = related(row.events);
    const venue = related(event.venues);
    const ticket = related(row.ticket_types);
    return {
      ...row,
      full_name: profile.full_name || '',
      email: profile.email || '',
      event_title: event.title || '',
      event_date: event.event_date || null,
      venue: venue.name || '',
      ticket_type: ticket.type_name || null,
    };
  }

  function mapPayment(row) {
    const booking = related(row.bookings);
    const profile = related(booking.profiles);
    const event = related(booking.events);
    return {
      ...row,
      booking_ref: booking.booking_ref || '',
      num_tickets: booking.num_tickets || 0,
      full_name: profile.full_name || '',
      event_title: event.title || '',
    };
  }

  async function authUser() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async function profileFor(user) {
    if (!user) throw new Error('Please sign in first.');
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Your profile is not ready. Run supabase/schema.sql in the Supabase SQL Editor.');
    return mapProfile(data, user);
  }

  async function requireProfile() {
    return profileFor(await authUser());
  }

  async function getEvents(params = {}) {
    const limit = Math.min(Number(params.limit || 50), 1000);
    const offset = Number(params.offset || 0);
    let query = client
      .from('events')
      .select('*, categories(name, icon, color_hex), venues(name, city), profiles!events_organizer_id_fkey(full_name)', { count: 'exact' })
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    const status = params.status || 'published';
    if (status !== 'all') query = query.eq('status', status);
    if (params.from) query = query.gte('event_date', params.from);
    if (params.to) query = query.lte('event_date', params.to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { events: (data || []).map(mapEvent), total: count ?? (data || []).length, limit, offset };
  }

  async function getVenues() {
    const { data, error } = await client.from('venues').select('*').eq('is_active', true).order('name');
    if (error) throw error;
    return data || [];
  }

  async function getCategories() {
    const { data, error } = await client.from('categories').select('*').order('name');
    if (error) throw error;
    return data || [];
  }

  async function getBookings() {
    const { data, error } = await client
      .from('bookings')
      .select('*, profiles(full_name, email, phone), events(title, event_date, venues(name)), ticket_types(type_name)')
      .order('booked_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapBooking);
  }

  async function getPayments() {
    const { data, error } = await client
      .from('payments')
      .select('*, bookings(booking_ref, num_tickets, profiles(full_name), events(title))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapPayment);
  }

  function sum(items, field, predicate = () => true) {
    return items.filter(predicate).reduce((total, item) => total + Number(item[field] || 0), 0);
  }

  function groupCount(items, field) {
    return Object.entries(items.reduce((groups, item) => {
      const key = item[field] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {})).map(([key, count]) => ({ [field]: key, count }));
  }

  async function getDashboard() {
    // Keep the first screen fast: the full tables are loaded only when their
    // respective pages are opened.
    const [eventsResult, bookingsResult, paymentsResult, profilesResult, categories] = await Promise.all([
      client.from('events')
        .select('event_id, category_id, title, event_date, available_seats, ticket_price, status', { count: 'exact' })
        .order('event_date', { ascending: true })
        .limit(500),
      client.from('bookings')
        .select('booking_id, user_id, booking_ref, total_amount, status, booked_at, num_tickets, profiles(full_name)', { count: 'exact' })
        .order('booked_at', { ascending: false })
        .limit(500),
      client.from('payments')
        .select('amount, status, paid_at')
        .order('paid_at', { ascending: false })
        .limit(1000),
      client.from('profiles').select('user_id, role_id, is_active').limit(1000),
      getCategories(),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const events = eventsResult.data || [];
    const bookings = bookingsResult.data || [];
    const payments = paymentsResult.data || [];
    const completedPayments = payments.filter(p => p.status === 'completed');
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const isThisMonth = p => {
      if (!p.paid_at) return false;
      const date = new Date(p.paid_at);
      return date.getMonth() === month && date.getFullYear() === year;
    };
    const today = now.toISOString().slice(0, 10);
    const isToday = p => p.paid_at && String(p.paid_at).slice(0, 10) === today;

    const revenueByMonth = completedPayments.reduce((groups, payment) => {
      if (!payment.paid_at) return groups;
      const date = new Date(payment.paid_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      groups[key] = (groups[key] || 0) + Number(payment.amount || 0);
      return groups;
    }, {});

    const categoryCounts = categories.map(category => ({
      name: category.name,
      count: events.filter(event => Number(event.category_id) === Number(category.category_id)).length,
    })).sort((a, b) => b.count - a.count);

    const upcoming = events
      .filter(event => event.status === 'published' && event.event_date >= today)
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
      .slice(0, 5);

    return {
      stats: {
        total_events: eventsResult.count ?? events.length,
        published_events: events.filter(e => e.status === 'published').length,
        total_users: profilesResult.data?.length || 0,
        total_participants: (profilesResult.data || []).filter(p => Number(p.role_id) === 3).length,
        total_bookings: bookingsResult.count ?? bookings.length,
        confirmed_bookings: bookings.filter(b => b.status === 'confirmed').length,
        total_revenue: sum(completedPayments, 'amount'),
        monthly_revenue: sum(completedPayments, 'amount', isThisMonth),
      },
      upcoming,
      recent_bookings: bookings.slice(0, 6).map(booking => ({
        ...booking,
        full_name: related(booking.profiles).full_name || '',
      })),
      revenue_chart: Object.entries(revenueByMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([key, revenue]) => {
        const [y, m] = key.split('-').map(Number);
        return { month: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), revenue };
      }),
      category_chart: categoryCounts,
      revenue_today: sum(completedPayments, 'amount', isToday),
    };
  }

  async function getReports(type = 'overview') {
    const [eventsData, bookings, payments, venues] = await Promise.all([
      getEvents({ status: 'all', limit: 1000 }),
      getBookings(),
      getPayments(),
      getVenues(),
    ]);
    const events = eventsData.events;
    const completed = payments.filter(p => p.status === 'completed');

    if (type === 'revenue') {
      const groups = completed.reduce((result, payment) => {
        if (!payment.paid_at) return result;
        const date = new Date(payment.paid_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        result[key] ||= { transactions: 0, revenue: 0 };
        result[key].transactions += 1;
        result[key].revenue += Number(payment.amount || 0);
        return result;
      }, {});
      return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).slice(0, 12).map(([key, value]) => ({
        month: key,
        ...value,
      }));
    }

    if (type === 'payments') {
      const groups = completed.reduce((result, payment) => {
        result[payment.method] ||= { method: payment.method, count: 0, total: 0 };
        result[payment.method].count += 1;
        result[payment.method].total += Number(payment.amount || 0);
        return result;
      }, {});
      return Object.values(groups);
    }

    if (type === 'top_events') {
      return events.map(event => {
        const eventBookings = bookings.filter(booking => Number(booking.event_id) === Number(event.event_id) && booking.status !== 'cancelled');
        return {
          title: event.title,
          total_bookings: eventBookings.length,
          seats_sold: eventBookings.reduce((total, booking) => total + Number(booking.num_tickets || 0), 0),
          total_revenue: eventBookings.reduce((total, booking) => total + Number(booking.total_amount || 0), 0),
        };
      }).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10);
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const isMonth = payment => payment.paid_at && new Date(payment.paid_at).getMonth() === now.getMonth() && new Date(payment.paid_at).getFullYear() === now.getFullYear();
    const venueCounts = venues.map(venue => ({
      name: venue.name,
      events: events.filter(event => Number(event.venue_id) === Number(venue.venue_id)).length,
    })).sort((a, b) => b.events - a.events);
    return {
      events_by_status: groupCount(events, 'status'),
      bookings_by_status: groupCount(bookings, 'status'),
      revenue_today: sum(completed, 'amount', p => p.paid_at && String(p.paid_at).slice(0, 10) === today),
      revenue_month: sum(completed, 'amount', isMonth),
      top_venue: venueCounts[0] || null,
    };
  }

  async function supabaseApiCall(resource, method = 'GET', body = null, params = {}) {
    try {
      if (resource === 'login' && method === 'POST') {
        const { data, error } = await client.auth.signInWithPassword({ email: body.email, password: body.password });
        if (error) return failure(error);
        const profile = await profileFor(data.user);
        return success(profile, 'Login successful.');
      }

      if (resource === 'register' && method === 'POST') {
        const authOptions = { data: { full_name: body.full_name, phone: body.phone || '' } };
        if (window.SUPABASE_EMAIL_REDIRECT_URL) {
          authOptions.emailRedirectTo = window.SUPABASE_EMAIL_REDIRECT_URL;
        }
        const { data, error } = await client.auth.signUp({
          email: body.email,
          password: body.password,
          options: authOptions,
        });
        if (error) return failure(error);
        const message = data.session
          ? 'Registration successful. You can now sign in.'
          : 'Registration successful. Check your email to confirm your account.';
        return success({ user_id: data.user?.id || null }, message);
      }

      if (resource === 'logout' && method === 'POST') {
        const { error } = await client.auth.signOut();
        if (error) return failure(error);
        return success(null, 'Logged out successfully.');
      }

      if (resource === 'dashboard') return success(await getDashboard(), 'Dashboard data loaded.');
      if (resource === 'events' && method === 'GET') return success(await getEvents(params), 'Events fetched.');
      if (resource === 'categories' && method === 'GET') return success(await getCategories(), 'Categories fetched.');
      if (resource === 'venues' && method === 'GET') return success(await getVenues(), 'Venues fetched.');
      if (resource === 'bookings' && method === 'GET') return success(await getBookings(), 'Bookings fetched.');
      if (resource === 'payments' && method === 'GET') return success(await getPayments(), 'Payments fetched.');
      if (resource === 'reports' && method === 'GET') return success(await getReports(params.type), `Report: ${params.type}`);

      if (resource === 'events' && method === 'POST') {
        const profile = await requireProfile();
        const slugBase = String(body.title || 'event').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = `${slugBase}-${Date.now()}`;
        const { data, error } = await client.from('events').insert({
          organizer_id: profile.user_id,
          category_id: Number(body.category_id),
          venue_id: Number(body.venue_id),
          title: body.title,
          slug,
          description: body.description || '',
          event_date: body.event_date,
          start_time: body.start_time,
          end_time: body.end_time,
          total_seats: Number(body.total_seats),
          available_seats: Number(body.total_seats),
          ticket_price: Number(body.ticket_price || 0),
          status: body.status || 'draft',
        }).select('event_id, slug').single();
        if (error) return failure(error);
        return success(data, 'Event created successfully.');
      }

      if (resource === 'venues' && method === 'POST') {
        const { data, error } = await client.from('venues').insert({
          name: body.name,
          address: body.address || '',
          city: body.city,
          country: body.country || 'Pakistan',
          capacity: Number(body.capacity || 100),
          contact_info: body.contact_info || '',
          facilities: body.facilities || '',
        }).select('venue_id').single();
        if (error) return failure(error);
        return success(data, 'Venue created.');
      }

      if (resource === 'venues' && method === 'DELETE') {
        const { error } = await client.from('venues').update({ is_active: false }).eq('venue_id', Number(params.id));
        if (error) return failure(error);
        return success(null, 'Venue deactivated.');
      }

      if (resource === 'bookings' && method === 'POST') {
        const { data, error } = await client.rpc('create_booking', {
          p_event_id: Number(body.event_id),
          p_num_tickets: Math.max(1, Number(body.num_tickets || 1)),
          p_ticket_type_id: body.ticket_type_id ? Number(body.ticket_type_id) : null,
        });
        if (error) return failure(error);
        return success(data, 'Booking created.');
      }

      if (resource === 'bookings' && method === 'PUT') {
        const { error } = await client.from('bookings').update({ status: body.status }).eq('booking_id', Number(params.id));
        if (error) return failure(error);
        return success(null, 'Booking updated.');
      }

      if (resource === 'users' && method === 'GET') {
        const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) return failure(error);
        const bookings = await getBookings();
        return success((data || []).map(profile => ({
          ...mapProfile(profile),
          total_bookings: bookings.filter(booking => booking.user_id === profile.user_id).length,
        })), 'Users fetched.');
      }

      if (resource === 'users' && method === 'DELETE') {
        const { error } = await client.from('profiles').update({ is_active: false }).eq('user_id', params.id);
        if (error) return failure(error);
        return success(null, 'User deactivated.');
      }

      return failure(new Error(`Unsupported Supabase operation: ${method} ${resource}`));
    } catch (error) {
      return failure(error);
    }
  }

  window.supabaseApiCall = supabaseApiCall;
  window.resendSupabaseConfirmation = async function (email) {
    const options = {};
    if (window.SUPABASE_EMAIL_REDIRECT_URL) {
      options.emailRedirectTo = window.SUPABASE_EMAIL_REDIRECT_URL;
    }
    const { error } = await client.auth.resend({
      type: 'signup',
      email,
      options,
    });
    return error ? failure(error) : success(null, 'Confirmation email sent.');
  };

  window.restoreSupabaseSession = async function () {
    try {
      const user = await authUser();
      return user ? profileFor(user) : null;
    } catch (error) {
      console.warn(error.message || error);
      return null;
    }
  };
}());
