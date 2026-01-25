'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://bnzbaywpfzfochqurqte.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuemJheXdwZnpmb2NocXVycXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTU0MTYsImV4cCI6MjA4NDg5MTQxNn0._d0wNc0kzacLHAUYT1Iafx4LeKjrQA8NGhXScz4xu60';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate random invite code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// Get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

// Get current time formatted
const getCurrentTime = () => {
  return new Date().toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Motivational messages based on time and progress
const getMotivationalMessage = (progress) => {
  const hour = new Date().getHours();
  if (hour < 9) return "☀️ Early bird gets the deals! Let's crush it today!";
  if (hour < 12) {
    if (progress > 50) return "🔥 You're on FIRE! Keep that momentum going!";
    return "💪 Morning grind time! Build that pipeline!";
  }
  if (hour < 15) {
    if (progress > 70) return "🚀 UNSTOPPABLE! You're crushing your goals!";
    return "⚡ Afternoon push! Every call counts!";
  }
  if (hour < 18) {
    if (progress > 90) return "🏆 CHAMPION MODE! Almost there!";
    return "🎯 Final stretch! Finish strong!";
  }
  if (progress >= 100) return "👑 GOAL CRUSHED! You're a legend!";
  return "🌙 Great effort today! Rest up for tomorrow!";
};

export default function MomentumKPI() {
  // Auth State
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // App State
  const [currentView, setCurrentView] = useState('personal');
  const [teamMembers, setTeamMembers] = useState([]);
  const [todayKPIs, setTodayKPIs] = useState(null);
  const [allKPIs, setAllKPIs] = useState({});
  const [invites, setInvites] = useState([]);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly');
  const [analyticsView, setAnalyticsView] = useState('daily');
  
  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTime()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('momentum_user');
    const savedOrg = localStorage.getItem('momentum_org');
    if (savedUser && savedOrg) {
      setUser(JSON.parse(savedUser));
      setOrganization(JSON.parse(savedOrg));
    }
    setLoading(false);
  }, []);
  
  // Load data when logged in
  useEffect(() => {
    if (user && organization) {
      loadTeamMembers();
      loadTodayKPIs();
      loadAllKPIs();
      if (user.role === 'owner') loadInvites();
    }
  }, [user, organization]);
  
  // Refresh data every 30 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadTeamMembers();
      loadAllKPIs();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // ============ DATA FUNCTIONS ============
  
  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organization.id);
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Error loading team:', err);
    }
  };
  
  const loadTodayKPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_kpis')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', getTodayString())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setTodayKPIs(data);
      } else {
        // Create today's record
        const newKPI = {
          user_id: user.id,
          date: getTodayString(),
          kpi_data: {
            offers: 0,
            newAgents: 0,
            followUps: 0,
            phoneCalls: 0,
            dealsUC: 0,
            dealsClosed: 0,
            notes: ''
          }
        };
        const { data: created, error: createError } = await supabase
          .from('daily_kpis')
          .insert(newKPI)
          .select()
          .single();
        if (createError) throw createError;
        setTodayKPIs(created);
      }
    } catch (err) {
      console.error('Error loading KPIs:', err);
    }
  };
  
  const loadAllKPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_kpis')
        .select('*, users(name)')
        .eq('users.organization_id', organization.id);
      if (error) throw error;
      
      // Group by user
      const grouped = {};
      (data || []).forEach(kpi => {
        if (!grouped[kpi.user_id]) grouped[kpi.user_id] = [];
        grouped[kpi.user_id].push(kpi);
      });
      setAllKPIs(grouped);
    } catch (err) {
      console.error('Error loading all KPIs:', err);
    }
  };
  
  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvites(data || []);
    } catch (err) {
      console.error('Error loading invites:', err);
    }
  };
  
  const updateKPI = async (field, delta) => {
    if (!todayKPIs) return;
    
    const currentData = todayKPIs.kpi_data || {};
    const newValue = Math.max(0, (currentData[field] || 0) + delta);
    const newData = { ...currentData, [field]: newValue };
    
    try {
      const { error } = await supabase
        .from('daily_kpis')
        .update({ kpi_data: newData })
        .eq('id', todayKPIs.id);
      if (error) throw error;
      setTodayKPIs({ ...todayKPIs, kpi_data: newData });
    } catch (err) {
      console.error('Error updating KPI:', err);
    }
  };
  
  const updateNotes = async (notes) => {
    if (!todayKPIs) return;
    const newData = { ...todayKPIs.kpi_data, notes };
    try {
      const { error } = await supabase
        .from('daily_kpis')
        .update({ kpi_data: newData })
        .eq('id', todayKPIs.id);
      if (error) throw error;
      setTodayKPIs({ ...todayKPIs, kpi_data: newData });
    } catch (err) {
      console.error('Error updating notes:', err);
    }
  };
  
  // ============ AUTH FUNCTIONS ============
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('email', email.toLowerCase())
        .single();
      
      if (userError || !userData) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }
      
      if (userData.password_hash !== password) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }
      
      const org = userData.organizations;
      delete userData.organizations;
      
      setUser(userData);
      setOrganization(org);
      localStorage.setItem('momentum_user', JSON.stringify(userData));
      localStorage.setItem('momentum_org', JSON.stringify(org));
    } catch (err) {
      setError('Login failed: ' + err.message);
    }
    setLoading(false);
  };
  
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName })
        .select()
        .single();
      if (orgError) throw orgError;
      
      // Create owner user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name: name,
          password_hash: password,
          role: 'owner',
          organization_id: orgData.id
        })
        .select()
        .single();
      if (userError) throw userError;
      
      // Update org with owner_id
      await supabase
        .from('organizations')
        .update({ owner_id: userData.id })
        .eq('id', orgData.id);
      
      setUser(userData);
      setOrganization(orgData);
      localStorage.setItem('momentum_user', JSON.stringify(userData));
      localStorage.setItem('momentum_org', JSON.stringify(orgData));
    } catch (err) {
      setError('Failed to create team: ' + err.message);
    }
    setLoading(false);
  };
  
  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Find invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*, organizations(*)')
        .eq('code', inviteCode.toUpperCase())
        .eq('is_active', true)
        .is('used_by', null)
        .single();
      
      if (inviteError || !invite) {
        setError('Invalid or expired invite code');
        setLoading(false);
        return;
      }
      
      // Create user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          name: name,
          password_hash: password,
          role: 'member',
          organization_id: invite.organization_id
        })
        .select()
        .single();
      if (userError) throw userError;
      
      // Mark invite as used
      await supabase
        .from('invites')
        .update({ used_by: userData.id, used_at: new Date().toISOString(), is_active: false })
        .eq('id', invite.id);
      
      const org = invite.organizations;
      setUser(userData);
      setOrganization(org);
      localStorage.setItem('momentum_user', JSON.stringify(userData));
      localStorage.setItem('momentum_org', JSON.stringify(org));
    } catch (err) {
      setError('Failed to join team: ' + err.message);
    }
    setLoading(false);
  };
  
  const handleLogout = () => {
    setUser(null);
    setOrganization(null);
    localStorage.removeItem('momentum_user');
    localStorage.removeItem('momentum_org');
    setEmail('');
    setPassword('');
    setName('');
  };
  
  const handleGenerateInvite = async () => {
    try {
      const code = generateInviteCode();
      const { error } = await supabase
        .from('invites')
        .insert({
          code: code,
          organization_id: organization.id,
          created_by: user.id
        });
      if (error) throw error;
      loadInvites();
    } catch (err) {
      console.error('Error generating invite:', err);
    }
  };
  
  // ============ CALCULATIONS ============
  
  const kpiData = todayKPIs?.kpi_data || {};
  const totalTexts = (kpiData.newAgents || 0) + (kpiData.followUps || 0);
  
  const calculateScore = (data) => {
    if (!data) return 0;
    return (data.offers || 0) + 
           ((data.newAgents || 0) + (data.followUps || 0)) + 
           (data.phoneCalls || 0) + 
           ((data.dealsUC || 0) * 10) + 
           ((data.dealsClosed || 0) * 20);
  };
  
  const getProgressPercent = () => {
    const offersProgress = ((kpiData.offers || 0) / 20) * 100;
    const textsProgress = (totalTexts / 800) * 100;
    const callsProgress = ((kpiData.phoneCalls || 0) / 20) * 100;
    return Math.round((offersProgress + textsProgress + callsProgress) / 3);
  };
  
  const getLeaderboardData = () => {
    const now = new Date();
    const periodDays = leaderboardPeriod === 'weekly' ? 7 : 30;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    return teamMembers.map(member => {
      const memberKPIs = allKPIs[member.id] || [];
      const periodKPIs = memberKPIs.filter(k => new Date(k.date) >= startDate);
      
      let totalScore = 0;
      let totalOffers = 0;
      let totalTexts = 0;
      let totalCalls = 0;
      let totalUC = 0;
      let totalClosed = 0;
      
      periodKPIs.forEach(k => {
        const d = k.kpi_data || {};
        totalOffers += d.offers || 0;
        totalTexts += (d.newAgents || 0) + (d.followUps || 0);
        totalCalls += d.phoneCalls || 0;
        totalUC += d.dealsUC || 0;
        totalClosed += d.dealsClosed || 0;
        totalScore += calculateScore(d);
      });
      
      return {
        ...member,
        score: totalScore,
        offers: totalOffers,
        texts: totalTexts,
        calls: totalCalls,
        dealsUC: totalUC,
        dealsClosed: totalClosed
      };
    }).sort((a, b) => b.score - a.score);
  };
  
  // ============ RENDER ============
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-orange-500 text-xl">Loading...</div>
      </div>
    );
  }
  
  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-orange-500 tracking-tight mb-2">
              ⚡ MOMENTUM
            </h1>
            <p className="text-slate-400 text-lg">Track. Compete. Dominate.</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
            {/* Auth Mode Tabs */}
            <div className="flex mb-6 bg-slate-700/50 rounded-lg p-1">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
                  authMode === 'login' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('newTeam')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
                  authMode === 'newTeam' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                New Team
              </button>
              <button
                onClick={() => setAuthMode('joinTeam')}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${
                  authMode === 'joinTeam' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Join Team
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {/* Login Form */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition"
                >
                  Sign In
                </button>
              </form>
            )}
            
            {/* New Team Form */}
            {authMode === 'newTeam' && (
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <input
                  type="text"
                  placeholder="Organization Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                  minLength={6}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition"
                >
                  Create Team
                </button>
              </form>
            )}
            
            {/* Join Team Form */}
            {authMode === 'joinTeam' && (
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <input
                  type="text"
                  placeholder="Invite Code (e.g., ABCD-1234)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 text-center tracking-widest font-mono"
                  required
                  maxLength={9}
                />
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  required
                  minLength={6}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition"
                >
                  Join Team
                </button>
              </form>
            )}
          </div>
          
          <p className="text-center text-slate-500 text-sm mt-6">
            Powered by AI Coastal Bridge
          </p>
        </div>
      </div>
    );
  }
  
  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-orange-500">⚡ MOMENTUM</h1>
              <p className="text-xs text-slate-400">{organization?.name}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{currentTime}</div>
              <div className="text-xs text-slate-400">{getMotivationalMessage(getProgressPercent())}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-slate-400">
                  {user.role === 'owner' ? '👑 Owner' : '👤 Member'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          {['personal', 'team', 'analytics', ...(user.role === 'owner' ? ['admin'] : [])].map(view => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                currentView === view
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {view === 'personal' && '📊 My KPIs'}
              {view === 'team' && '🏆 Team'}
              {view === 'analytics' && '📈 Analytics'}
              {view === 'admin' && '⚙️ Admin'}
            </button>
          ))}
        </div>
        
        {/* Personal View */}
        {currentView === 'personal' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4">
                👤 {user.name} — Logging your daily KPIs
              </h2>
              
              {/* Offers */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-semibold">📝 Offers Submitted</span>
                  <span className="text-orange-400 font-bold">{kpiData.offers || 0} / 20</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((kpiData.offers || 0) / 20) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => updateKPI('offers', -1)} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded">-1</button>
                  <button onClick={() => updateKPI('offers', 1)} className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded">+1</button>
                  <button onClick={() => updateKPI('offers', 5)} className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded">+5</button>
                </div>
              </div>
              
              {/* Agent Texts */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-semibold">📱 Agent Texts</span>
                  <span className="text-green-400 font-bold">{totalTexts} / 800</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((totalTexts / 800) * 100, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">New Agents ({kpiData.newAgents || 0}/300)</div>
                    <div className="flex gap-1">
                      <button onClick={() => updateKPI('newAgents', -10)} className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm">-10</button>
                      <button onClick={() => updateKPI('newAgents', 10)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">+10</button>
                      <button onClick={() => updateKPI('newAgents', 50)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">+50</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Follow-ups ({kpiData.followUps || 0}/500)</div>
                    <div className="flex gap-1">
                      <button onClick={() => updateKPI('followUps', -10)} className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm">-10</button>
                      <button onClick={() => updateKPI('followUps', 10)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">+10</button>
                      <button onClick={() => updateKPI('followUps', 50)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">+50</button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Phone Calls */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-semibold">📞 Phone Conversations</span>
                  <span className="text-blue-400 font-bold">{kpiData.phoneCalls || 0} / 20</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((kpiData.phoneCalls || 0) / 20) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => updateKPI('phoneCalls', -1)} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded">-1</button>
                  <button onClick={() => updateKPI('phoneCalls', 1)} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded">+1</button>
                  <button onClick={() => updateKPI('phoneCalls', 5)} className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded">+5</button>
                </div>
              </div>
              
              {/* Deals Under Contract (Weekly) */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-semibold">📄 Deals Under Contract <span className="text-xs text-slate-400">(Weekly)</span></span>
                  <span className="text-purple-400 font-bold">{kpiData.dealsUC || 0} / 2</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((kpiData.dealsUC || 0) / 2) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => updateKPI('dealsUC', -1)} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded">-1</button>
                  <button onClick={() => updateKPI('dealsUC', 1)} className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded">+1</button>
                </div>
              </div>
              
              {/* Deals Closed (Monthly) */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-semibold">💰 Deals Closed <span className="text-xs text-slate-400">(Monthly)</span></span>
                  <span className="text-yellow-400 font-bold">{kpiData.dealsClosed || 0} / 5</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mb-3">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((kpiData.dealsClosed || 0) / 5) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => updateKPI('dealsClosed', -1)} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded">-1</button>
                  <button onClick={() => updateKPI('dealsClosed', 1)} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded">+1</button>
                </div>
              </div>
              
              {/* Notes */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-white font-semibold mb-2">📝 Daily Notes</div>
                <textarea
                  value={kpiData.notes || ''}
                  onChange={(e) => updateNotes(e.target.value)}
                  placeholder="Notes about today's activities, deals in progress, follow-ups needed..."
                  className="w-full h-24 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Team View */}
        {currentView === 'team' && (
          <div className="space-y-4">
            {/* Leaderboard */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">🏆 Leaderboard</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLeaderboardPeriod('weekly')}
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      leaderboardPeriod === 'weekly' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setLeaderboardPeriod('monthly')}
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      leaderboardPeriod === 'monthly' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                {getLeaderboardData().map((member, idx) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      member.id === user.id ? 'bg-orange-500/20 border border-orange-500' : 'bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <div>
                        <div className="font-semibold text-white">{member.name}</div>
                        <div className="text-xs text-slate-400">
                          {member.offers} offers • {member.texts} texts • {member.calls} calls
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-orange-400">{member.score}</div>
                      <div className="text-xs text-slate-400">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Team Overview */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4">👥 Team Members</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {teamMembers.map(member => {
                  const memberKPIs = allKPIs[member.id]?.find(k => k.date === getTodayString())?.kpi_data || {};
                  return (
                    <div key={member.id} className="bg-slate-700/50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-white">{member.name}</span>
                        <span className="text-xs text-slate-400">{member.role === 'owner' ? '👑' : '👤'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-orange-400 font-bold">{memberKPIs.offers || 0}</div>
                          <div className="text-slate-400">Offers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-400 font-bold">{(memberKPIs.newAgents || 0) + (memberKPIs.followUps || 0)}</div>
                          <div className="text-slate-400">Texts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-400 font-bold">{memberKPIs.phoneCalls || 0}</div>
                          <div className="text-slate-400">Calls</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Analytics View */}
        {currentView === 'analytics' && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">📈 Performance Analytics</h2>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly', 'quarterly'].map(period => (
                  <button
                    key={period}
                    onClick={() => setAnalyticsView(period)}
                    className={`px-3 py-1 rounded text-sm font-semibold capitalize ${
                      analyticsView === period ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Team Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 pb-2 pr-4">Member</th>
                    <th className="text-right text-slate-400 pb-2 px-2">Offers</th>
                    <th className="text-right text-slate-400 pb-2 px-2">Texts</th>
                    <th className="text-right text-slate-400 pb-2 px-2">Calls</th>
                    <th className="text-right text-slate-400 pb-2 px-2">UC</th>
                    <th className="text-right text-slate-400 pb-2 px-2">Closed</th>
                    <th className="text-right text-slate-400 pb-2 pl-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {getLeaderboardData().map(member => (
                    <tr key={member.id} className="border-b border-slate-700/50">
                      <td className="py-3 pr-4 font-semibold text-white">{member.name}</td>
                      <td className="py-3 px-2 text-right text-orange-400">{member.offers}</td>
                      <td className="py-3 px-2 text-right text-green-400">{member.texts}</td>
                      <td className="py-3 px-2 text-right text-blue-400">{member.calls}</td>
                      <td className="py-3 px-2 text-right text-purple-400">{member.dealsUC}</td>
                      <td className="py-3 px-2 text-right text-yellow-400">{member.dealsClosed}</td>
                      <td className="py-3 pl-2 text-right font-bold text-white">{member.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Admin View */}
        {currentView === 'admin' && user.role === 'owner' && (
          <div className="space-y-4">
            {/* Generate Invite */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4">🎟️ Invite Codes</h2>
              <button
                onClick={handleGenerateInvite}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg mb-4"
              >
                + Generate New Invite Code
              </button>
              
              <div className="space-y-2">
                {invites.filter(i => i.is_active && !i.used_by).map(invite => (
                  <div key={invite.id} className="flex justify-between items-center bg-slate-700/50 rounded-lg p-3">
                    <code className="text-orange-400 font-mono text-lg">{invite.code}</code>
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                ))}
                {invites.filter(i => i.is_active && !i.used_by).length === 0 && (
                  <p className="text-slate-400 text-sm">No active invite codes. Generate one above!</p>
                )}
              </div>
            </div>
            
            {/* Team Members */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-lg font-bold text-white mb-4">👥 Team Members ({teamMembers.length})</h2>
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex justify-between items-center bg-slate-700/50 rounded-lg p-3">
                    <div>
                      <div className="font-semibold text-white">{member.name}</div>
                      <div className="text-xs text-slate-400">{member.email}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      member.role === 'owner' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-600 text-slate-300'
                    }`}>
                      {member.role === 'owner' ? '👑 Owner' : '👤 Member'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="text-center py-6 text-slate-500 text-sm">
        Powered by AI Coastal Bridge
      </div>
    </div>
  );
}
