'use client';
import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://bnzbaywpfzfochqurqte.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuemJheXdwZnpmb2NocXVycXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTU0MTYsImV4cCI6MjA4NDg5MTQxNn0._d0wNc0kzacLHAUYT1Iafx4LeKjrQA8NGhXScz4xu60';

const supabaseFetch = async (endpoint, options = {}) => {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json();
    return { data, error: res.ok ? null : data };
  } catch (e) {
    return { data: null, error: e.message };
  }
};

const db = {
  users: {
    getAll: (orgId) => supabaseFetch(`users?organization_id=eq.${orgId}&select=*`),
    getByEmail: (email) => supabaseFetch(`users?email=eq.${email.toLowerCase().trim()}&select=*`),
    create: (user) => supabaseFetch('users', { method: 'POST', body: [user] }),
  },
  orgs: {
    create: (org) => supabaseFetch('organizations', { method: 'POST', body: [org] }),
    getById: (id) => supabaseFetch(`organizations?id=eq.${id}&select=*`),
  },
  invites: {
    getByCode: (code) => supabaseFetch(`invites?code=eq.${code}&is_active=eq.true&select=*`),
    create: (invite) => supabaseFetch('invites', { method: 'POST', body: [invite] }),
    use: (code, userId) => supabaseFetch(`invites?code=eq.${code}`, {
      method: 'PATCH',
      body: { used_by: userId, used_at: new Date().toISOString(), is_active: false }
    }),
    getByOrg: (orgId) => supabaseFetch(`invites?organization_id=eq.${orgId}&select=*`),
  },
  kpis: {
    getByOrg: (orgId, userIds) => supabaseFetch(`daily_kpis?user_id=in.(${userIds.join(',')})&select=*`),
    upsert: (kpi) => supabaseFetch('daily_kpis?on_conflict=user_id,date', {
      method: 'POST',
      body: [kpi],
      prefer: 'return=representation,resolution=merge-duplicates'
    }),
  },
  pendingOffers: {
    getByName: (name) => supabaseFetch(`pending_offers?rep_name=ilike.${encodeURIComponent(name)}&select=*`),
    delete: (name) => supabaseFetch(`pending_offers?rep_name=ilike.${encodeURIComponent(name)}`, {
      method: 'DELETE'
    }),
  }
};

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code.slice(0, 4) + '-' + code.slice(4);
};

// Import pending offers from Google Sheet when a new user signs up
const importPendingOffers = async (userId, userName) => {
  try {
    // Get all pending offers for this user name (case-insensitive)
    const { data: pendingOffers } = await db.pendingOffers.getByName(userName);
    
    if (!pendingOffers || pendingOffers.length === 0) {
      console.log(`No pending offers found for ${userName}`);
      return 0;
    }
    
    console.log(`Found ${pendingOffers.length} pending offer records for ${userName}`);
    
    // Import each pending offer into daily_kpis
    for (const pending of pendingOffers) {
      await db.kpis.upsert({
        user_id: userId,
        date: pending.date,
        offers: pending.offer_count,
        new_agents: 0,
        follow_ups: 0,
        phone_calls: 0,
        deals_under_contract: 0,
        deals_closed: 0,
        notes: ''
      });
      console.log(`Imported ${pending.offer_count} offers for ${pending.date}`);
    }
    
    // Delete the pending records (they're now in daily_kpis)
    await db.pendingOffers.delete(userName);
    console.log(`Deleted pending offers for ${userName}`);
    
    return pendingOffers.length;
  } catch (error) {
    console.error('Error importing pending offers:', error);
    return 0;
  }
};

