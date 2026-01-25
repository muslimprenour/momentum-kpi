'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://bnzbaywpfzfochqurqte.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuemJheXdwZnpmb2NocXVycXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTU0MTYsImV4cCI6MjA4NDg5MTQxNn0._d0wNc0kzacLHAUYT1Iafx4LeKjrQA8NGhXScz4xu60';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// KPI Definitions
const KPI_CONFIG = [
  { id: 'leads', name: 'Leads Generated', icon: '📞', goal: 50, points: 1 },
  { id: 'contacts', name: 'Contacts Made', icon: '🤝', goal: 30, points: 2 },
  { id: 'offers', name: 'Offers Made', icon: '📝', goal: 10, points: 5 },
  { id: 'contracts', name: 'Contracts Signed', icon: '✍️', goal: 3, points: 20 },
  { id: 'deals', name: 'Deals Closed', icon: '🏆', goal: 1, points: 50 },
];

// Generate random invite code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Get today's date string
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export default function MomentumKPI() {
  // Auth State
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // login, newTeam, joinTeam
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    inviteCode: ''
  });
  
  // App State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [teamMembers, setTeamMembers] = useState([]);
  const [todayKpis, setTodayKpis] = useState({});
  const [allKpis, setAllKpis] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  // Check for existing session on load
  useEffect(() => {
    checkSession();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (user && organization) {
      loadTeamData();
      loadKpiData();
      loadInviteCodes();
    }
  }, [user, organization]);

  const checkSession = async () => {
    try {
      const savedUser = localStorage.getItem('momentum_user');
      const savedOrg = localStorage.getItem('momentum_org');
      
      if (savedUser && savedOrg) {
        setUser(JSON.parse(savedUser));
        setOrganization(JSON.parse(savedOrg));
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // Create new team (owner signup)
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { name, email, password, confirmPassword, orgName } = formData;

      if (!name || !email || !password || !orgName) {
        throw new Error('Please fill in all fields');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create user as owner
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name,
          email: email.toLowerCase(),
          password_hash: password, // In production, hash this!
          role: 'owner',
          organization_id: orgData.id
        })
        .select()
        .single();

      if (userError) throw userError;

      // Save session
      localStorage.setItem('momentum_user', JSON.stringify(userData));
      localStorage.setItem('momentum_org', JSON.stringify(orgData));

      setUser(userData);
      setOrganization(orgData);
      setFormData({ name: '', email: '', password: '', confirmPassword: '', orgName: '', inviteCode: '' });

    } catch (err) {
      setError(err.message || 'Failed to create team');
    }
    setLoading(false);
  };

  // Join team with invite code
  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { name, email, password, confirmPassword, inviteCode } = formData;

      if (!name || !email || !password || !inviteCode) {
        throw new Error('Please fill in all fields');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate invite code
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*, organizations(*)')
        .eq('code', inviteCode.toUpperCase())
        .eq('is_active', true)
        .is('used_by', null)
        .single();

      if (inviteError || !invite) {
        throw new Error('Invalid or expired invite code');
      }

      // Create user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name,
          email: email.toLowerCase(),
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

      // Get organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select()
        .eq('id', invite.organization_id)
        .single();

      // Save session
      localStorage.setItem('momentum_user', JSON.stringify(userData));
      localStorage.setItem('momentum_org', JSON.stringify(orgData));

      setUser(userData);
      setOrganization(orgData);
      setFormData({ name: '', email: '', password: '', confirmPassword: '', orgName: '', inviteCode: '' });

    } catch (err) {
      setError(err.message || 'Failed to join team');
    }
    setLoading(false);
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { email, password } = formData;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('email', email.toLowerCase())
        .eq('password_hash', password)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid email or password');
      }

      localStorage.setItem('momentum_user', JSON.stringify(userData));
      localStorage.setItem('momentum_org', JSON.stringify(userData.organizations));

      setUser(userData);
      setOrganization(userData.organizations);
      setFormData({ name: '', email: '', password: '', confirmPassword: '', orgName: '', inviteCode: '' });

    } catch (err) {
      setError(err.message || 'Failed to login');
    }
    setLoading(false);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('momentum_user');
    localStorage.removeItem('momentum_org');
    setUser(null);
    setOrganization(null);
    setTeamMembers([]);
    setAllKpis([]);
    setInviteCodes([]);
  };

  // Load team members
  const loadTeamData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true });

      if (!error) setTeamMembers(data || []);
    } catch (err) {
      console.error('Failed to load team:', err);
    }
  };

  // Load KPI data
  const loadKpiData = async () => {
    try {
      // Load all KPIs for the organization
      const { data: allData, error: allError } = await supabase
        .from('daily_kpis')
        .select('*, users(name)')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (!allError) setAllKpis(allData || []);

      // Load today's KPIs for current user
      const { data: todayData, error: todayError } = await supabase
        .from('daily_kpis')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', getTodayString())
        .single();

      if (!todayError && todayData) {
        setTodayKpis(todayData.kpi_data || {});
      }
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    }
  };

  // Load invite codes (owner only)
  const loadInviteCodes = async () => {
    if (user?.role !== 'owner') return;

    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (!error) setInviteCodes(data || []);
    } catch (err) {
      console.error('Failed to load invites:', err);
    }
  };

  // Save KPI
  const updateKpi = async (kpiId, value) => {
    const newKpis = { ...todayKpis, [kpiId]: Math.max(0, value) };
    setTodayKpis(newKpis);

    try {
      // Check if today's entry exists
      const { data: existing } = await supabase
        .from('daily_kpis')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', getTodayString())
        .single();

      if (existing) {
        await supabase
          .from('daily_kpis')
          .update({ kpi_data: newKpis, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('daily_kpis')
          .insert({
            user_id: user.id,
            organization_id: organization.id,
            date: getTodayString(),
            kpi_data: newKpis
          });
      }

      // Reload all data
      loadKpiData();
    } catch (err) {
      console.error('Failed to save KPI:', err);
    }
  };

  // Generate new invite code
  const createInviteCode = async () => {
    try {
      const code = generateInviteCode();
      
      const { data, error } = await supabase
        .from('invites')
        .insert({
          code,
          organization_id: organization.id,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (!error) {
        setInviteCodes([data, ...inviteCodes]);
      }
    } catch (err) {
      console.error('Failed to create invite:', err);
    }
  };

  // Calculate total points for a user
  const calculatePoints = (kpiData) => {
    if (!kpiData) return 0;
    return KPI_CONFIG.reduce((total, kpi) => {
      return total + (kpiData[kpi.id] || 0) * kpi.points;
    }, 0);
  };

  // Get leaderboard data
  const getLeaderboard = () => {
    const today = getTodayString();
    const todayKpisAll = allKpis.filter(k => k.date === today);
    
    return teamMembers.map(member => {
      const memberKpi = todayKpisAll.find(k => k.user_id === member.id);
      return {
        ...member,
        points: calculatePoints(memberKpi?.kpi_data),
        kpis: memberKpi?.kpi_data || {}
      };
    }).sort((a, b) => b.points - a.points);
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Date', 'Name', ...KPI_CONFIG.map(k => k.name), 'Total Points'];
    const rows = allKpis.map(kpi => {
      const member = teamMembers.find(m => m.id === kpi.user_id);
      return [
        kpi.date,
        member?.name || 'Unknown',
        ...KPI_CONFIG.map(k => kpi.kpi_data?.[k.id] || 0),
        calculatePoints(kpi.kpi_data)
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `momentum-kpis-${getTodayString()}.csv`;
    a.click();
  };

  // Loading screen
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <div className="text-xl font-semibold text-white">Loading Momentum...</div>
        </div>
      </div>
    );
  }

  // Auth Screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2">MOMENTUM</h1>
            <p className="text-slate-400">Track. Compete. Dominate.</p>
          </div>

          {/* Auth Card */}
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  authMode === 'login' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('newTeam')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  authMode === 'newTeam' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                New Team
              </button>
              <button
                onClick={() => setAuthMode('joinTeam')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  authMode === 'joinTeam' 
                    ? 'bg-orange-500 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Join Team
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Login Form */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* New Team Form */}
            {authMode === 'newTeam' && (
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <input
                  type="text"
                  name="orgName"
                  placeholder="Organization Name (e.g., SBH Wholesaling)"
                  value={formData.orgName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password (min 6 characters)"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating Team...' : 'Create Team'}
                </button>
              </form>
            )}

            {/* Join Team Form */}
            {authMode === 'joinTeam' && (
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <input
                  type="text"
                  name="inviteCode"
                  placeholder="Invite Code (e.g., ABCD-1234)"
                  value={formData.inviteCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 uppercase"
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password (min 6 characters)"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Joining Team...' : 'Join Team'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  const leaderboard = getLeaderboard();
  const userRank = leaderboard.findIndex(m => m.id === user.id) + 1;
  const userPoints = calculatePoints(todayKpis);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold gradient-text">MOMENTUM</h1>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{organization?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-slate-400">{user.name}</div>
              <div className="text-xs text-orange-500">{user.role === 'owner' ? '👑 Owner' : '👤 Member'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:border-slate-600 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {['dashboard', 'leaderboard', 'history', ...(user.role === 'owner' ? ['admin'] : [])].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab === 'dashboard' && '📊 '}
                {tab === 'leaderboard' && '🏆 '}
                {tab === 'history' && '📅 '}
                {tab === 'admin' && '⚙️ '}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                <div className="text-3xl font-bold text-orange-400">{userPoints}</div>
                <div className="text-sm text-slate-400">Today's Points</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="text-3xl font-bold text-white">#{userRank}</div>
                <div className="text-sm text-slate-400">Your Rank</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{teamMembers.length}</div>
                <div className="text-sm text-slate-400">Team Members</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{formatDate(new Date())}</div>
                <div className="text-sm text-slate-400">Today</div>
              </div>
            </div>

            {/* KPI Input Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {KPI_CONFIG.map(kpi => {
                const value = todayKpis[kpi.id] || 0;
                const progress = Math.min((value / kpi.goal) * 100, 100);
                
                return (
                  <div key={kpi.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 card-hover">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{kpi.icon}</span>
                        <div>
                          <div className="font-medium text-white">{kpi.name}</div>
                          <div className="text-xs text-slate-500">{kpi.points} pts each • Goal: {kpi.goal}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-400">{value * kpi.points}</div>
                        <div className="text-xs text-slate-500">points</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-800 rounded-full mb-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Counter */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => updateKpi(kpi.id, value - 1)}
                        className="w-12 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl text-2xl font-bold text-slate-400 hover:text-white transition-all"
                      >
                        -
                      </button>
                      <div className="text-4xl font-bold text-white w-20 text-center">{value}</div>
                      <button
                        onClick={() => updateKpi(kpi.id, value + 1)}
                        className="w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-xl text-2xl font-bold text-white transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-white">Today's Leaderboard</h2>
            <div className="space-y-3">
              {leaderboard.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    member.id === user.id
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  <div className={`text-2xl font-bold w-10 text-center ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-slate-300' :
                    index === 2 ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white flex items-center gap-2">
                      {member.name}
                      {member.role === 'owner' && <span className="text-xs">👑</span>}
                      {member.id === user.id && <span className="text-xs text-orange-400">(You)</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {KPI_CONFIG.map(k => `${member.kpis[k.id] || 0} ${k.icon}`).join(' • ')}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">{member.points}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">KPI History</h2>
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-all"
              >
                📥 Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                    {KPI_CONFIG.map(k => (
                      <th key={k.id} className="text-center py-3 px-4 text-slate-400 font-medium">
                        {k.icon}
                      </th>
                    ))}
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {allKpis.slice(0, 50).map((kpi, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                      <td className="py-3 px-4 text-slate-300">{formatDate(kpi.date)}</td>
                      <td className="py-3 px-4 text-white">{kpi.users?.name || 'Unknown'}</td>
                      {KPI_CONFIG.map(k => (
                        <td key={k.id} className="py-3 px-4 text-center text-slate-300">
                          {kpi.kpi_data?.[k.id] || 0}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-bold text-orange-400">
                        {calculatePoints(kpi.kpi_data)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin Tab (Owner Only) */}
        {activeTab === 'admin' && user.role === 'owner' && (
          <div className="space-y-6 animate-fade-in">
            {/* Invite Codes Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">📨 Invite Codes</h2>
                <button
                  onClick={createInviteCode}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-all"
                >
                  + Generate Code
                </button>
              </div>
              <div className="space-y-2">
                {inviteCodes.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No invite codes yet. Generate one to invite team members!</p>
                ) : (
                  inviteCodes.map(invite => (
                    <div
                      key={invite.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        invite.is_active ? 'bg-slate-800' : 'bg-slate-800/50'
                      }`}
                    >
                      <code className={`text-lg font-mono ${invite.is_active ? 'text-orange-400' : 'text-slate-500 line-through'}`}>
                        {invite.code}
                      </code>
                      <span className={`text-xs px-2 py-1 rounded ${
                        invite.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'
                      }`}>
                        {invite.is_active ? 'Active' : 'Used'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Team Members Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">👥 Team Members ({teamMembers.length})</h2>
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div>
                      <div className="font-medium text-white flex items-center gap-2">
                        {member.name}
                        {member.role === 'owner' && <span className="text-xs">👑</span>}
                      </div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      member.role === 'owner' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