export default function MomentumApp() {
  const [view, setView] = useState('loading');
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamKPIs, setTeamKPIs] = useState({});
  const [invites, setInvites] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirm: '', inviteCode: '', orgName: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState('');
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState('personal');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('week');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('daily');
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    checkSession();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // FIX: Load team data on login only, no auto-refresh interval
  useEffect(() => {
    if (currentUser && organization) {
      loadTeamData();
      // REMOVED: Auto-refresh interval that was causing the bug
    }
  }, [currentUser, organization]);

  // FIX: Refresh data when switching to team/analytics/history tabs (not personal)
  useEffect(() => {
    if (currentUser && organization && currentTab !== 'personal') {
      loadTeamData();
    }
  }, [currentTab]);

  const checkSession = async () => {
    const saved = localStorage.getItem('momentum_user');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      if (user.organization_id) {
        const { data: orgs } = await db.orgs.getById(user.organization_id);
        if (orgs?.[0]) setOrganization(orgs[0]);
      }
      setView('dashboard');
    } else {
      setView('auth');
    }
  };

  const loadTeamData = async () => {
    if (!organization) return;

    const { data: users } = await db.users.getAll(organization.id);
    if (users) {
      setTeamMembers(users);
      const userIds = users.map(u => u.id);
      if (userIds.length > 0) {
        const { data: kpis } = await db.kpis.getByOrg(organization.id, userIds);
        if (kpis) {
          const grouped = {};
          kpis.forEach(k => {
            if (!grouped[k.user_id]) grouped[k.user_id] = {};
            grouped[k.user_id][k.date] = k;
          });
          setTeamKPIs(grouped);
        }
      }
    }
    const { data: inviteList } = await db.invites.getByOrg(organization.id);
    if (inviteList) setInvites(inviteList);
  };

  const handleOwnerSignup = async () => {
    setError('');
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.orgName) {
      setError('Please fill in all fields');
      return;
    }
    if (signupForm.password !== signupForm.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const { data: existing } = await db.users.getByEmail(signupForm.email);
    if (existing?.length > 0) {
      setError('Email already registered');
      return;
    }
    const { data: orgData, error: orgError } = await db.orgs.create({ name: signupForm.orgName });
    if (orgError || !orgData?.[0]) {
      setError('Failed to create organization');
      return;
    }
    const org = orgData[0];
    const { data: userData, error: userError } = await db.users.create({
      name: signupForm.name,
      email: signupForm.email.toLowerCase().trim(),
      password_hash: signupForm.password,
      role: 'owner',
      organization_id: org.id
    });
    if (userError || !userData?.[0]) {
      setError('Failed to create account');
      return;
    }
    const user = userData[0];
    
    // Import any pending offers from Google Sheet for this user
    await importPendingOffers(user.id, user.name);
    
    localStorage.setItem('momentum_user', JSON.stringify(user));
    setCurrentUser(user);
    setOrganization(org);
    setView('dashboard');
  };

  const handleMemberSignup = async () => {
    setError('');
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.inviteCode) {
      setError('Please fill in all fields including invite code');
      return;
    }
    if (signupForm.password !== signupForm.confirm) {
      setError('Passwords do not match');
      return;
    }
    const { data: inviteData } = await db.invites.getByCode(signupForm.inviteCode.toUpperCase());
    if (!inviteData?.[0]) {
      setError('Invalid or expired invite code');
      return;
    }
    const invite = inviteData[0];
    const { data: existing } = await db.users.getByEmail(signupForm.email);
    if (existing?.length > 0) {
      setError('Email already registered');
      return;
    }
    const { data: userData, error: userError } = await db.users.create({
      name: signupForm.name,
      email: signupForm.email.toLowerCase().trim(),
      password_hash: signupForm.password,
      role: 'member',
      organization_id: invite.organization_id
    });
    if (userError || !userData?.[0]) {
      setError('Failed to create account');
      return;
    }
    const user = userData[0];
    await db.invites.use(invite.code, user.id);
    
    // Import any pending offers from Google Sheet for this user
    await importPendingOffers(user.id, user.name);
    
    const { data: orgs } = await db.orgs.getById(invite.organization_id);
    localStorage.setItem('momentum_user', JSON.stringify(user));
    setCurrentUser(user);
    setOrganization(orgs?.[0] || null);
    setView('dashboard');
  };

  const handleLogin = async () => {
    setError('');
    const { data: users } = await db.users.getByEmail(loginForm.email);
    const user = users?.find(u => u.password_hash === loginForm.password);
    if (!user) {
      setError('Invalid email or password');
      return;
    }
    const { data: orgs } = await db.orgs.getById(user.organization_id);
    localStorage.setItem('momentum_user', JSON.stringify(user));
    setCurrentUser(user);
    setOrganization(orgs?.[0] || null);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('momentum_user');
    setCurrentUser(null);
    setOrganization(null);
    setTeamMembers([]);
    setTeamKPIs({});
    setView('auth');
  };

  const handleForgotPassword = async () => {
    setError('');
    setRecoveredPassword('');
    if (!forgotEmail) {
      setError('Please enter your email');
      return;
    }
    const { data: users } = await db.users.getByEmail(forgotEmail.toLowerCase().trim());
    if (!users || users.length === 0) {
      setError('No account found with that email');
      return;
    }
    setRecoveredPassword(users[0].password_hash);
  };

  const generateInvite = async () => {
    const code = generateInviteCode();
    await db.invites.create({
      code,
      organization_id: organization.id,
      created_by: currentUser.id
    });
    loadTeamData();
  };

  const getMyKPI = () => teamKPIs[currentUser?.id]?.[today] || {
    offers: 0,
    new_agents: 0,
    follow_ups: 0,
    phone_calls: 0,
    deals_under_contract: 0,
    deals_closed: 0,
    notes: ''
  };

  const updateKPI = async (field, value) => {
    const current = getMyKPI();
    const newValue = typeof value === 'string' ? value : Math.max(0, value);
    
    const updated = {
      ...current,
      [field]: newValue,
      user_id: currentUser.id,
      date: today
    };

    // Optimistic UI update
    setTeamKPIs(prev => ({
      ...prev,
      [currentUser.id]: {
        ...prev[currentUser.id],
        [today]: updated
      }
    }));

    // Save to database
    const { data, error } = await db.kpis.upsert({
      user_id: currentUser.id,
      date: today,
      offers: updated.offers || 0,
      new_agents: updated.new_agents || 0,
      follow_ups: updated.follow_ups || 0,
      phone_calls: updated.phone_calls || 0,
      deals_under_contract: updated.deals_under_contract || 0,
      deals_closed: updated.deals_closed || 0,
      notes: updated.notes || ''
    });

    // Log for debugging
    if (error) {
      console.error('KPI save failed:', error);
    } else {
      console.log('KPI saved successfully:', data);
    }
  };

  const getStats = (userId, period) => {
    const userKPIs = teamKPIs[userId] || {};
    const now = new Date();
    
    let startDate, endDate;
    
    if (period === 'week') {
      // Current week (Sunday to Saturday)
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (period === 'month') {
      // Current calendar month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'quarter') {
      // Current quarter
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    } else {
      // Default: today only
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
    }
    
    return Object.entries(userKPIs).reduce((acc, [date, kpi]) => {
      const kpiDate = new Date(date);
      if (kpiDate >= startDate && kpiDate <= endDate) {
        return {
          offers: acc.offers + (kpi.offers || 0),
          texts: acc.texts + (kpi.new_agents || 0) + (kpi.follow_ups || 0),
          calls: acc.calls + (kpi.phone_calls || 0),
          contracts: acc.contracts + (kpi.deals_under_contract || 0),
          closed: acc.closed + (kpi.deals_closed || 0)
        };
      }
      return acc;
    }, { offers: 0, texts: 0, calls: 0, contracts: 0, closed: 0 });
  };

  const getTeamTotals = (period) => {
    // Map analytics period names to getStats period names
    const statsPeriod = period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : period === 'quarterly' ? 'quarter' : period;
    
    return teamMembers.reduce((t, user) => {
      const kpi = period === 'daily' ? (teamKPIs[user.id]?.[today] || {}) : getStats(user.id, statsPeriod);
      const s = period === 'daily' ? {
        offers: kpi.offers || 0,
        texts: (kpi.new_agents || 0) + (kpi.follow_ups || 0),
        calls: kpi.phone_calls || 0,
        contracts: kpi.deals_under_contract || 0,
        closed: kpi.deals_closed || 0
      } : kpi;
      return {
        offers: t.offers + s.offers,
        texts: t.texts + s.texts,
        calls: t.calls + s.calls,
        contracts: t.contracts + s.contracts,
        closed: t.closed + s.closed
      };
    }, { offers: 0, texts: 0, calls: 0, contracts: 0, closed: 0 });
  };

  const getLeaderboard = () => {
    const period = leaderboardPeriod === 'week' ? 'week' : 'month';
    return teamMembers.map(user => {
      const s = getStats(user.id, period);
      return {
        user,
        stats: s,
        score: s.offers + s.texts + s.calls + s.contracts * 10 + s.closed * 20
      };
    }).sort((a, b) => b.score - a.score);
  };

  const exportCSV = () => {
    let csv = 'Member,Date,Offers,New Agents,Follow Ups,Calls,Deals UC,Deals Closed,Notes\n';
    teamMembers.forEach(user => {
      Object.entries(teamKPIs[user.id] || {}).forEach(([date, k]) => {
        csv += `"${user.name}","${date}",${k.offers || 0},${k.new_agents || 0},${k.follow_ups || 0},${k.phone_calls || 0},${k.deals_under_contract || 0},${k.deals_closed || 0},"${(k.notes || '').replace(/"/g, '""')}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `momentum-${today}.csv`;
    a.click();
  };

  const copySummary = () => {
    const t = getTeamTotals('daily');
    let s = `⚡ MOMENTUM - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n`;
    s += `TEAM: ${t.offers} offers | ${t.texts} texts | ${t.calls} calls\n\n`;
    teamMembers.forEach(u => {
      const k = teamKPIs[u.id]?.[today] || {};
      s += `${u.name}: ${k.offers || 0} offers, ${(k.new_agents || 0) + (k.follow_ups || 0)} texts, ${k.phone_calls || 0} calls\n`;
    });
    navigator.clipboard.writeText(s);
    alert('Copied!');
  };

  const myKPI = getMyKPI();
  const totalTexts = (myKPI.new_agents || 0) + (myKPI.follow_ups || 0);
  const weeklyStats = getStats(currentUser?.id, 'week');
  const monthlyStats = getStats(currentUser?.id, 'month');

  const pct = (c, g) => Math.min((c / g) * 100, 100);
  const pColor = (c, g) => pct(c, g) >= 100 ? 'bg-green-500' : pct(c, g) >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  const getMotivation = () => {
    const h = currentTime.getHours();
    if ((myKPI.offers || 0) >= 20 && totalTexts >= 800) return "🔥 CRUSHING IT!";
    if (h < 10) return "☀️ Morning grind!";
    if (h < 14) return "💪 Keep pushing!";
    if (h < 18) return "🎯 Finish strong!";
    return "🌙 Lock it in!";
  };

  // LOADING
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">⚡ Loading...</div>
      </div>
    );
  }

  // AUTH SCREEN
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚡</div>
            <h1 className="text-4xl font-bold text-white mb-2">Momentum</h1>
            <p className="text-slate-400 text-sm">Track. Compete. Dominate.</p>
          </div>

          <div className="flex gap-1 mb-6 bg-slate-700 p-1 rounded-lg">
            <button onClick={() => { setAuthMode('login'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Login</button>
            <button onClick={() => { setAuthMode('owner'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === 'owner' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>New Team</button>
            <button onClick={() => { setAuthMode('member'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === 'member' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Join Team</button>
          </div>

          {error && <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

          {authMode === 'login' && (
            <div className="space-y-4">
              <input type="email" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">Login</button>
              <button onClick={() => { setAuthMode('forgot'); setError(''); setRecoveredPassword(''); }} className="w-full text-slate-400 hover:text-white text-sm transition">Forgot Password?</button>
            </div>
          )}

          {authMode === 'owner' && (
            <div className="space-y-4">
              <input type="text" placeholder="Organization Name" value={signupForm.orgName} onChange={e => setSignupForm({ ...signupForm, orgName: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="text" placeholder="Your Name" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="email" placeholder="Email" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="password" placeholder="Password" value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="password" placeholder="Confirm Password" value={signupForm.confirm} onChange={e => setSignupForm({ ...signupForm, confirm: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <button onClick={handleOwnerSignup} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition">Create Team</button>
            </div>
          )}

          {authMode === 'member' && (
            <div className="space-y-4">
              <input type="text" placeholder="Invite Code (e.g. ABCD-1234)" value={signupForm.inviteCode} onChange={e => setSignupForm({ ...signupForm, inviteCode: e.target.value.toUpperCase() })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none font-mono text-center text-lg tracking-widest" />
              <input type="text" placeholder="Your Name" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="email" placeholder="Email" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="password" placeholder="Password" value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="password" placeholder="Confirm Password" value={signupForm.confirm} onChange={e => setSignupForm({ ...signupForm, confirm: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <button onClick={handleMemberSignup} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition">Join Team</button>
            </div>
          )}

          {authMode === 'forgot' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm text-center">Enter your email to recover your password</p>
              <input type="email" placeholder="Email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <button onClick={handleForgotPassword} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">Recover Password</button>
              {recoveredPassword && (
                <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                  <p className="text-green-400 text-sm mb-2">Your password is:</p>
                  <code className="text-white text-lg font-mono bg-slate-700 px-3 py-2 rounded block text-center">{recoveredPassword}</code>
                </div>
              )}
              <button onClick={() => { setAuthMode('login'); setError(''); setRecoveredPassword(''); setForgotEmail(''); }} className="w-full text-slate-400 hover:text-white text-sm transition">← Back to Login</button>
            </div>
          )}

          <p className="text-slate-600 text-center text-xs mt-6">Powered by AI Coastal Bridge</p>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚡</span>
              <div>
                <h1 className="text-xl font-bold text-white">{organization?.name || 'Momentum'}</h1>
                <p className="text-slate-400 text-xs">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              <p className="text-green-400 text-sm">{getMotivation()}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white font-semibold">{currentUser?.name}</p>
                <p className="text-slate-400 text-xs">{currentUser?.role === 'owner' ? '👑 Owner' : '👤 Member'}</p>
              </div>
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm">Logout</button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {['personal', 'team', 'analytics', 'history'].map(tab => (
              <button key={tab} onClick={() => setCurrentTab(tab)} className={`px-4 py-2 rounded-lg font-semibold transition ${currentTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            {currentUser?.role === 'owner' && (
              <button onClick={() => setCurrentTab('admin')} className={`px-4 py-2 rounded-lg font-semibold transition ${currentTab === 'admin' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Admin</button>
            )}
          </div>
        </div>

        {/* PERSONAL TAB */}
        {currentTab === 'personal' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <p className="text-white font-bold text-xl">👤 {currentUser?.name}</p>
              <p className="text-slate-400 text-sm">Your daily KPIs</p>
            </div>

            {[
              { label: 'Offers Submitted', field: 'offers', goal: 20, inc: [1, 5] },
              { label: 'Phone Conversations', field: 'phone_calls', goal: 20, inc: [1, 5] },
            ].map(({ label, field, goal, inc }) => (
              <div key={field} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-bold">{label}</span>
                  <span className="text-white text-2xl font-bold">{myKPI[field] || 0}/{goal}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
                  <div className={`h-3 rounded-full ${pColor(myKPI[field] || 0, goal)}`} style={{ width: `${pct(myKPI[field] || 0, goal)}%` }}></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateKPI(field, (myKPI[field] || 0) - 1)} className="flex-1 bg-slate-600 text-white py-2 rounded">-1</button>
                  {inc.map(i => (
                    <button key={i} onClick={() => updateKPI(field, (myKPI[field] || 0) + i)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded">+{i}</button>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">Agent Texts</span>
                <span className="text-white text-2xl font-bold">{totalTexts}/800</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
                <div className={`h-3 rounded-full ${pColor(totalTexts, 800)}`} style={{ width: `${pct(totalTexts, 800)}%` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'New Agents', field: 'new_agents', goal: 300 }, { label: 'Follow-ups', field: 'follow_ups', goal: 500 }].map(({ label, field, goal }) => (
                  <div key={field} className="bg-slate-700 rounded p-3">
                    <p className="text-slate-400 text-xs">{label}: {myKPI[field] || 0}/{goal}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => updateKPI(field, (myKPI[field] || 0) - 10)} className="flex-1 bg-slate-600 text-white py-1 rounded text-sm">-10</button>
                      <button onClick={() => updateKPI(field, (myKPI[field] || 0) + 10)} className="flex-1 bg-green-600 text-white py-1 rounded text-sm">+10</button>
                      <button onClick={() => updateKPI(field, (myKPI[field] || 0) + 50)} className="flex-1 bg-green-700 text-white py-1 rounded text-sm">+50</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-white font-bold">Deals Under Contract</p>
                <p className="text-xs text-slate-400 mb-1">Weekly Goal: 2</p>
                <p className="text-3xl font-bold text-purple-400">{weeklyStats.contracts}/2</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => updateKPI('deals_under_contract', (myKPI.deals_under_contract || 0) - 1)} className="flex-1 bg-slate-600 text-white py-2 rounded">-1</button>
                  <button onClick={() => updateKPI('deals_under_contract', (myKPI.deals_under_contract || 0) + 1)} className="flex-1 bg-purple-600 text-white py-2 rounded">+1</button>
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-white font-bold">Deals Closed</p>
                <p className="text-xs text-slate-400 mb-1">Monthly Goal: 5</p>
                <p className="text-3xl font-bold text-yellow-400">{monthlyStats.closed}/5</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => updateKPI('deals_closed', (myKPI.deals_closed || 0) - 1)} className="flex-1 bg-slate-600 text-white py-2 rounded">-1</button>
                  <button onClick={() => updateKPI('deals_closed', (myKPI.deals_closed || 0) + 1)} className="flex-1 bg-yellow-600 text-white py-2 rounded">+1</button>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <p className="text-white font-bold mb-2">📝 Daily Notes</p>
              <textarea
                value={myKPI.notes || ''}
                onChange={e => updateKPI('notes', e.target.value)}
                placeholder="Notes for today..."
                className="w-full bg-slate-700 text-white rounded-lg p-3 border border-slate-600 focus:border-blue-500 focus:outline-none min-h-24 resize-y"
              />
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {currentTab === 'team' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">🏆 Leaderboard</h2>
                <div className="flex gap-2">
                  {['week', 'month'].map(p => (
                    <button key={p} onClick={() => setLeaderboardPeriod(p)} className={`px-4 py-2 rounded-lg font-semibold ${leaderboardPeriod === p ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{p === 'week' ? 'Week' : 'Month'}</button>
                  ))}
                </div>
              </div>
              {getLeaderboard().map((e, i) => (
                <div key={e.user.id} className="bg-slate-700 rounded-lg p-4 mb-2 flex items-center gap-4">
                  <span className="text-3xl">{['🥇', '🥈', '🥉', '🏅'][i] || '🏅'}</span>
                  <div className="flex-1">
                    <p className="text-white font-bold">{e.user.name}</p>
                    <p className="text-slate-400 text-xs">Offers: {e.stats.offers} | Texts: {e.stats.texts} | Calls: {e.stats.calls}</p>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{e.score}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {currentTab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">📊 Analytics</h2>
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly', 'quarterly'].map(p => (
                    <button key={p} onClick={() => setAnalyticsPeriod(p)} className={`px-3 py-1 rounded text-sm font-semibold ${analyticsPeriod === p ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {(() => {
                  const t = getTeamTotals(analyticsPeriod);
                  const goals = {
                    daily: [80, 3200, 80, 1, 1],
                    weekly: [560, 22400, 560, 8, 2],
                    monthly: [2400, 96000, 2400, 8, 20],
                    quarterly: [7200, 288000, 7200, 24, 60]
                  }[analyticsPeriod];
                  return [['Offers', t.offers, goals[0]], ['Texts', t.texts, goals[1]], ['Calls', t.calls, goals[2]], ['UC', t.contracts, goals[3]], ['Closed', t.closed, goals[4]]].map(([n, v, g]) => (
                    <div key={n} className="bg-slate-700 rounded-lg p-3 text-center">
                      <p className="text-slate-400 text-xs">{n}</p>
                      <p className="text-2xl font-bold text-white">{v}</p>
                      <p className="text-xs text-slate-500">/{g}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={exportCSV} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">📥 Export CSV</button>
              <button onClick={copySummary} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">📋 Copy Summary</button>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {currentTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">📅 History</h2>
              <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600" />
            </div>
            {teamMembers.map(user => {
              const k = teamKPIs[user.id]?.[historyDate] || {};
              return (
                <div key={user.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-white font-bold mb-2">{user.name}</h3>
                  <div className="grid grid-cols-6 gap-2 text-sm">
                    {[['Offers', k.offers], ['New', k.new_agents], ['Follow', k.follow_ups], ['Calls', k.phone_calls], ['UC', k.deals_under_contract], ['Closed', k.deals_closed]].map(([l, v]) => (
                      <div key={l} className="bg-slate-700 rounded p-2 text-center">
                        <p className="text-slate-400 text-xs">{l}</p>
                        <p className="text-white font-bold">{v || 0}</p>
                      </div>
                    ))}
                  </div>
                  {k.notes && <p className="text-slate-400 text-sm mt-2">📝 {k.notes}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* ADMIN TAB */}
        {currentTab === 'admin' && currentUser?.role === 'owner' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">👑 Admin Panel</h2>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-semibold">Invite Codes</h3>
                  <button onClick={generateInvite} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Generate Code</button>
                </div>
                <div className="space-y-2">
                  {invites.filter(i => i.is_active).map(inv => (
                    <div key={inv.id} className="bg-slate-700 rounded-lg p-3 flex justify-between items-center">
                      <code className="text-green-400 font-mono text-lg">{inv.code}</code>
                      <span className="text-slate-400 text-xs">Active</span>
                    </div>
                  ))}
                  {invites.filter(i => i.is_active).length === 0 && (
                    <p className="text-slate-500 text-sm">No active invite codes. Generate one to invite team members.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">Team Members ({teamMembers.length})</h3>
                {teamMembers.map(u => (
                  <div key={u.id} className="bg-slate-700 rounded-lg p-3 mb-2 flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{u.name}</p>
                      <p className="text-slate-400 text-sm">{u.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.role === 'owner' ? 'bg-yellow-600' : 'bg-slate-600'} text-white`}>{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-slate-600 text-center text-xs mt-8">Powered by AI Coastal Bridge</p>
      </div>
    </div>
  );
}
