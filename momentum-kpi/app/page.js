'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Confetti celebration component
const Confetti = ({ active }) => {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (active) {
      const colors = ['#fbbf24', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6', '#f97316'];
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 2,
        size: 4 + Math.random() * 8,
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);
      
      const timer = setTimeout(() => setParticles([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [active]);
  
  if (particles.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const SUPABASE_URL = 'https://bnzbaywpfzfochqurqte.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuemJheXdwZnpmb2NocXVycXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTU0MTYsImV4cCI6MjA4NDg5MTQxNn0._d0wNc0kzacLHAUYT1Iafx4LeKjrQA8NGhXScz4xu60';

// Supabase Auth Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Organization Timezone - ALL dates use this timezone for consistency
// Change this to your timezone: 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', etc.
const ORG_TIMEZONE = 'America/New_York';

// Get today's date in org timezone (returns YYYY-MM-DD)
const getTodayInOrgTimezone = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: ORG_TIMEZONE });
};

// Get current time in org timezone
const getCurrentTimeInOrgTimezone = () => {
  return new Date().toLocaleString('en-US', { timeZone: ORG_TIMEZONE });
};

// Get hour in org timezone (for motivational messages)
const getCurrentHourInOrgTimezone = () => {
  const timeStr = new Date().toLocaleTimeString('en-US', { timeZone: ORG_TIMEZONE, hour12: false, hour: '2-digit' });
  return parseInt(timeStr, 10);
};

const DEFAULT_KPI_GOALS = {
  daily_offers: 20,
  daily_calls: 20,
  daily_new_agents: 300,
  daily_follow_ups: 500,
  weekly_contracts: 2,
  monthly_closed: 5,
  yearly_revenue_goal: 500000,
  yearly_personal_net_goal: 250000
};

const AVATAR_EMOJIS = [
  '😀', '😎', '🤓', '🧑‍💼', '👨‍💼', '👩‍💼', '🦸', '🦹', '🧑‍🚀', '👷',
  '🎯', '🔥', '⚡', '💪', '🏆', '💰', '🚀', '💎', '⭐', '🌟',
  '🦅', '🦁', '🐺', '🦊', '🐯', '🦈', '🐉', '🦄', '🔮', '👑'
];

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
    update: (userId, updates) => supabaseFetch(`users?id=eq.${userId}`, { method: 'PATCH', body: updates }),
  },
  orgs: {
    create: (org) => supabaseFetch('organizations', { method: 'POST', body: [org] }),
    getById: (id) => supabaseFetch(`organizations?id=eq.${id}&select=*`),
    update: (orgId, updates) => supabaseFetch(`organizations?id=eq.${orgId}`, { method: 'PATCH', body: updates }),
  },
  invites: {
    getByCode: (code) => supabaseFetch(`invites?code=eq.${code}&is_active=eq.true&select=*`),
    getByCodeAll: (code) => supabaseFetch(`invites?code=eq.${code}&select=*`),
    reactivate: (code) => supabaseFetch(`invites?code=eq.${code}`, { method: 'PATCH', body: { is_active: true, used_by: null, used_at: null } }),
    create: (invite) => supabaseFetch('invites', { method: 'POST', body: [invite] }),
    use: (code, userId) => supabaseFetch(`invites?code=eq.${code}`, { method: 'PATCH', body: { used_by: userId, used_at: new Date().toISOString(), is_active: false } }),
    getByOrg: (orgId) => supabaseFetch(`invites?organization_id=eq.${orgId}&select=*`),
    delete: (inviteId) => supabaseFetch(`invites?id=eq.${inviteId}`, { method: 'DELETE' }),
  },
  kpis: {
    getByOrg: (orgId, userIds) => supabaseFetch(`daily_kpis?user_id=in.(${userIds.join(',')})&select=*`),
    getByUserAndDate: (userId, date) => supabaseFetch(`daily_kpis?user_id=eq.${userId}&date=eq.${date}&select=*`),
    upsert: (kpi) => supabaseFetch('daily_kpis?on_conflict=user_id,date', { method: 'POST', body: [kpi], prefer: 'return=representation,resolution=merge-duplicates' }),
  },
  pendingOffers: {
    getByNameAndOrg: (name, orgId) => supabaseFetch(`pending_offers?rep_name=ilike.${encodeURIComponent(name)}&organization_id=eq.${orgId}&select=*`),
    getByOrg: (orgId) => supabaseFetch(`pending_offers?organization_id=eq.${orgId}&select=*`),
    deleteByNameAndOrg: (name, orgId) => supabaseFetch(`pending_offers?rep_name=ilike.${encodeURIComponent(name)}&organization_id=eq.${orgId}`, { method: 'DELETE' }),
    deleteById: (id) => supabaseFetch(`pending_offers?id=eq.${id}`, { method: 'DELETE' }),
  },
  notes: {
    getByUser: (userId) => supabaseFetch(`user_notes?user_id=eq.${userId}&select=*&order=updated_at.desc`),
    create: (note) => supabaseFetch('user_notes', { method: 'POST', body: [note] }),
    update: (noteId, updates) => supabaseFetch(`user_notes?id=eq.${noteId}`, { method: 'PATCH', body: updates }),
    delete: (noteId) => supabaseFetch(`user_notes?id=eq.${noteId}`, { method: 'DELETE' }),
  },
  approvedNames: {
    getByOrg: (orgId) => supabaseFetch(`approved_names?organization_id=eq.${orgId}&select=*&order=name.asc`),
    create: (name, orgId) => supabaseFetch('approved_names', { method: 'POST', body: [{ name, organization_id: orgId }] }),
    delete: (id) => supabaseFetch(`approved_names?id=eq.${id}`, { method: 'DELETE' }),
  },
  vipAgents: {
    getByUser: (userId) => supabaseFetch(`vip_agents?user_id=eq.${userId}&select=*&order=created_at.desc`),
    create: (agent) => supabaseFetch('vip_agents', { method: 'POST', body: [agent] }),
    update: (agentId, updates) => supabaseFetch(`vip_agents?id=eq.${agentId}`, { method: 'PATCH', body: updates }),
    delete: (agentId) => supabaseFetch(`vip_agents?id=eq.${agentId}`, { method: 'DELETE' }),
  },
  deals: {
    getByOrg: (orgId) => supabaseFetch(`deals_closed?organization_id=eq.${orgId}&select=*&order=closed_date.desc`),
    getByOrgAndYear: (orgId, year) => supabaseFetch(`deals_closed?organization_id=eq.${orgId}&year=eq.${year}&select=*&order=closed_date.desc`),
    getByUser: (userId) => supabaseFetch(`deals_closed?or=(user_id.eq.${userId},split_with_user_id.eq.${userId})&select=*&order=closed_date.desc`),
    getByUserAndYear: (userId, year) => supabaseFetch(`deals_closed?or=(user_id.eq.${userId},split_with_user_id.eq.${userId})&year=eq.${year}&select=*&order=closed_date.desc`),
    create: (deal) => supabaseFetch('deals_closed', { method: 'POST', body: [deal] }),
    update: (dealId, updates) => supabaseFetch(`deals_closed?id=eq.${dealId}`, { method: 'PATCH', body: updates }),
    delete: (dealId) => supabaseFetch(`deals_closed?id=eq.${dealId}`, { method: 'DELETE' }),
  }
};

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code.slice(0, 4) + '-' + code.slice(4);
};

const importPendingOffers = async (userId, userName, organizationId) => {
  try {
    // Get all pending offers for this org
    const { data: allPendingOffers } = await db.pendingOffers.getByOrg(organizationId);
    if (!allPendingOffers || allPendingOffers.length === 0) return 0;
    
    // Flexible name matching (case insensitive)
    const userNameLower = userName.toLowerCase().trim();
    const userFirstName = userNameLower.split(' ')[0];
    
    const matchingOffers = allPendingOffers.filter(pending => {
      const sheetName = (pending.rep_name || '').toLowerCase().trim();
      const sheetFirstName = sheetName.split(' ')[0];
      
      // Match if:
      // 1. Exact match (case insensitive)
      // 2. Sheet name is contained in user's full name (e.g. "John" in "John Smith")
      // 3. User's first name matches sheet name (e.g. "John" === "John")
      // 4. Sheet first name matches user's first name
      return sheetName === userNameLower ||
             userNameLower.includes(sheetName) ||
             sheetName === userFirstName ||
             sheetFirstName === userFirstName;
    });
    
    if (matchingOffers.length === 0) return 0;
    
    // Import matching offers
    for (const pending of matchingOffers) {
      await db.kpis.upsert({ user_id: userId, date: pending.date, offers: pending.offer_count, new_agents: 0, follow_ups: 0, phone_calls: 0, deals_under_contract: 0, deals_closed: 0, notes: '' });
      await db.pendingOffers.deleteById(pending.id);
    }
    
    return matchingOffers.length;
  } catch (error) {
    console.error('Error importing pending offers:', error);
    return 0;
  }
};

const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Mini Sparkline Component for trends
const Sparkline = ({ data, color = '#3b82f6', height = 40, width = 120 }) => {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');
  
  const trend = data[data.length - 1] - data[0];
  const trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : color;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={trendColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
        r="3"
        fill={trendColor}
      />
    </svg>
  );
};

// Streak Calculator
const calculateStreak = (userKPIs, goal) => {
  if (!userKPIs) return { current: 0, best: 0 };
  
  const dates = Object.keys(userKPIs).sort().reverse(); // Most recent first
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  
  // Calculate current streak (consecutive days hitting goal, starting from most recent)
  for (const date of dates) {
    const kpi = userKPIs[date];
    if ((kpi.offers || 0) >= goal) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  // Calculate best streak ever
  const sortedDates = Object.keys(userKPIs).sort();
  for (const date of sortedDates) {
    const kpi = userKPIs[date];
    if ((kpi.offers || 0) >= goal) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }
  
  return { current: currentStreak, best: bestStreak };
};

// Streak Display Component
const StreakBadge = ({ current, best }) => {
  if (current === 0 && best === 0) return null;
  
  const flames = current >= 7 ? '🔥🔥🔥' : current >= 3 ? '🔥🔥' : current >= 1 ? '🔥' : '';
  
  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl px-4 py-2 border border-orange-500/30">
      <div className="text-center">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-black text-orange-400">{current}</span>
          <span className="text-lg">{flames}</span>
        </div>
        <p className="text-orange-300/70 text-[10px] uppercase tracking-wide">Day Streak</p>
      </div>
      {best > 0 && (
        <div className="text-center border-l border-orange-500/30 pl-3">
          <div className="text-lg font-bold text-slate-400">{best}</div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wide">Best</p>
        </div>
      )}
    </div>
  );
};

// Circular Progress Component
const CircularProgress = ({ percentage, size = 140, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 100) return { stroke: '#22c55e', glow: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.6))' };
    if (percentage >= 75) return { stroke: '#eab308', glow: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.4))' };
    if (percentage >= 50) return { stroke: '#3b82f6', glow: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))' };
    return { stroke: '#6366f1', glow: 'none' };
  };
  
  const color = getColor();
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90" style={{ filter: color.glow }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color.stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${percentage >= 100 ? 'text-green-400' : 'text-white'}`}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

// Avatar component
const UserAvatar = ({ user, size = 'md' }) => {
  const sizeClasses = { sm: 'w-8 h-8 text-lg', md: 'w-10 h-10 text-xl', lg: 'w-16 h-16 text-3xl', xl: 'w-24 h-24 text-5xl' };
  const displayName = user?.display_name || user?.name || '?';
  const initial = displayName.charAt(0).toUpperCase();
  
  if (user?.avatar_url) return <img src={user.avatar_url} alt={displayName} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-slate-600`} />;
  if (user?.avatar_emoji) return <div className={`${sizeClasses[size]} rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600`}>{user.avatar_emoji}</div>;
  return <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold border-2 border-slate-600`}>{initial}</div>;
};

// Sleek Offers Card Component
const OffersCard = ({ offers, goal, isGoogleSync, onUpdate }) => {
  const percentage = Math.min((offers / goal) * 100, 100);
  const isComplete = offers >= goal;
  
  const getStatus = () => {
    if (isComplete) return { emoji: '🔥', text: 'GOAL CRUSHED!', color: 'from-green-400 to-emerald-400' };
    if (percentage >= 75) return { emoji: '⚡', text: 'ALMOST THERE!', color: 'from-yellow-400 to-amber-400' };
    if (percentage >= 50) return { emoji: '💪', text: 'HALFWAY!', color: 'from-blue-400 to-cyan-400' };
    if (offers > 0) return { emoji: '🎯', text: 'KEEP GOING!', color: 'from-indigo-400 to-purple-400' };
    return { emoji: '🤲', text: "BISMILLAH, LET'S GO!", color: 'from-slate-400 to-slate-400' };
  };
  
  const status = getStatus();

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${isComplete ? 'border-green-500/30 bg-gradient-to-br from-green-950/40 via-slate-800 to-slate-800' : 'border-slate-700 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900'}`}>
      {isComplete && <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent"></div>}
      
      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Offers Submitted</h3>
            {isGoogleSync && (
              <p className="text-xs sm:text-sm text-green-400 mt-0.5">📊 Synced from Google Sheets</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">{status.emoji}</span>
            <span className={`text-sm sm:text-lg font-extrabold tracking-wide bg-gradient-to-r ${status.color} bg-clip-text text-transparent`}>
              {status.text}
            </span>
          </div>
        </div>
        
        {/* Main Content - Stack on mobile, side by side on desktop */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <CircularProgress percentage={percentage} size={100} strokeWidth={8} />
          
          <div className="flex-1 w-full space-y-3 sm:space-y-4">
            <div className="text-center sm:text-left">
              <div className="flex items-baseline justify-center sm:justify-start gap-2">
                <span className={`text-3xl sm:text-4xl font-bold tracking-tight ${isComplete ? 'text-green-400' : 'text-white'}`}>{offers}</span>
                <span className="text-slate-500 text-base sm:text-lg font-medium">/ {goal}</span>
              </div>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">Daily Target</p>
            </div>
            
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Progress</span>
                <span>{Math.round(percentage)}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-400' : percentage >= 75 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : percentage >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-indigo-500 to-purple-400'}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
            
            <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 flex-wrap">
              {[25, 50, 75, 100].map((milestone) => (
                <div key={milestone} className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium transition-all ${percentage >= milestone ? milestone === 100 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>
                  {percentage >= milestone && <span>✓</span>}
                  <span>{milestone}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {!isGoogleSync && (
          <div className="flex gap-2 mt-4 sm:mt-6 pt-4 border-t border-slate-700/50">
            <button onClick={() => onUpdate(offers - 1)} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white py-2 sm:py-2.5 rounded-xl font-medium transition-all border border-slate-600/50 text-sm sm:text-base">− 1</button>
            <button onClick={() => onUpdate(offers + 1)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2 sm:py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 text-sm sm:text-base">+ 1</button>
            <button onClick={() => onUpdate(offers + 5)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2 sm:py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 text-sm sm:text-base">+ 5</button>
          </div>
        )}
      </div>
    </div>
  );
};

// iOS-style Notes Component (Mobile-First)
const NotesApp = ({ userId, notes, setNotes }) => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'editor'

  const filteredNotes = notes.filter(note => 
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createNewNote = async () => {
    const newNote = {
      user_id: userId,
      title: 'New Note',
      content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data } = await db.notes.create(newNote);
    if (data?.[0]) {
      setNotes(prev => [data[0], ...prev]);
      setSelectedNote(data[0]);
      setEditTitle(data[0].title);
      setEditContent(data[0].content || '');
      setMobileView('editor');
    }
  };

  const selectNote = (note) => {
    setSelectedNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setMobileView('editor');
  };

  const goBackToList = () => {
    setMobileView('list');
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    setIsSaving(true);
    const updates = {
      title: editTitle || 'Untitled',
      content: editContent,
      updated_at: new Date().toISOString()
    };
    await db.notes.update(selectedNote.id, updates);
    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, ...updates } : n));
    setSelectedNote(prev => ({ ...prev, ...updates }));
    setIsSaving(false);
  };

  const deleteNote = async () => {
    if (!selectedNote) return;
    if (!confirm('Delete this note?')) return;
    await db.notes.delete(selectedNote.id);
    setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
    setSelectedNote(null);
    setEditTitle('');
    setEditContent('');
    setMobileView('list');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { timeZone: ORG_TIMEZONE, hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { timeZone: ORG_TIMEZONE, weekday: 'long' });
    return date.toLocaleDateString('en-US', { timeZone: ORG_TIMEZONE, month: 'short', day: 'numeric' });
  };

  const getPreview = (content) => {
    if (!content) return 'No additional text';
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
  };

  // Mobile Note List
  const NoteList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>📝</span> Notes
          </h3>
          <button onClick={createNewNote} className="w-10 h-10 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center justify-center text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
          </button>
        </div>
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-700/50 text-white rounded-lg pl-9 pr-4 py-3 text-base border border-slate-600 focus:border-amber-500 focus:outline-none" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            {notes.length === 0 ? 'No notes yet. Create one!' : 'No notes found'}
          </div>
        ) : (
          filteredNotes.map(note => (
            <div key={note.id} onClick={() => selectNote(note)} className={`p-4 border-b border-slate-700/50 cursor-pointer transition-colors active:bg-slate-700/50 ${selectedNote?.id === note.id ? 'bg-amber-500/20 border-l-4 border-l-amber-500' : ''}`}>
              <h4 className="text-white font-medium text-base truncate">{note.title || 'Untitled'}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-500 text-sm">{formatDate(note.updated_at)}</span>
                <span className="text-slate-600 text-sm truncate">{getPreview(note.content)}</span>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 border-t border-slate-700 text-center">
        <span className="text-slate-500 text-sm">{notes.length} {notes.length === 1 ? 'Note' : 'Notes'}</span>
      </div>
    </div>
  );

  // Mobile Note Editor
  const NoteEditor = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <button onClick={goBackToList} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium py-2 px-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Notes
        </button>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-amber-400 text-xs">Saving...</span>}
          <button onClick={saveNote} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
          <button onClick={deleteNote} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      {selectedNote && (
        <>
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="px-4 py-3 bg-transparent text-white text-xl font-semibold border-none focus:outline-none placeholder-slate-600" />
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="Start typing..." className="flex-1 px-4 py-2 bg-transparent text-slate-300 text-base resize-none border-none focus:outline-none placeholder-slate-600 leading-relaxed" />
          <div className="p-3 border-t border-slate-700">
            <p className="text-slate-500 text-xs text-center">{selectedNote.updated_at && `Last edited ${formatDate(selectedNote.updated_at)}`}</p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden" style={{ minHeight: '400px', maxHeight: '70vh' }}>
      {/* Mobile Layout */}
      <div className="md:hidden h-full" style={{ minHeight: '400px' }}>
        {mobileView === 'list' ? <NoteList /> : <NoteEditor />}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full" style={{ height: '500px' }}>
        {/* Sidebar */}
        <div className="w-72 border-r border-slate-700 flex flex-col bg-slate-800/50">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📝</span> Notes
              </h3>
              <button onClick={createNewNote} className="w-8 h-8 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center justify-center text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              </button>
            </div>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-700/50 text-white rounded-lg pl-9 pr-4 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredNotes.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                {notes.length === 0 ? 'No notes yet. Create one!' : 'No notes found'}
              </div>
            ) : (
              filteredNotes.map(note => (
                <div key={note.id} onClick={() => selectNote(note)} className={`p-3 border-b border-slate-700/50 cursor-pointer transition-colors ${selectedNote?.id === note.id ? 'bg-amber-500/20 border-l-2 border-l-amber-500' : 'hover:bg-slate-700/30'}`}>
                  <h4 className="text-white font-medium text-sm truncate">{note.title || 'Untitled'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-slate-500 text-xs">{formatDate(note.updated_at)}</span>
                    <span className="text-slate-600 text-xs truncate">{getPreview(note.content)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 border-t border-slate-700 text-center">
            <span className="text-slate-500 text-xs">{notes.length} {notes.length === 1 ? 'Note' : 'Notes'}</span>
          </div>
        </div>
        
        {/* Editor */}
        <div className="flex-1 flex flex-col bg-slate-900/30">
          {selectedNote ? (
            <>
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="text-slate-500 text-xs">{selectedNote.updated_at && `Last edited ${formatDate(selectedNote.updated_at)}`}</div>
                <div className="flex items-center gap-2">
                  {isSaving && <span className="text-amber-400 text-xs">Saving...</span>}
                  <button onClick={saveNote} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
                  <button onClick={deleteNote} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="px-4 py-3 bg-transparent text-white text-xl font-semibold border-none focus:outline-none placeholder-slate-600" />
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="Start typing..." className="flex-1 px-4 py-2 bg-transparent text-slate-300 text-sm resize-none border-none focus:outline-none placeholder-slate-600 leading-relaxed" />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="text-4xl mb-3">📝</div>
                <p>Select a note or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// VIP Agents Section for Personal Tab
const VIPAgentsSection = ({ userId, vipAgents, setVipAgents }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ agent_name: '', phone: '', email: '', deal_closed: '', review_given: false, gift_sent: false });

  const resetForm = () => {
    setForm({ agent_name: '', phone: '', email: '', deal_closed: '', review_given: false, gift_sent: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.agent_name.trim()) return;
    
    try {
      if (editingId) {
        // Update existing
        const updates = {
          agent_name: form.agent_name,
          phone: form.phone,
          email: form.email,
          deal_closed: form.deal_closed,
          review_given: form.review_given,
          gift_sent: form.gift_sent,
          updated_at: new Date().toISOString()
        };
        await db.vipAgents.update(editingId, updates);
        setVipAgents(prev => prev.map(a => a.id === editingId ? { ...a, ...updates } : a));
      } else {
        // Create new
        const newAgent = {
          user_id: userId,
          agent_name: form.agent_name,
          phone: form.phone,
          email: form.email,
          deal_closed: form.deal_closed,
          review_given: form.review_given,
          gift_sent: form.gift_sent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const { data } = await db.vipAgents.create(newAgent);
        if (data?.[0]) {
          setVipAgents(prev => [data[0], ...prev]);
        }
      }
      resetForm();
    } catch (e) {
      alert('VIP agents table not set up yet. Run the SQL in Supabase first!');
    }
  };

  const handleEdit = (agent) => {
    setForm({
      agent_name: agent.agent_name || '',
      phone: agent.phone || '',
      email: agent.email || '',
      deal_closed: agent.deal_closed || '',
      review_given: agent.review_given || false,
      gift_sent: agent.gift_sent || false
    });
    setEditingId(agent.id);
    setIsAdding(true);
  };

  const handleDelete = async (agentId) => {
    if (!confirm('Delete this VIP agent?')) return;
    try {
      await db.vipAgents.delete(agentId);
      setVipAgents(prev => prev.filter(a => a.id !== agentId));
    } catch (e) {
      console.log('Delete failed');
    }
  };

  const toggleField = async (agent, field) => {
    try {
      const newValue = !agent[field];
      await db.vipAgents.update(agent.id, { [field]: newValue, updated_at: new Date().toISOString() });
      setVipAgents(prev => prev.map(a => a.id === agent.id ? { ...a, [field]: newValue } : a));
    } catch (e) {
      console.log('Toggle failed');
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl md:rounded-xl p-4 border border-slate-700/50 md:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span>⭐</span> VIP Agents
        </h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <span>+</span> Add VIP
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-slate-700/50 rounded-xl p-4 mb-4 border border-slate-600/50">
          <h4 className="text-white font-medium mb-3">{editingId ? 'Edit VIP Agent' : 'Add VIP Agent'}</h4>
          <div className="space-y-3">
            <input
              type="text"
              value={form.agent_name}
              onChange={(e) => setForm(prev => ({ ...prev, agent_name: e.target.value }))}
              placeholder="Agent Name *"
              className="w-full bg-slate-600 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone"
                className="bg-slate-600 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="bg-slate-600 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <input
              type="text"
              value={form.deal_closed}
              onChange={(e) => setForm(prev => ({ ...prev, deal_closed: e.target.value }))}
              placeholder="Deal Closed (e.g., 123 Main St - $50k)"
              className="w-full bg-slate-600 text-white rounded-lg px-3 py-2.5 text-sm border border-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.review_given}
                  onChange={(e) => setForm(prev => ({ ...prev, review_given: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-slate-300 text-sm">Review Given? ⭐</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.gift_sent}
                  onChange={(e) => setForm(prev => ({ ...prev, gift_sent: e.target.checked }))}
                  className="w-5 h-5 rounded bg-slate-600 border-slate-500 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-slate-300 text-sm">Gift Sent? 🎁</span>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={resetForm} 
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP Agents List */}
      <div className="space-y-3">
        {vipAgents.length === 0 && !isAdding ? (
          <div className="text-center py-6 text-slate-500">
            <span className="text-3xl block mb-2">⭐</span>
            <p className="text-sm">No VIP agents yet</p>
            <p className="text-xs mt-1">Add agents who helped close deals!</p>
          </div>
        ) : (
          vipAgents.map(agent => (
            <div key={agent.id} className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate">{agent.agent_name}</h4>
                  {agent.deal_closed && (
                    <p className="text-amber-400 text-xs mt-0.5 truncate">🏠 {agent.deal_closed}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {agent.phone && (
                      <a href={`tel:${agent.phone}`} className="text-slate-400 text-xs hover:text-blue-400 transition-colors">
                        📞 {agent.phone}
                      </a>
                    )}
                    {agent.email && (
                      <a href={`mailto:${agent.email}`} className="text-slate-400 text-xs hover:text-blue-400 transition-colors truncate">
                        ✉️ {agent.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEdit(agent)} 
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(agent.id)} 
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {/* Checkboxes */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-600/30">
                <button 
                  onClick={() => toggleField(agent, 'review_given')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    agent.review_given 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-slate-600/50 text-slate-400 border border-slate-500/30 hover:border-slate-400'
                  }`}
                >
                  {agent.review_given ? '✅' : '⬜'} Review Given
                </button>
                <button 
                  onClick={() => toggleField(agent, 'gift_sent')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    agent.gift_sent 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                      : 'bg-slate-600/50 text-slate-400 border border-slate-500/30 hover:border-slate-400'
                  }`}
                >
                  {agent.gift_sent ? '🎁' : '⬜'} Gift Sent
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Quick Notes Widget for Personal Tab
const QuickNotesWidget = ({ notes, setNotes, userId, onOpenFullNotes }) => {
  const [quickNote, setQuickNote] = useState('');
  const latestNote = notes[0];

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { timeZone: ORG_TIMEZONE, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const saveQuickNote = async () => {
    if (!quickNote.trim()) return;
    
    const newNote = {
      user_id: userId,
      title: quickNote.substring(0, 30) + (quickNote.length > 30 ? '...' : ''),
      content: quickNote,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data } = await db.notes.create(newNote);
    if (data?.[0]) {
      setNotes(prev => [data[0], ...prev]);
      setQuickNote('');
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span>📝</span> Quick Notes
        </h3>
        <button onClick={onOpenFullNotes} className="text-amber-400 hover:text-amber-300 text-sm font-medium">
          View All →
        </button>
      </div>
      
      {/* Quick add */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && saveQuickNote()}
          placeholder="Jot something down..."
          className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={saveQuickNote}
          className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>
      
      {/* Recent notes preview */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-2">No notes yet</p>
        ) : (
          notes.slice(0, 3).map(note => (
            <div key={note.id} className="bg-slate-700/50 rounded-lg p-2 cursor-pointer hover:bg-slate-700 transition-colors" onClick={onOpenFullNotes}>
              <div className="flex justify-between items-start">
                <p className="text-white text-sm font-medium truncate flex-1">{note.title || 'Untitled'}</p>
                <span className="text-slate-500 text-xs ml-2">{formatDate(note.updated_at)}</span>
              </div>
              {note.content && (
                <p className="text-slate-400 text-xs mt-1 truncate">{note.content.substring(0, 60)}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
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
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentTab, setCurrentTab] = useState('personal');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('week');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('daily');
  const [historyDate, setHistoryDate] = useState(getTodayInOrgTimezone());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: '', avatar_emoji: '', avatar_url: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [kpiGoals, setKpiGoals] = useState(DEFAULT_KPI_GOALS);
  const [kpiSaving, setKpiSaving] = useState(false);
  const [personalGoals, setPersonalGoals] = useState(null); // User's personal goal overrides
  const [personalGoalsSaving, setPersonalGoalsSaving] = useState(false);
  const [showPersonalGoalsEditor, setShowPersonalGoalsEditor] = useState(false);
  const [userNotes, setUserNotes] = useState([]);
  const [vipAgents, setVipAgents] = useState([]);
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [approvedNames, setApprovedNames] = useState([]);
  const [newApprovedName, setNewApprovedName] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Deals tracking state
  const [deals, setDeals] = useState([]);
  const [dealsYear, setDealsYear] = useState(new Date().getFullYear());
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [showRevenueOnHome, setShowRevenueOnHome] = useState(true); // User preference for showing revenue on home
  const [dealForm, setDealForm] = useState({
    property_address: '',
    uc_price: '',
    sold_price: '',
    split_with_user_id: '',
    split_percentage: '50',
    split_type: 'percentage',
    split_amount: '',
    closed_date: getTodayInOrgTimezone(),
    notes: '',
    deal_source: 'on_market',
    original_list_price: '',
    had_price_reduction: false,
    original_uc_price: '',
    deal_type: 'wholesale',
    sale_price: '',
    commission_amount: '',
    list_back_secured: false,
    list_back_commission_pct: '',
    purchase_contract_url: '',
    assignment_contract_url: '',
    hud_url: '',
    dispo_help: false,
    dispo_name: '',
    dispo_email: '',
    dispo_phone: '',
    dispo_share_type: 'percentage',
    dispo_share_percentage: '',
    dispo_share_amount: '',
    // New fields for realtor commission and attorney
    realtor_commission_paid: false,
    realtor_commission_type: 'percentage',
    realtor_commission_percentage: '',
    realtor_commission_amount: '',
    attorney_used: false,
    attorney_fee: ''
  });
  const [dealFiles, setDealFiles] = useState({
    purchase_contract: null,
    assignment_contract: null,
    hud: null
  });
  
  // Upload file to Supabase Storage
  const uploadDealDocument = async (file, dealId, docType) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${organization.id}/${dealId}/${docType}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('deal-documents')
      .upload(fileName, file, { upsert: true });
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from('deal-documents')
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };
  const [lastOfferCount, setLastOfferCount] = useState(0);

  const today = getTodayInOrgTimezone();

  const getGoals = () => organization?.kpi_goals ? { ...DEFAULT_KPI_GOALS, ...organization.kpi_goals } : DEFAULT_KPI_GOALS;

  const getMotivation = () => {
    const h = getCurrentHourInOrgTimezone();
    const goals = getGoals();
    const myKPI = getMyKPI();
    const totalTexts = (myKPI.new_agents || 0) + (myKPI.follow_ups || 0);
    
    if ((myKPI.offers || 0) >= goals.daily_offers && totalTexts >= (goals.daily_new_agents + goals.daily_follow_ups)) {
      return { emoji: '👑', text: 'LEGENDARY STATUS' };
    }
    if ((myKPI.offers || 0) >= goals.daily_offers) {
      return { emoji: '🔥', text: 'ON FIRE TODAY' };
    }
    if (h < 9) return { emoji: '🌅', text: 'RISE & GRIND' };
    if (h < 12) return { emoji: '⚡', text: 'PEAK HOURS' };
    if (h < 15) return { emoji: '🚀', text: 'UNSTOPPABLE' };
    if (h < 18) return { emoji: '🎯', text: 'FINISH STRONG' };
    if (h < 21) return { emoji: '💎', text: 'CLOSING TIME' };
    return { emoji: '🌙', text: 'NIGHT GRIND' };
  };

  useEffect(() => {
    checkSession();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser && organization) {
      loadTeamData();
      loadUserNotes();
      loadVipAgents();
      loadDeals();
      if (organization.kpi_goals) setKpiGoals({ ...DEFAULT_KPI_GOALS, ...organization.kpi_goals });
    }
  }, [currentUser, organization]);

  useEffect(() => {
    // Refresh data whenever tab changes (ensures fresh data on all tabs including personal)
    if (currentUser && organization) loadTeamData();
  }, [currentTab]);

  const loadUserNotes = async () => {
    if (!currentUser) return;
    const { data } = await db.notes.getByUser(currentUser.id);
    if (data) setUserNotes(data);
  };

  const loadVipAgents = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await db.vipAgents.getByUser(currentUser.id);
      if (data && !error) setVipAgents(data);
    } catch (e) {
      console.log('VIP agents table not ready yet');
    }
  };

  const loadDeals = async (year = dealsYear) => {
    if (!currentUser || !organization) return;
    try {
      let data;
      if (currentUser.role === 'owner') {
        // Owner sees all deals for the org
        const result = await db.deals.getByOrgAndYear(organization.id, year);
        data = result.data;
      } else {
        // Team member sees only their deals (as primary or split partner)
        const result = await db.deals.getByUserAndYear(currentUser.id, year);
        data = result.data;
      }
      if (data) setDeals(data);
    } catch (e) {
      console.log('Deals table not ready yet');
    }
  };

  const checkSession = async () => {
    const saved = localStorage.getItem('momentum_user');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setProfileForm({ display_name: user.display_name || '', avatar_emoji: user.avatar_emoji || '', avatar_url: user.avatar_url || '' });
      setShowRevenueOnHome(user.show_revenue_home !== false); // Default to true if not set
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
    const { data: approvedList } = await db.approvedNames.getByOrg(organization.id);
    if (approvedList) setApprovedNames(approvedList);
  };

  const handleOwnerSignup = async () => {
    setError(''); setSuccessMessage('');
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.orgName) { setError('Please fill in all fields'); return; }
    if (signupForm.password !== signupForm.confirm) { setError('Passwords do not match'); return; }
    if (signupForm.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    
    // Check if email already exists in users table
    const { data: existing } = await db.users.getByEmail(signupForm.email);
    if (existing?.length > 0) { setError('Email already registered. Please login instead.'); return; }
    
    // Sign up with Supabase Auth (sends verification email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupForm.email.toLowerCase().trim(),
      password: signupForm.password,
      options: {
        data: {
          name: signupForm.name,
          org_name: signupForm.orgName,
          role: 'owner'
        }
      }
    });
    
    if (authError) { setError(authError.message); return; }
    
    // Show verification message
    setSuccessMessage('✅ Check your email! Click the verification link to complete signup.');
    setAuthMode('verify');
  };

  const handleMemberSignup = async () => {
    setError(''); setSuccessMessage('');
    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.inviteCode) { setError('Please fill in all fields including invite code'); return; }
    if (signupForm.password !== signupForm.confirm) { setError('Passwords do not match'); return; }
    if (signupForm.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    
    // Validate invite code first
    const { data: inviteData } = await db.invites.getByCode(signupForm.inviteCode.toUpperCase());
    if (!inviteData?.[0]) { setError('Invalid or expired invite code'); return; }
    const invite = inviteData[0];
    
    // Verify name exists in pending_offers (Google Sheet) OR approved_names list
    const { data: pendingOffers } = await db.pendingOffers.getByOrg(invite.organization_id);
    const { data: approvedList } = await db.approvedNames.getByOrg(invite.organization_id);
    
    const signupNameLower = signupForm.name.toLowerCase().trim();
    const signupFirstName = signupNameLower.split(' ')[0];
    
    // Check pending_offers (from Google Sheet)
    const matchedInPending = (pendingOffers || []).some(pending => {
      const sheetName = (pending.rep_name || '').toLowerCase().trim();
      const sheetFirstName = sheetName.split(' ')[0];
      return sheetName === signupNameLower ||
             signupNameLower.includes(sheetName) ||
             sheetName === signupFirstName ||
             sheetFirstName === signupFirstName;
    });
    
    // Check approved_names list
    const matchedInApproved = (approvedList || []).some(approved => {
      const approvedName = (approved.name || '').toLowerCase().trim();
      const approvedFirstName = approvedName.split(' ')[0];
      return approvedName === signupNameLower ||
             signupNameLower.includes(approvedName) ||
             approvedName === signupFirstName ||
             approvedFirstName === signupFirstName;
    });
    
    if (!matchedInPending && !matchedInApproved) {
      setError('Your name was not found in the team roster. Please contact your team admin.');
      return;
    }
    
    // Check if email already exists
    const { data: existing } = await db.users.getByEmail(signupForm.email);
    if (existing?.length > 0) { setError('Email already registered. Please login instead.'); return; }
    
    // Sign up with Supabase Auth (sends verification email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupForm.email.toLowerCase().trim(),
      password: signupForm.password,
      options: {
        data: {
          name: signupForm.name,
          invite_code: signupForm.inviteCode.toUpperCase(),
          role: 'member'
        }
      }
    });
    
    if (authError) { setError(authError.message); return; }
    
    // Show verification message
    setSuccessMessage('✅ Check your email! Click the verification link to complete signup.');
    setAuthMode('verify');
  };

  const handleLogin = async () => {
    setError(''); setSuccessMessage('');
    if (!loginForm.email || !loginForm.password) { setError('Please enter email and password'); return; }
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginForm.email.toLowerCase().trim(),
      password: loginForm.password
    });
    
    if (authError) { 
      if (authError.message.includes('Email not confirmed')) {
        setError('Please verify your email first. Check your inbox for the verification link.');
      } else {
        setError('Invalid email or password');
      }
      return; 
    }
    
    const authUser = authData.user;
    const metadata = authUser.user_metadata;
    
    // Check if user exists in our users table
    let { data: users } = await db.users.getByEmail(authUser.email);
    let user = users?.[0];
    
    // If user doesn't exist in users table, create them (first login after verification)
    if (!user) {
      if (metadata.role === 'owner') {
        // Create organization first
        const { data: orgData, error: orgError } = await db.orgs.create({ 
          name: metadata.org_name, 
          kpi_goals: DEFAULT_KPI_GOALS 
        });
        if (orgError || !orgData?.[0]) { setError('Failed to create organization'); return; }
        const org = orgData[0];
        
        // Create user
        const { data: userData, error: userError } = await db.users.create({ 
          name: metadata.name, 
          email: authUser.email.toLowerCase().trim(), 
          password_hash: 'supabase_auth', 
          role: 'owner', 
          organization_id: org.id, 
          display_name: null, 
          avatar_emoji: null, 
          avatar_url: null 
        });
        if (userError || !userData?.[0]) { setError('Failed to create account'); return; }
        user = userData[0];
        await importPendingOffers(user.id, user.name, org.id);
      } else if (metadata.role === 'member' && metadata.invite_code) {
        // Get invite code info
        const { data: inviteData } = await db.invites.getByCode(metadata.invite_code);
        if (!inviteData?.[0]) { setError('Your invite code is no longer valid'); return; }
        const invite = inviteData[0];
        
        // Create user
        const { data: userData, error: userError } = await db.users.create({ 
          name: metadata.name, 
          email: authUser.email.toLowerCase().trim(), 
          password_hash: 'supabase_auth', 
          role: 'member', 
          organization_id: invite.organization_id, 
          display_name: null, 
          avatar_emoji: null, 
          avatar_url: null 
        });
        if (userError || !userData?.[0]) { setError('Failed to create account'); return; }
        user = userData[0];
        // Invite code stays active for reuse by other team members
        await importPendingOffers(user.id, user.name, invite.organization_id);
      } else {
        setError('Account setup incomplete. Please sign up again.');
        return;
      }
    }
    
    // Get organization
    const { data: orgs } = await db.orgs.getById(user.organization_id);
    
    localStorage.setItem('momentum_user', JSON.stringify(user));
    setCurrentUser(user);
    setProfileForm({ display_name: user.display_name || '', avatar_emoji: user.avatar_emoji || '', avatar_url: user.avatar_url || '' });
    setOrganization(orgs?.[0] || null);
    setView('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('momentum_user');
    setCurrentUser(null);
    setOrganization(null);
    setTeamMembers([]);
    setTeamKPIs({});
    setUserNotes([]);
    setView('auth');
  };

  const handleForgotPassword = async () => {
    setError(''); setSuccessMessage('');
    if (!forgotEmail) { setError('Please enter your email'); return; }
    
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}`
    });
    
    if (error) { setError(error.message); return; }
    
    setSuccessMessage('✅ Password reset email sent! Check your inbox.');
  };

  const generateInvite = async (useCustom = false) => {
    let code;
    if (useCustom && customInviteCode.trim()) {
      code = customInviteCode.trim().toUpperCase();
      // Check if code already exists (active or inactive)
      const { data: existing } = await db.invites.getByCodeAll(code);
      if (existing?.length > 0) {
        const existingCode = existing[0];
        if (existingCode.is_active) {
          alert('This invite code is already active!');
          setCustomInviteCode('');
          return;
        } else {
          // Reactivate the old code
          await db.invites.reactivate(code);
          setCustomInviteCode('');
          loadTeamData();
          return;
        }
      }
    } else {
      code = generateInviteCode();
    }
    await db.invites.create({ code, organization_id: organization.id, created_by: currentUser.id });
    setCustomInviteCode('');
    loadTeamData();
  };

  const deleteInvite = async (inviteId, inviteCode) => {
    if (!confirm(`Delete invite code "${inviteCode}"?`)) return;
    await db.invites.delete(inviteId);
    loadTeamData();
  };

  const resyncUser = async (user) => {
    const count = await importPendingOffers(user.id, user.name, user.organization_id);
    if (count > 0) {
      alert(`✅ Synced ${count} offer record(s) for ${user.name}!`);
      loadTeamData();
    } else {
      alert(`No pending offers found for "${user.name}" in Google Sheets.`);
    }
  };

  const addApprovedName = async () => {
    if (!newApprovedName.trim()) return;
    await db.approvedNames.create(newApprovedName.trim(), organization.id);
    setNewApprovedName('');
    loadTeamData();
  };

  const deleteApprovedName = async (id, name) => {
    if (!confirm(`Remove "${name}" from approved list?`)) return;
    await db.approvedNames.delete(id);
    loadTeamData();
  };

  const openProfileModal = () => {
    setProfileForm({ display_name: currentUser.display_name || '', avatar_emoji: currentUser.avatar_emoji || '', avatar_url: currentUser.avatar_url || '' });
    setShowProfileModal(true);
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const updates = { display_name: profileForm.display_name || null, avatar_emoji: profileForm.avatar_emoji || null, avatar_url: profileForm.avatar_url || null };
      await db.users.update(currentUser.id, updates);
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      localStorage.setItem('momentum_user', JSON.stringify(updatedUser));
      setTeamMembers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      setShowProfileModal(false);
    } catch (error) { console.error('Failed to save profile:', error); }
    setProfileSaving(false);
  };

  const toggleShowRevenueOnHome = async () => {
    const newValue = !showRevenueOnHome;
    setShowRevenueOnHome(newValue);
    try {
      await db.users.update(currentUser.id, { show_revenue_home: newValue });
      const updatedUser = { ...currentUser, show_revenue_home: newValue };
      setCurrentUser(updatedUser);
      localStorage.setItem('momentum_user', JSON.stringify(updatedUser));
    } catch (error) { 
      console.error('Failed to save preference:', error); 
      setShowRevenueOnHome(!newValue); // Revert on error
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { alert('Image too large. Please use an image under 500KB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm(prev => ({ ...prev, avatar_url: reader.result, avatar_emoji: '' }));
    reader.readAsDataURL(file);
  };

  const selectEmoji = (emoji) => setProfileForm(prev => ({ ...prev, avatar_emoji: emoji, avatar_url: '' }));
  const clearAvatar = () => setProfileForm(prev => ({ ...prev, avatar_emoji: '', avatar_url: '' }));

  const handleKpiGoalsSave = async () => {
    setKpiSaving(true);
    try {
      await db.orgs.update(organization.id, { kpi_goals: kpiGoals });
      setOrganization(prev => ({ ...prev, kpi_goals: kpiGoals }));
      alert('KPI goals saved!');
    } catch (error) { console.error('Failed to save KPI goals:', error); alert('Failed to save KPI goals'); }
    setKpiSaving(false);
  };

  const getMyKPI = () => teamKPIs[currentUser?.id]?.[today] || { offers: 0, new_agents: 0, follow_ups: 0, phone_calls: 0, deals_under_contract: 0, deals_closed: 0, list_backs: 0, notes: '' };

  const updateKPI = async (field, value) => {
    const current = getMyKPI();
    const newValue = typeof value === 'string' ? value : Math.max(0, value);
    const updated = { ...current, [field]: newValue, user_id: currentUser.id, date: today };
    
    // Check if this update causes them to hit their offer goal for the first time today
    if (field === 'offers') {
      const wasUnderGoal = (current.offers || 0) < goals.daily_offers;
      const nowAtGoal = newValue >= goals.daily_offers;
      if (wasUnderGoal && nowAtGoal) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
      }
    }
    
    setTeamKPIs(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], [today]: updated } }));
    const { error } = await db.kpis.upsert({ user_id: currentUser.id, date: today, offers: updated.offers || 0, new_agents: updated.new_agents || 0, follow_ups: updated.follow_ups || 0, phone_calls: updated.phone_calls || 0, deals_under_contract: updated.deals_under_contract || 0, deals_closed: updated.deals_closed || 0, list_backs: updated.list_backs || 0, notes: updated.notes || '' });
    if (error) console.error('KPI save failed:', error);
  };

  const getStats = (userId, period) => {
    const userKPIs = teamKPIs[userId] || {};
    
    // Use org timezone for all date calculations
    const todayStr = getTodayInOrgTimezone();
    const [year, month, day] = todayStr.split('-').map(Number);
    const now = new Date(year, month - 1, day); // Create date from org timezone's "today"
    
    let startDateStr, endDateStr;
    if (period === 'week') {
      // Week starts on MONDAY and ends on SUNDAY
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = go back 6 days, else go back (day - 1)
      const startDate = new Date(now); startDate.setDate(now.getDate() - daysFromMonday);
      const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
      startDateStr = formatDateString(startDate); endDateStr = formatDateString(endDate);
    } else if (period === 'month') {
      startDateStr = formatDateString(new Date(year, month - 1, 1));
      endDateStr = formatDateString(new Date(year, month, 0));
    } else if (period === 'quarter') {
      const quarter = Math.floor((month - 1) / 3);
      startDateStr = formatDateString(new Date(year, quarter * 3, 1));
      endDateStr = formatDateString(new Date(year, quarter * 3 + 3, 0));
    } else {
      startDateStr = endDateStr = todayStr;
    }
    return Object.entries(userKPIs).reduce((acc, [date, kpi]) => {
      if (date >= startDateStr && date <= endDateStr) {
        return { offers: acc.offers + (kpi.offers || 0), texts: acc.texts + (kpi.new_agents || 0) + (kpi.follow_ups || 0), calls: acc.calls + (kpi.phone_calls || 0), contracts: acc.contracts + (kpi.deals_under_contract || 0), closed: acc.closed + (kpi.deals_closed || 0) };
      }
      return acc;
    }, { offers: 0, texts: 0, calls: 0, contracts: 0, closed: 0 });
  };

  const getTeamTotals = (period) => {
    const statsPeriod = period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : period === 'quarterly' ? 'quarter' : period;
    return teamMembers.reduce((t, user) => {
      const kpi = period === 'daily' ? (teamKPIs[user.id]?.[today] || {}) : getStats(user.id, statsPeriod);
      const s = period === 'daily' ? { offers: kpi.offers || 0, texts: (kpi.new_agents || 0) + (kpi.follow_ups || 0), calls: kpi.phone_calls || 0, contracts: kpi.deals_under_contract || 0, closed: kpi.deals_closed || 0 } : kpi;
      return { offers: t.offers + s.offers, texts: t.texts + s.texts, calls: t.calls + s.calls, contracts: t.contracts + s.contracts, closed: t.closed + s.closed };
    }, { offers: 0, texts: 0, calls: 0, contracts: 0, closed: 0 });
  };

  const getLeaderboard = () => {
    const period = leaderboardPeriod === 'week' ? 'week' : 'month';
    return teamMembers.map(user => {
      const s = getStats(user.id, period);
      return { user, stats: s, score: s.offers + s.texts + s.calls + s.contracts * 10 + s.closed * 20 };
    }).sort((a, b) => b.score - a.score);
  };

  const exportCSV = () => {
    let csv = 'Member,Date,Offers,New Agents,Follow Ups,Calls,Deals UC,Deals Closed,Notes\n';
    teamMembers.forEach(user => {
      const name = user.display_name || user.name;
      Object.entries(teamKPIs[user.id] || {}).forEach(([date, k]) => {
        csv += `"${name}","${date}",${k.offers || 0},${k.new_agents || 0},${k.follow_ups || 0},${k.phone_calls || 0},${k.deals_under_contract || 0},${k.deals_closed || 0},"${(k.notes || '').replace(/"/g, '""')}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `momentum-${today}.csv`; a.click();
  };

  const copySummary = () => {
    const t = getTeamTotals('daily');
    let s = `⚡ MOMENTUM - ${new Date().toLocaleDateString('en-US', { timeZone: ORG_TIMEZONE, weekday: 'long', month: 'long', day: 'numeric' })}\n\nTEAM: ${t.offers} offers | ${t.texts} texts | ${t.calls} calls\n\n`;
    teamMembers.forEach(u => { const k = teamKPIs[u.id]?.[today] || {}; s += `${u.display_name || u.name}: ${k.offers || 0} offers, ${(k.new_agents || 0) + (k.follow_ups || 0)} texts, ${k.phone_calls || 0} calls\n`; });
    navigator.clipboard.writeText(s); alert('Copied!');
  };

  const goals = getGoals();
  const myKPI = getMyKPI();
  const totalTexts = (myKPI.new_agents || 0) + (myKPI.follow_ups || 0);
  const weeklyStats = getStats(currentUser?.id, 'week');
  const monthlyStats = getStats(currentUser?.id, 'month');
  const displayName = currentUser?.display_name || currentUser?.name;
  const motivation = getMotivation();
  const streak = calculateStreak(teamKPIs[currentUser?.id], goals.daily_offers);
  
  // Get last 7 days data for sparklines
  const getLast7DaysData = (userId, field) => {
    const userKPIs = teamKPIs[userId] || {};
    const data = [];
    const todayStr = getTodayInOrgTimezone();
    const [year, month, day] = todayStr.split('-').map(Number);
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(year, month - 1, day - i);
      const dateStr = formatDateString(d);
      const kpi = userKPIs[dateStr] || {};
      if (field === 'texts') {
        data.push((kpi.new_agents || 0) + (kpi.follow_ups || 0));
      } else {
        data.push(kpi[field] || 0);
      }
    }
    return data;
  };

  // Get this week's data (Monday-Sunday calendar week)
  const getThisWeekTotal = (userId, field) => {
    const userKPIs = teamKPIs[userId] || {};
    const todayStr = getTodayInOrgTimezone();
    const [year, month, day] = todayStr.split('-').map(Number);
    const today = new Date(year, month - 1, day);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days back, else day - 1
    
    let total = 0;
    for (let i = daysFromMonday; i >= 0; i--) {
      const d = new Date(year, month - 1, day - i);
      const dateStr = formatDateString(d);
      const kpi = userKPIs[dateStr] || {};
      if (field === 'texts') {
        total += (kpi.new_agents || 0) + (kpi.follow_ups || 0);
      } else {
        total += kpi[field] || 0;
      }
    }
    return total;
  };
  
  const myOffersTrend = getLast7DaysData(currentUser?.id, 'offers');
  const myCallsTrend = getLast7DaysData(currentUser?.id, 'phone_calls');
  const myTextsTrend = getLast7DaysData(currentUser?.id, 'texts');
  
  // This week totals (Mon-Sun)
  const myOffersThisWeek = getThisWeekTotal(currentUser?.id, 'offers');
  const myCallsThisWeek = getThisWeekTotal(currentUser?.id, 'phone_calls');
  const myTextsThisWeek = getThisWeekTotal(currentUser?.id, 'texts');

  const pct = (c, g) => Math.min((c / g) * 100, 100);
  const pColor = (c, g) => pct(c, g) >= 100 ? 'bg-green-500' : pct(c, g) >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  if (view === 'loading') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-pulse">⚡</div>
        <div className="text-white text-xl font-bold">Loading Momentum...</div>
        <div className="mt-4 w-48 h-1 bg-slate-700 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-loading-bar"></div>
        </div>
      </div>
      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚡</div>
            <h1 className="text-4xl font-bold text-white mb-2">Momentum</h1>
            <p className="text-slate-400 text-sm">Track. Compete. Dominate.</p>
          </div>
          {authMode !== 'verify' && authMode !== 'forgot' && (
            <div className="flex gap-1 mb-6 bg-slate-700 p-1 rounded-lg">
              <button onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Login</button>
              <button onClick={() => { setAuthMode('owner'); setError(''); setSuccessMessage(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === 'owner' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>New Team</button>
              <button onClick={() => { setAuthMode('member'); setError(''); setSuccessMessage(''); }} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${authMode === 'member' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Join Team</button>
            </div>
          )}
          {error && <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}
          {successMessage && <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg mb-4 text-sm">{successMessage}</div>}
          {authMode === 'login' && (
            <div className="space-y-4">
              <input type="email" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">Login</button>
              <button onClick={() => { setAuthMode('forgot'); setError(''); setSuccessMessage(''); }} className="w-full text-slate-400 hover:text-white text-sm transition">Forgot Password?</button>
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
          {authMode === 'verify' && (
            <div className="space-y-4 text-center">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-white">Check Your Email!</h2>
              <p className="text-slate-400">We sent a verification link to your email address. Click the link to verify your account, then come back here to login.</p>
              <button onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); setSignupForm({ name: '', email: '', password: '', confirm: '', inviteCode: '', orgName: '' }); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">← Back to Login</button>
            </div>
          )}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm text-center">Enter your email to reset your password</p>
              <input type="email" placeholder="Email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <button onClick={handleForgotPassword} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">Send Reset Link</button>
              <button onClick={() => { setAuthMode('login'); setError(''); setSuccessMessage(''); setForgotEmail(''); }} className="w-full text-slate-400 hover:text-white text-sm transition">← Back to Login</button>
            </div>
          )}
          <p className="text-slate-600 text-center text-xs mt-6">Powered by AI Coastal Bridge</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 md:p-4 pb-24 md:pb-4">
      <Confetti active={showConfetti} />
      <div className="max-w-6xl mx-auto">
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Edit Profile</h2>
              <div className="flex justify-center mb-4"><UserAvatar user={{ ...currentUser, ...profileForm }} size="xl" /></div>
              <div className="mb-4">
                <label className="text-slate-400 text-sm mb-1 block">Display Name</label>
                <input type="text" placeholder={currentUser?.name || 'Display Name'} value={profileForm.display_name} onChange={e => setProfileForm(prev => ({ ...prev, display_name: e.target.value }))} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none" />
                <p className="text-slate-500 text-xs mt-1">Leave blank to use your signup name: {currentUser?.name}</p>
              </div>
              <div className="mb-4">
                <label className="text-slate-400 text-sm mb-2 block">Avatar</label>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg mb-3 flex items-center justify-center gap-2">📷 Upload Photo</button>
                <p className="text-slate-500 text-xs mb-2">Or choose an emoji:</p>
                <div className="grid grid-cols-10 gap-1 bg-slate-700 p-2 rounded-lg max-h-32 overflow-y-auto">
                  {AVATAR_EMOJIS.map(emoji => <button key={emoji} onClick={() => selectEmoji(emoji)} className={`text-xl p-1 rounded hover:bg-slate-600 ${profileForm.avatar_emoji === emoji ? 'bg-blue-600' : ''}`}>{emoji}</button>)}
                </div>
                {(profileForm.avatar_emoji || profileForm.avatar_url) && <button onClick={clearAvatar} className="w-full text-red-400 hover:text-red-300 text-sm mt-2">✕ Remove Avatar</button>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowProfileModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg">Cancel</button>
                <button onClick={handleProfileSave} disabled={profileSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg disabled:opacity-50">{profileSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ========== MOBILE HEADER (Clean, minimal) ========== */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <div>
                <h1 className="text-lg font-bold text-white">{organization?.name || 'Momentum'}</h1>
                <p className="text-slate-500 text-xs">{currentTime.toLocaleDateString('en-US', { timeZone: ORG_TIMEZONE, weekday: 'short', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
            <button onClick={openProfileModal} className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-slate-700 hover:ring-blue-500 transition-all">
              <UserAvatar user={currentUser} size="md" />
            </button>
          </div>
        </div>

        {/* ========== DESKTOP HEADER (unchanged) ========== */}
        <div className="hidden md:block bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">⚡</span>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{organization?.name || 'Momentum'}</h1>
                <p className="text-slate-400 text-sm">{currentTime.toLocaleDateString('en-US', { timeZone: ORG_TIMEZONE, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-white tracking-tight">{currentTime.toLocaleTimeString('en-US', { timeZone: ORG_TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-4xl">{motivation.emoji}</span>
                <span className="text-2xl font-extrabold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">{motivation.text}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={openProfileModal} className="hover:opacity-80 transition"><UserAvatar user={currentUser} size="md" /></button>
              <div className="text-right">
                <p className="text-white font-semibold">{displayName}</p>
                <p className="text-slate-400 text-xs">{currentUser?.role === 'owner' ? '👑 Owner' : '👤 Member'}</p>
              </div>
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm">Logout</button>
            </div>
          </div>
          
          {/* Desktop Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {['personal', 'team', 'analytics', 'deals', 'history', 'notes'].map(tab => (
              <button key={tab} onClick={() => setCurrentTab(tab)} className={`px-3 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${currentTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                {tab === 'notes' ? '📝 Notes' : tab === 'deals' ? '💰 Deals' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            {currentUser?.role === 'owner' && (
              <button onClick={() => setCurrentTab('admin')} className={`px-3 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${currentTab === 'admin' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Admin</button>
            )}
          </div>
        </div>

        {/* ========== MOBILE BOTTOM NAV ========== */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-2 z-40">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {[
              { id: 'personal', icon: '🏠', label: 'Home' },
              { id: 'team', icon: '🏆', label: 'Team' },
              { id: 'analytics', icon: '📊', label: 'Stats' },
              { id: 'deals', icon: '💰', label: 'Deals' },
              { id: 'notes', icon: '📝', label: 'Notes' },
              { id: 'more', icon: '•••', label: 'More' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'more') {
                    // Toggle between history and admin
                    if (currentTab === 'history' || currentTab === 'admin') {
                      setCurrentTab('personal');
                    } else {
                      setCurrentTab('history');
                    }
                  } else {
                    setCurrentTab(tab.id);
                  }
                }}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                  (tab.id === currentTab || (tab.id === 'more' && (currentTab === 'history' || currentTab === 'admin')))
                    ? 'text-blue-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
              </button>
            ))}
          </div>
          {/* Safe area padding for iPhone */}
          <div className="h-safe-area-inset-bottom" />
        </div>

        {currentTab === 'personal' && (
          <div className="space-y-4">
            {/* Mobile: Motivation Banner */}
            <div className="md:hidden bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Hey {displayName?.split(' ')[0] || 'there'} 👋</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl">{motivation.emoji}</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{motivation.text}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{currentTime.toLocaleTimeString('en-US', { timeZone: ORG_TIMEZONE, hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              {/* Mobile Streak */}
              {(streak.current > 0 || streak.best > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <StreakBadge current={streak.current} best={streak.best} />
                </div>
              )}
            </div>

            {/* Desktop: Profile Card with Streak */}
            <div className="hidden md:flex bg-slate-800 rounded-xl p-4 border border-slate-700 items-center gap-4">
              <button onClick={openProfileModal} className="hover:opacity-80 transition"><UserAvatar user={currentUser} size="lg" /></button>
              <div className="flex-1 text-left">
                <p className="text-white font-bold text-xl">{displayName}</p>
                <p className="text-slate-400 text-sm">Your daily KPIs</p>
              </div>
              {(streak.current > 0 || streak.best > 0) && (
                <StreakBadge current={streak.current} best={streak.best} />
              )}
              <button onClick={openProfileModal} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium">✏️ Edit Profile</button>
            </div>

            {/* Combined Revenue Widget - Only shown if user has enabled it */}
            {showRevenueOnHome && (() => {
              const currentYear = new Date().getFullYear();
              
              // Wholesale deals
              const wholesaleDeals = deals.filter(d => {
                const dealYear = new Date(d.closed_date).getFullYear();
                return dealYear === currentYear && d.deal_type !== 'traditional';
              });
              const wholesaleRevenue = wholesaleDeals.reduce((sum, d) => sum + parseFloat(d.revenue || 0), 0);
              
              // Traditional deals
              const traditionalDeals = deals.filter(d => {
                const dealYear = new Date(d.closed_date).getFullYear();
                return dealYear === currentYear && d.deal_type === 'traditional';
              });
              const traditionalRevenue = traditionalDeals.reduce((sum, d) => sum + parseFloat(d.commission_amount || 0), 0);
              
              // Total
              const totalRevenue = wholesaleRevenue + traditionalRevenue;
              const totalDeals = wholesaleDeals.length + traditionalDeals.length;
              const hasBoth = wholesaleRevenue > 0 && traditionalRevenue > 0;

              return (
                <div 
                  onClick={() => setCurrentTab('deals')}
                  className="bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-teal-900/40 rounded-2xl md:rounded-xl p-4 border border-green-700/30 cursor-pointer hover:border-green-600/50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-green-400/70 text-xs uppercase tracking-wide">YTD Revenue {currentYear}</p>
                      <p className="text-3xl font-black text-green-400">${totalRevenue.toLocaleString()}</p>
                      <p className="text-green-400/50 text-sm">{totalDeals} deals closed</p>
                      
                      {/* Breakdown - shows when there's any revenue */}
                      {totalRevenue > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-700/30 grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-green-400/50 text-xs">📦 Wholesale</p>
                            <p className="text-green-300 font-semibold">${wholesaleRevenue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-blue-400/50 text-xs">🏠 Traditional</p>
                            <p className="text-blue-300 font-semibold">${traditionalRevenue.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-4xl">💰</div>
                  </div>
                </div>
              );
            })()}

            <OffersCard offers={myKPI.offers || 0} goal={goals.daily_offers} isGoogleSync={organization?.google_sheet_sync} onUpdate={(value) => updateKPI('offers', value)} />

            {/* Phone Conversations Card */}
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl md:rounded-xl p-4 md:p-4 border border-slate-700/50 md:border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm uppercase tracking-wide">Phone Calls</p>
                  <p className="text-4xl md:text-2xl font-black text-white mt-1">{myKPI.phone_calls || 0}<span className="text-lg md:text-base text-slate-500 font-normal">/{goals.daily_calls}</span></p>
                </div>
                <div className="w-12 h-12 md:w-10 md:h-10 rounded-xl md:rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-2xl md:text-xl">📞</span>
                </div>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4">
                <div className={`h-2 rounded-full transition-all ${pColor(myKPI.phone_calls || 0, goals.daily_calls)}`} style={{ width: `${pct(myKPI.phone_calls || 0, goals.daily_calls)}%` }}></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateKPI('phone_calls', (myKPI.phone_calls || 0) - 1)} className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-white py-3.5 md:py-3 rounded-xl md:rounded-lg text-base font-semibold active:scale-95 transition-all">−1</button>
                <button onClick={() => updateKPI('phone_calls', (myKPI.phone_calls || 0) + 1)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3.5 md:py-3 rounded-xl md:rounded-lg text-base font-semibold active:scale-95 transition-all">+1</button>
                <button onClick={() => updateKPI('phone_calls', (myKPI.phone_calls || 0) + 5)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3.5 md:py-3 rounded-xl md:rounded-lg text-base font-semibold active:scale-95 transition-all">+5</button>
              </div>
            </div>

            {/* List Backs Secured Card */}
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl md:rounded-xl p-4 md:p-4 border border-slate-700/50 md:border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm uppercase tracking-wide">List Backs Secured</p>
                  <p className="text-4xl md:text-2xl font-black text-white mt-1">{myKPI.list_backs || 0}</p>
                </div>
                <div className="w-12 h-12 md:w-10 md:h-10 rounded-xl md:rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-2xl md:text-xl">🔙</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateKPI('list_backs', (myKPI.list_backs || 0) - 1)} className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-white py-3.5 md:py-3 rounded-xl md:rounded-lg text-base font-semibold active:scale-95 transition-all">−1</button>
                <button onClick={() => updateKPI('list_backs', (myKPI.list_backs || 0) + 1)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3.5 md:py-3 rounded-xl md:rounded-lg text-base font-semibold active:scale-95 transition-all">+1</button>
              </div>
            </div>

            {/* Agent Texts Card */}
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl md:rounded-xl p-4 md:p-4 border border-slate-700/50 md:border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm uppercase tracking-wide">Agent Texts</p>
                  <p className="text-4xl md:text-2xl font-black text-white mt-1">{totalTexts}<span className="text-lg md:text-base text-slate-500 font-normal">/{goals.daily_new_agents + goals.daily_follow_ups}</span></p>
                </div>
                <div className="w-12 h-12 md:w-10 md:h-10 rounded-xl md:rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-2xl md:text-xl">💬</span>
                </div>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4">
                <div className={`h-2 rounded-full transition-all ${pColor(totalTexts, goals.daily_new_agents + goals.daily_follow_ups)}`} style={{ width: `${pct(totalTexts, goals.daily_new_agents + goals.daily_follow_ups)}%` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'New Agents', field: 'new_agents', goal: goals.daily_new_agents, emoji: '🆕' }, { label: 'Follow-ups', field: 'follow_ups', goal: goals.daily_follow_ups, emoji: '🔄' }].map(({ label, field, goal, emoji }) => (
                  <div key={field} className="bg-slate-700/50 rounded-xl md:rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{emoji}</span>
                      <p className="text-slate-300 text-sm font-medium">{label}</p>
                    </div>
                    <p className="text-2xl md:text-xl font-bold text-white mb-2">{myKPI[field] || 0}<span className="text-sm text-slate-500">/{goal}</span></p>
                    <div className="flex gap-1.5">
                      <button onClick={() => updateKPI(field, (myKPI[field] || 0) - 10)} className="flex-1 bg-slate-600/80 text-white py-2.5 md:py-2 rounded-lg text-sm font-semibold active:scale-95 transition-all">−10</button>
                      <button onClick={() => updateKPI(field, (myKPI[field] || 0) + 10)} className="flex-1 bg-blue-600 text-white py-2.5 md:py-2 rounded-lg text-sm font-semibold active:scale-95 transition-all">+10</button>
                      <button onClick={() => updateKPI(field, (myKPI[field] || 0) + 50)} className="flex-1 bg-blue-700 text-white py-2.5 md:py-2 rounded-lg text-sm font-semibold active:scale-95 transition-all">+50</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deals Row */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-slate-800/80 backdrop-blur rounded-2xl md:rounded-xl p-4 border border-slate-700/50 md:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-base">📋</span>
                  </div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Under Contract</p>
                </div>
                <p className="text-3xl md:text-3xl font-black text-purple-400">{weeklyStats.contracts}<span className="text-base text-slate-500 font-normal">/{goals.weekly_contracts}</span></p>
                <p className="text-[10px] text-slate-500 mb-3">Weekly Goal</p>
                <div className="flex gap-2">
                  <button onClick={() => updateKPI('deals_under_contract', (myKPI.deals_under_contract || 0) - 1)} className="flex-1 bg-slate-700/80 text-white py-3 rounded-xl md:rounded-lg font-semibold active:scale-95 transition-all">−1</button>
                  <button onClick={() => updateKPI('deals_under_contract', (myKPI.deals_under_contract || 0) + 1)} className="flex-1 bg-purple-600 text-white py-3 rounded-xl md:rounded-lg font-semibold active:scale-95 transition-all">+1</button>
                </div>
              </div>
              <div className="bg-slate-800/80 backdrop-blur rounded-2xl md:rounded-xl p-4 border border-slate-700/50 md:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-base">🏆</span>
                  </div>
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Closed</p>
                </div>
                <p className="text-3xl md:text-3xl font-black text-yellow-400">{monthlyStats.closed}<span className="text-base text-slate-500 font-normal">/{goals.monthly_closed}</span></p>
                <p className="text-[10px] text-slate-500 mb-3">Monthly Goal</p>
                <div className="flex gap-2">
                  <button onClick={() => updateKPI('deals_closed', (myKPI.deals_closed || 0) - 1)} className="flex-1 bg-slate-700/80 text-white py-3 rounded-xl md:rounded-lg font-semibold active:scale-95 transition-all">−1</button>
                  <button onClick={() => updateKPI('deals_closed', (myKPI.deals_closed || 0) + 1)} className="flex-1 bg-yellow-600 text-white py-3 rounded-xl md:rounded-lg font-semibold active:scale-95 transition-all">+1</button>
                </div>
              </div>
            </div>

            {/* 7-Day Trends */}
            <div className="bg-slate-800/80 backdrop-blur rounded-2xl md:rounded-xl p-4 border border-slate-700/50 md:border-slate-700">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <span>📈</span> Your 7-Day Trends
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Offers</p>
                  <div className="flex justify-center mb-1">
                    <Sparkline data={myOffersTrend} color="#6366f1" width={80} height={30} />
                  </div>
                  <p className="text-white font-bold">{myOffersThisWeek}</p>
                  <p className="text-slate-500 text-[10px]">this week</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Calls</p>
                  <div className="flex justify-center mb-1">
                    <Sparkline data={myCallsTrend} color="#22c55e" width={80} height={30} />
                  </div>
                  <p className="text-white font-bold">{myCallsThisWeek}</p>
                  <p className="text-slate-500 text-[10px]">this week</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Texts</p>
                  <div className="flex justify-center mb-1">
                    <Sparkline data={myTextsTrend} color="#3b82f6" width={80} height={30} />
                  </div>
                  <p className="text-white font-bold">{myTextsThisWeek}</p>
                  <p className="text-slate-500 text-[10px]">this week</p>
                </div>
              </div>
            </div>

            {/* Quick Notes Widget */}
            <QuickNotesWidget 
              notes={userNotes} 
              setNotes={setUserNotes} 
              userId={currentUser?.id}
              onOpenFullNotes={() => setCurrentTab('notes')}
            />

            {/* VIP Agents Section */}
            <VIPAgentsSection 
              userId={currentUser?.id}
              vipAgents={vipAgents}
              setVipAgents={setVipAgents}
            />
          </div>
        )}

        {currentTab === 'notes' && (
          <div className="space-y-4">
            {/* Mobile back header */}
            <div className="md:hidden flex items-center gap-3 mb-2">
              <button 
                onClick={() => setCurrentTab('personal')} 
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium py-2 px-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
                </svg>
                Back to Home
              </button>
            </div>
            <NotesApp userId={currentUser?.id} notes={userNotes} setNotes={setUserNotes} />
          </div>
        )}

        {currentTab === 'team' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-white">🏆 Leaderboard</h2>
                <div className="flex gap-2">
                  {['week', 'month'].map(p => <button key={p} onClick={() => setLeaderboardPeriod(p)} className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-sm font-semibold ${leaderboardPeriod === p ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{p === 'week' ? 'Week' : 'Month'}</button>)}
                </div>
              </div>
              {getLeaderboard().map((e, i) => {
                const memberOffersTrend = getLast7DaysData(e.user.id, 'offers');
                const memberStreak = calculateStreak(teamKPIs[e.user.id], goals.daily_offers);
                return (
                  <div key={e.user.id} className="bg-slate-700 rounded-lg p-3 sm:p-4 mb-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="text-2xl sm:text-3xl">{['🥇', '🥈', '🥉', '🏅'][i] || '🏅'}</span>
                      <UserAvatar user={e.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold text-sm sm:text-base truncate">{e.user.display_name || e.user.name}</p>
                          {memberStreak.current > 0 && (
                            <span className="text-orange-400 text-xs font-medium">🔥{memberStreak.current}</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs">Offers: {e.stats.offers} | Texts: {e.stats.texts} | Calls: {e.stats.calls}</p>
                      </div>
                      <div className="hidden sm:block">
                        <Sparkline data={memberOffersTrend} color="#eab308" width={60} height={24} />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-yellow-400">{e.score}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentTab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-white">📊 Analytics</h2>
                <div className="flex gap-1 sm:gap-2 overflow-x-auto w-full sm:w-auto">
                  {['daily', 'weekly', 'monthly', 'quarterly'].map(p => <button key={p} onClick={() => setAnalyticsPeriod(p)} className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-semibold whitespace-nowrap ${analyticsPeriod === p ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                {(() => {
                  const t = getTeamTotals(analyticsPeriod);
                  const teamSize = teamMembers.length || 1;
                  const goalMultipliers = { daily: [1, 1, 1, 1, 1], weekly: [7, 7, 7, 1, 1], monthly: [30, 30, 30, 4, 1], quarterly: [90, 90, 90, 12, 3] }[analyticsPeriod];
                  const teamGoals = [goals.daily_offers * teamSize * goalMultipliers[0], (goals.daily_new_agents + goals.daily_follow_ups) * teamSize * goalMultipliers[1], goals.daily_calls * teamSize * goalMultipliers[2], goals.weekly_contracts * teamSize * goalMultipliers[3], goals.monthly_closed * teamSize * goalMultipliers[4]];
                  return [['Offers', t.offers, teamGoals[0]], ['Texts', t.texts, teamGoals[1]], ['Calls', t.calls, teamGoals[2]], ['UC', t.contracts, teamGoals[3]], ['Closed', t.closed, teamGoals[4]]].map(([n, v, g]) => (
                    <div key={n} className="bg-slate-700 rounded-lg p-2 sm:p-3 text-center">
                      <p className="text-slate-400 text-xs">{n}</p>
                      <p className="text-lg sm:text-2xl font-bold text-white">{v}</p>
                      <p className="text-xs text-slate-500">/{g}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <button onClick={exportCSV} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 sm:py-3 rounded-lg text-sm sm:text-base">📥 Export</button>
              <button onClick={copySummary} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 sm:py-3 rounded-lg text-sm sm:text-base">📋 Copy</button>
            </div>
          </div>
        )}

        {currentTab === 'deals' && (
          <div className="space-y-4">
            {/* Year selector and Add button */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setDealsYear(y => y - 1); loadDeals(dealsYear - 1); }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  ◀
                </button>
                <span className="text-xl font-bold text-white px-3">{dealsYear}</span>
                <button 
                  onClick={() => { setDealsYear(y => y + 1); loadDeals(dealsYear + 1); }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                  disabled={dealsYear >= new Date().getFullYear()}
                >
                  ▶
                </button>
              </div>
              {currentUser?.role === 'owner' && (
                <button 
                  onClick={() => { setShowAddDeal(true); setEditingDeal(null); setDealForm({ property_address: '', uc_price: '', sold_price: '', split_with_user_id: '', split_percentage: '50', split_type: 'percentage', split_amount: '', closed_date: getTodayInOrgTimezone(), notes: '', deal_source: 'on_market', original_list_price: '', had_price_reduction: false, original_uc_price: '', deal_type: 'wholesale', sale_price: '', commission_amount: '', list_back_secured: false, list_back_commission_pct: '', purchase_contract_url: '', assignment_contract_url: '', hud_url: '', dispo_help: false, dispo_name: '', dispo_email: '', dispo_phone: '', dispo_share_type: 'percentage', dispo_share_percentage: '', dispo_share_amount: '', realtor_commission_paid: false, realtor_commission_type: 'percentage', realtor_commission_percentage: '', realtor_commission_amount: '', attorney_used: false, attorney_fee: '' }); setDealFiles({ purchase_contract: null, assignment_contract: null, hud: null }); }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  + Add Deal
                </button>
              )}
            </div>

            {/* Show Revenue on Home Toggle */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Default to Revenue View</p>
                  <p className="text-slate-400 text-sm">Show Total Revenue instead of Personal Net (tap card to toggle)</p>
                </div>
                <button
                  onClick={toggleShowRevenueOnHome}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${showRevenueOnHome ? 'bg-green-600' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${showRevenueOnHome ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Yearly Goals Progress - Owner Only */}
            {currentUser?.role === 'owner' && dealsYear === new Date().getFullYear() && (() => {
              const goals = getGoals();
              const yearDeals = deals.filter(d => d.year === dealsYear);
              const totalRevenue = yearDeals.reduce((sum, d) => sum + (parseFloat(d.revenue) || 0), 0);
              
              // Calculate totals for each expense category
              let totalPartnerPaid = 0;
              let totalDispoPaid = 0;
              let totalAgentCommissions = 0;
              let totalAttorneyFees = 0;
              
              // Calculate total personal net (revenue - ALL expenses)
              const totalPersonalNet = yearDeals.reduce((sum, d) => {
                const rev = parseFloat(d.revenue) || 0;
                const isTraditional = d.deal_type === 'traditional';
                
                if (isTraditional) {
                  // For traditional deals, commission is the net
                  const commission = parseFloat(d.commission_amount || 0);
                  if (d.split_with_user_id) {
                    const splitPct = parseFloat(d.split_percentage || 50);
                    const partnerShare = d.split_type === 'fixed' 
                      ? parseFloat(d.split_amount || 0) 
                      : commission * (100 - splitPct) / 100;
                    totalPartnerPaid += partnerShare;
                    return sum + (commission - partnerShare);
                  }
                  return sum + commission;
                }
                
                // Wholesale deals
                let realtorCommission = 0;
                let dispoShare = 0;
                let attorneyFee = 0;
                
                // Realtor commission
                if (d.realtor_commission_paid) {
                  if (d.realtor_commission_type === 'fixed' && d.realtor_commission_amount) {
                    realtorCommission = parseFloat(d.realtor_commission_amount);
                  } else if (d.realtor_commission_percentage) {
                    realtorCommission = parseFloat(d.uc_price || 0) * parseFloat(d.realtor_commission_percentage) / 100;
                  }
                }
                totalAgentCommissions += realtorCommission;
                
                const netAfterCommission = rev - realtorCommission;
                
                // Dispo share
                if (d.dispo_help) {
                  if (d.dispo_share_type === 'fixed' && d.dispo_share_amount) {
                    dispoShare = parseFloat(d.dispo_share_amount);
                  } else if (d.dispo_share_percentage) {
                    dispoShare = netAfterCommission * parseFloat(d.dispo_share_percentage) / 100;
                  }
                }
                totalDispoPaid += dispoShare;
                
                // Attorney fee
                if (d.attorney_used && d.attorney_fee) {
                  attorneyFee = parseFloat(d.attorney_fee);
                }
                totalAttorneyFees += attorneyFee;
                
                const netBeforeSplit = netAfterCommission - dispoShare - attorneyFee;
                
                // Partner split
                if (d.split_with_user_id) {
                  const splitPct = parseFloat(d.split_percentage || 50);
                  const partnerShare = d.split_type === 'fixed' 
                    ? parseFloat(d.split_amount || 0) 
                    : netBeforeSplit * (100 - splitPct) / 100;
                  totalPartnerPaid += partnerShare;
                  return sum + (netBeforeSplit - partnerShare);
                }
                
                return sum + netBeforeSplit;
              }, 0);
              
              const revenueGoal = goals.yearly_revenue_goal || 500000;
              const netGoal = goals.yearly_personal_net_goal || 250000;
              const revenuePct = Math.min((totalRevenue / revenueGoal) * 100, 100);
              const netPct = Math.min((totalPersonalNet / netGoal) * 100, 100);
              
              return (
                <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 rounded-xl p-4 border border-amber-700/50">
                  <h3 className="text-amber-400 font-bold mb-4">🎯 {dealsYear} Yearly Goals</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Company Revenue</p>
                      <p className="text-2xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">of ${revenueGoal.toLocaleString()} goal</p>
                      <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${revenuePct}%` }} />
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{revenuePct.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Personal Net</p>
                      <p className="text-2xl font-bold text-amber-400">${totalPersonalNet.toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">of ${netGoal.toLocaleString()} goal</p>
                      <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                        <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${netPct}%` }} />
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{netPct.toFixed(1)}%</p>
                    </div>
                  </div>
                  {/* Expense Breakdown */}
                  {(totalPartnerPaid > 0 || totalDispoPaid > 0 || totalAgentCommissions > 0 || totalAttorneyFees > 0) && (
                    <div className="border-t border-amber-700/30 pt-3 mt-3">
                      <p className="text-slate-400 text-xs mb-2">💸 Paid Out This Year:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {totalPartnerPaid > 0 && (
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <p className="text-slate-500">Team Partners</p>
                            <p className="text-blue-400 font-semibold">${totalPartnerPaid.toLocaleString()}</p>
                          </div>
                        )}
                        {totalDispoPaid > 0 && (
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <p className="text-slate-500">Dispo Partners</p>
                            <p className="text-purple-400 font-semibold">${totalDispoPaid.toLocaleString()}</p>
                          </div>
                        )}
                        {totalAgentCommissions > 0 && (
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <p className="text-slate-500">Agent Commissions</p>
                            <p className="text-orange-400 font-semibold">${totalAgentCommissions.toLocaleString()}</p>
                          </div>
                        )}
                        {totalAttorneyFees > 0 && (
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <p className="text-slate-500">Attorney Fees</p>
                            <p className="text-red-400 font-semibold">${totalAttorneyFees.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Summary Cards */}
            {(() => {
              const userDeals = currentUser?.role === 'owner' 
                ? deals 
                : deals.filter(d => d.user_id === currentUser?.id || d.split_with_user_id === currentUser?.id);
              
              const totalRevenue = userDeals.reduce((sum, d) => sum + parseFloat(d.revenue || 0), 0);
              const dealCount = userDeals.length;
              
              // Calculate user's net take (accounting for all deductions)
              const netTake = userDeals.reduce((sum, d) => {
                const rev = parseFloat(d.revenue || 0);
                const isTraditional = d.deal_type === 'traditional';
                
                if (isTraditional) {
                  // Traditional deals: commission is the net
                  const commission = parseFloat(d.commission_amount || 0);
                  if (d.split_with_user_id) {
                    const splitPct = parseFloat(d.split_percentage || 50);
                    if (d.user_id === currentUser?.id) {
                      return sum + (commission * splitPct / 100);
                    } else {
                      return sum + (commission * (100 - splitPct) / 100);
                    }
                  }
                  return sum + commission;
                }
                
                // Wholesale deals: calculate net after all deductions
                let realtorCommission = 0;
                let dispoShare = 0;
                let attorneyFee = 0;
                
                // Realtor commission
                if (d.realtor_commission_paid) {
                  if (d.realtor_commission_type === 'fixed' && d.realtor_commission_amount) {
                    realtorCommission = parseFloat(d.realtor_commission_amount);
                  } else if (d.realtor_commission_percentage) {
                    realtorCommission = parseFloat(d.uc_price || 0) * parseFloat(d.realtor_commission_percentage) / 100;
                  }
                }
                
                const netAfterCommission = rev - realtorCommission;
                
                // Dispo share
                if (d.dispo_help) {
                  if (d.dispo_share_type === 'fixed' && d.dispo_share_amount) {
                    dispoShare = parseFloat(d.dispo_share_amount);
                  } else if (d.dispo_share_percentage) {
                    dispoShare = netAfterCommission * parseFloat(d.dispo_share_percentage) / 100;
                  }
                }
                
                // Attorney fee
                if (d.attorney_used && d.attorney_fee) {
                  attorneyFee = parseFloat(d.attorney_fee);
                }
                
                const netBeforeSplit = netAfterCommission - dispoShare - attorneyFee;
                
                // Partner split
                if (d.split_with_user_id) {
                  const splitPct = parseFloat(d.split_percentage || 50);
                  if (d.user_id === currentUser?.id) {
                    // Primary owner gets their percentage
                    return sum + (netBeforeSplit * splitPct / 100);
                  } else {
                    // Partner gets the remainder
                    return sum + (netBeforeSplit * (100 - splitPct) / 100);
                  }
                }
                
                return sum + netBeforeSplit;
              }, 0);

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <p className="text-slate-400 text-sm">Deals Closed</p>
                    <p className="text-3xl font-bold text-white">{dealCount}</p>
                  </div>
                  {/* Toggleable Revenue/Net Take card */}
                  <div 
                    className="bg-slate-800 rounded-xl p-4 border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors"
                    onClick={() => setShowRevenueOnHome(!showRevenueOnHome)}
                    title="Tap to toggle between Revenue and Net"
                  >
                    {showRevenueOnHome ? (
                      <>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          {currentUser?.role === 'owner' ? 'Total Revenue' : 'Company Revenue'} 
                          <span className="text-xs text-slate-600">↔</span>
                        </p>
                        <p className="text-3xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-400 text-sm flex items-center gap-1">
                          {currentUser?.role === 'owner' ? 'Personal Net' : 'Your Net Take'}
                          <span className="text-xs text-slate-600">↔</span>
                        </p>
                        <p className="text-3xl font-bold text-amber-400">${netTake.toLocaleString()}</p>
                      </>
                    )}
                  </div>
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <p className="text-slate-400 text-sm">Avg Per Deal</p>
                    <p className="text-3xl font-bold text-blue-400">${dealCount > 0 ? Math.round((showRevenueOnHome ? totalRevenue : netTake) / dealCount).toLocaleString() : 0}</p>
                  </div>
                </div>
              );
            })()}

            {/* Deals List */}
            <div className="space-y-3">
              {deals.length === 0 ? (
                <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                  <p className="text-slate-400">No deals closed in {dealsYear}</p>
                  {currentUser?.role === 'owner' && (
                    <button 
                      onClick={() => setShowAddDeal(true)}
                      className="mt-4 text-blue-400 hover:text-blue-300"
                    >
                      Add your first deal →
                    </button>
                  )}
                </div>
              ) : (
                deals.map(deal => {
                  const primaryUser = teamMembers.find(m => m.id === deal.user_id);
                  const splitUser = deal.split_with_user_id ? teamMembers.find(m => m.id === deal.split_with_user_id) : null;
                  const isTraditional = deal.deal_type === 'traditional';
                  const revenue = parseFloat(deal.revenue || 0); // Company revenue (full spread)
                  const commission = parseFloat(deal.commission_amount || 0);
                  
                  // Calculate deductions
                  let partnerShare = 0;
                  let dispoShare = 0;
                  let realtorCommission = 0;
                  let attorneyFee = 0;
                  let netBeforeSplit = revenue; // Default to revenue for traditional deals
                  
                  if (!isTraditional) {
                    // Realtor commission (calculated on UC price, not revenue)
                    if (deal.realtor_commission_paid) {
                      if (deal.realtor_commission_type === 'fixed' && deal.realtor_commission_amount) {
                        realtorCommission = parseFloat(deal.realtor_commission_amount);
                      } else if (deal.realtor_commission_percentage) {
                        realtorCommission = parseFloat(deal.uc_price || 0) * parseFloat(deal.realtor_commission_percentage) / 100;
                      }
                    }
                    
                    // Net after realtor commission
                    const netAfterCommission = revenue - realtorCommission;
                    
                    // Dispo share (calculated on net after commission)
                    if (deal.dispo_help) {
                      if (deal.dispo_share_type === 'fixed' && deal.dispo_share_amount) {
                        dispoShare = parseFloat(deal.dispo_share_amount);
                      } else if (deal.dispo_share_percentage) {
                        dispoShare = netAfterCommission * parseFloat(deal.dispo_share_percentage) / 100;
                      }
                    }
                    
                    // Attorney fee
                    if (deal.attorney_used && deal.attorney_fee) {
                      attorneyFee = parseFloat(deal.attorney_fee);
                    }
                    
                    // Net after all deductions (before partner split)
                    netBeforeSplit = netAfterCommission - dispoShare - attorneyFee;
                    
                    // Partner split
                    if (deal.split_with_user_id) {
                      if (deal.split_type === 'fixed' && deal.split_amount) {
                        partnerShare = parseFloat(deal.split_amount);
                      } else {
                        const splitPct = parseFloat(deal.split_percentage || 50);
                        partnerShare = netBeforeSplit * (100 - splitPct) / 100;
                      }
                    }
                  }
                  
                  // My net = revenue - realtor commission - dispo share - attorney fee - partner share
                  const myNet = revenue - realtorCommission - dispoShare - attorneyFee - partnerShare;
                  const splitPct = parseFloat(deal.split_percentage || 50);

                  return (
                    <div key={deal.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-semibold text-lg">{deal.property_address}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${isTraditional ? 'bg-blue-600/30 text-blue-300' : 'bg-green-600/30 text-green-300'}`}>
                              {isTraditional ? '🏠 Traditional' : '📦 Wholesale'}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm">
                            Closed: {new Date(deal.closed_date).toLocaleDateString()}
                          </p>
                          {isTraditional ? (
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className="text-slate-400">Sale: <span className="text-white">${parseFloat(deal.sale_price || 0).toLocaleString()}</span></span>
                            </div>
                          ) : (
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className="text-slate-400">UC: <span className="text-white">${parseFloat(deal.uc_price).toLocaleString()}</span></span>
                              <span className="text-slate-400">Sold: <span className="text-white">${parseFloat(deal.sold_price).toLocaleString()}</span></span>
                            </div>
                          )}
                          {!isTraditional && splitUser && (
                            <p className="text-slate-400 text-sm mt-1">
                              Split with {splitUser.display_name || splitUser.name} {deal.split_type === 'fixed' ? `($${parseFloat(deal.split_amount || 0).toLocaleString()})` : `(${splitPct}/${100-splitPct})`}
                            </p>
                          )}
                          {!isTraditional && deal.dispo_help && currentUser?.role === 'owner' && (
                            <p className="text-amber-400 text-sm mt-1">
                              🤝 Dispo: {deal.dispo_name} {deal.dispo_share_type === 'fixed' ? `($${parseFloat(deal.dispo_share_amount || 0).toLocaleString()})` : `(${deal.dispo_share_percentage}%)`}
                            </p>
                          )}
                          {!isTraditional && deal.deal_source === 'off_market' && (
                            <span className="inline-block bg-purple-600/30 text-purple-300 text-xs px-2 py-0.5 rounded mt-1">Off Market</span>
                          )}
                          {!isTraditional && deal.deal_source === 'on_market' && deal.original_list_price && (
                            <p className="text-slate-400 text-sm mt-1">
                              Listed: ${parseFloat(deal.original_list_price).toLocaleString()}
                            </p>
                          )}
                          {!isTraditional && deal.had_price_reduction && deal.original_uc_price && (
                            <p className="text-orange-400 text-sm mt-1">
                              📉 UC reduced: ${parseFloat(deal.original_uc_price).toLocaleString()} → ${parseFloat(deal.uc_price).toLocaleString()}
                            </p>
                          )}
                          {/* Document Links - owner only */}
                          {currentUser?.role === 'owner' && (deal.purchase_contract_url || deal.assignment_contract_url || deal.hud_url) && (
                            <div className="flex gap-3 mt-2 text-xs">
                              {deal.purchase_contract_url && (
                                <a href={deal.purchase_contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">📄 P&S</a>
                              )}
                              {deal.assignment_contract_url && (
                                <a href={deal.assignment_contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">📄 Assignment</a>
                              )}
                              {deal.hud_url && (
                                <a href={deal.hud_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">📄 HUD</a>
                              )}
                            </div>
                          )}
                          {primaryUser && currentUser?.role === 'owner' && (
                            <p className="text-slate-500 text-xs mt-1">
                              Primary: {primaryUser.display_name || primaryUser.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {isTraditional ? (
                            <p className="text-2xl font-bold text-blue-400">${commission.toLocaleString()}</p>
                          ) : (
                            <>
                              <p className="text-2xl font-bold text-green-400">${revenue.toLocaleString()}</p>
                              <p className="text-xs text-slate-500">Company Revenue</p>
                              {(partnerShare > 0 || dispoShare > 0) && currentUser?.role === 'owner' && (
                                <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                                  {partnerShare > 0 && <p>Partner: -${partnerShare.toLocaleString()}</p>}
                                  {dispoShare > 0 && <p>Dispo: -${dispoShare.toLocaleString()}</p>}
                                  <p className="text-green-300 font-semibold">My Net: ${myNet.toLocaleString()}</p>
                                </div>
                              )}
                              {deal.split_with_user_id && currentUser?.role !== 'owner' && (
                                <p className="text-sm text-slate-400">Your take: <span className="text-green-300">${(deal.split_type === 'fixed' ? parseFloat(deal.split_amount || 0) : (netBeforeSplit * (100 - splitPct) / 100)).toLocaleString()}</span></p>
                              )}
                            </>
                          )}
                          {currentUser?.role === 'owner' && (
                            <div className="flex gap-2 mt-2 justify-end">
                              <button 
                                onClick={() => { 
                                  setEditingDeal(deal); 
                                  setDealForm({
                                    property_address: deal.property_address,
                                    uc_price: deal.uc_price || '',
                                    sold_price: deal.sold_price || '',
                                    split_with_user_id: deal.split_with_user_id || '',
                                    split_percentage: deal.split_percentage || '50',
                                    split_type: deal.split_type || 'percentage',
                                    split_amount: deal.split_amount || '',
                                    closed_date: deal.closed_date,
                                    notes: deal.notes || '',
                                    deal_source: deal.deal_source || 'on_market',
                                    original_list_price: deal.original_list_price || '',
                                    had_price_reduction: deal.had_price_reduction || false,
                                    original_uc_price: deal.original_uc_price || '',
                                    deal_type: deal.deal_type || 'wholesale',
                                    sale_price: deal.sale_price || '',
                                    commission_amount: deal.commission_amount || '',
                                    list_back_secured: deal.list_back_secured || false,
                                    list_back_commission_pct: deal.list_back_commission_pct || '',
                                    purchase_contract_url: deal.purchase_contract_url || '',
                                    assignment_contract_url: deal.assignment_contract_url || '',
                                    hud_url: deal.hud_url || '',
                                    dispo_help: deal.dispo_help || false,
                                    dispo_name: deal.dispo_name || '',
                                    dispo_email: deal.dispo_email || '',
                                    dispo_phone: deal.dispo_phone || '',
                                    dispo_share_type: deal.dispo_share_type || 'percentage',
                                    dispo_share_percentage: deal.dispo_share_percentage || '',
                                    dispo_share_amount: deal.dispo_share_amount || '',
                                    realtor_commission_paid: deal.realtor_commission_paid || false,
                                    realtor_commission_type: deal.realtor_commission_type || 'percentage',
                                    realtor_commission_percentage: deal.realtor_commission_percentage || '',
                                    realtor_commission_amount: deal.realtor_commission_amount || '',
                                    attorney_used: deal.attorney_used || false,
                                    attorney_fee: deal.attorney_fee || ''
                                  });
                                  setDealFiles({ purchase_contract: null, assignment_contract: null, hud: null });
                                  setShowAddDeal(true);
                                }}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm('Delete this deal?')) {
                                    await db.deals.delete(deal.id);
                                    loadDeals();
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add/Edit Deal Modal */}
            {showAddDeal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white">{editingDeal ? 'Edit Deal' : 'Add New Deal'}</h3>
                    <button 
                      onClick={() => { setShowAddDeal(false); setEditingDeal(null); }}
                      className="text-slate-400 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-6 pt-4 overflow-y-auto flex-1 space-y-4">
                    {/* Deal Type Selection */}
                    <div>
                      <label className="text-slate-400 text-sm mb-2 block">Deal Type</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio"
                            name="deal_type"
                            value="wholesale"
                            checked={dealForm.deal_type === 'wholesale'}
                            onChange={e => setDealForm(f => ({ ...f, deal_type: e.target.value }))}
                            className="w-4 h-4"
                          />
                          <span className="text-slate-300">Wholesale Deal</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio"
                            name="deal_type"
                            value="traditional"
                            checked={dealForm.deal_type === 'traditional'}
                            onChange={e => setDealForm(f => ({ ...f, deal_type: e.target.value }))}
                            className="w-4 h-4"
                          />
                          <span className="text-slate-300">Traditional Deal</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 text-sm">Property Address</label>
                      <input 
                        type="text"
                        value={dealForm.property_address}
                        onChange={e => setDealForm(f => ({ ...f, property_address: e.target.value }))}
                        className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                        placeholder="123 Main St, City, State"
                      />
                    </div>

                    {/* Wholesale Deal Fields */}
                    {dealForm.deal_type === 'wholesale' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-slate-400 text-sm">UC Price ($)</label>
                            <input 
                              type="number"
                              value={dealForm.uc_price}
                              onChange={e => setDealForm(f => ({ ...f, uc_price: e.target.value }))}
                              className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              placeholder="100000"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-sm">Sold Price ($)</label>
                            <input 
                              type="number"
                              value={dealForm.sold_price}
                              onChange={e => setDealForm(f => ({ ...f, sold_price: e.target.value }))}
                              className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              placeholder="120000"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Traditional Deal Fields */}
                    {dealForm.deal_type === 'traditional' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-slate-400 text-sm">Sale Price ($) *</label>
                            <input 
                              type="number"
                              value={dealForm.sale_price}
                              onChange={e => setDealForm(f => ({ ...f, sale_price: e.target.value }))}
                              className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              placeholder="350000"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-sm">Commission ($) *</label>
                            <input 
                              type="number"
                              value={dealForm.commission_amount}
                              onChange={e => setDealForm(f => ({ ...f, commission_amount: e.target.value }))}
                              className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              placeholder="10500"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-slate-400 text-sm">Closed Date</label>
                      <input 
                        type="date"
                        value={dealForm.closed_date}
                        onChange={e => setDealForm(f => ({ ...f, closed_date: e.target.value }))}
                        className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Primary Team Member</label>
                      <select
                        value={editingDeal ? editingDeal.user_id : currentUser?.id}
                        onChange={e => setEditingDeal(d => d ? { ...d, user_id: e.target.value } : { user_id: e.target.value })}
                        className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                      >
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.display_name || m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Split options only for wholesale deals */}
                    {dealForm.deal_type === 'wholesale' && (
                      <>
                        <div>
                          <label className="text-slate-400 text-sm">Split With Partner (optional)</label>
                          <select
                            value={dealForm.split_with_user_id}
                            onChange={e => setDealForm(f => ({ ...f, split_with_user_id: e.target.value }))}
                            className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                          >
                            <option value="">No split</option>
                            {teamMembers.filter(m => m.id !== (editingDeal?.user_id || currentUser?.id)).map(m => (
                              <option key={m.id} value={m.id}>{m.display_name || m.name}</option>
                            ))}
                          </select>
                        </div>
                        {dealForm.split_with_user_id && (
                          <div className="space-y-2">
                            <label className="text-slate-400 text-sm">Partner Split Type</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio"
                                  checked={dealForm.split_type === 'percentage'}
                                  onChange={() => setDealForm(f => ({ ...f, split_type: 'percentage', split_amount: '' }))}
                                  className="w-4 h-4"
                                />
                                <span className="text-slate-300 text-sm">Percentage</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio"
                                  checked={dealForm.split_type === 'fixed'}
                                  onChange={() => setDealForm(f => ({ ...f, split_type: 'fixed', split_percentage: '' }))}
                                  className="w-4 h-4"
                                />
                                <span className="text-slate-300 text-sm">Fixed Amount</span>
                              </label>
                            </div>
                            {dealForm.split_type === 'percentage' ? (
                              <select
                                value={dealForm.split_percentage}
                                onChange={e => setDealForm(f => ({ ...f, split_percentage: e.target.value }))}
                                className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              >
                                <option value="50">50/50</option>
                                <option value="60">60/40</option>
                                <option value="70">70/30</option>
                                <option value="75">75/25</option>
                                <option value="80">80/20</option>
                              </select>
                            ) : (
                              <input
                                type="number"
                                value={dealForm.split_amount}
                                onChange={e => setDealForm(f => ({ ...f, split_amount: e.target.value }))}
                                className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                                placeholder="Partner's fixed amount ($)"
                              />
                            )}
                          </div>
                        )}

                        {/* Dispo Help Section */}
                        <div className="border-t border-slate-700 pt-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={dealForm.dispo_help}
                              onChange={e => setDealForm(f => ({ ...f, dispo_help: e.target.checked }))}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-slate-300">🤝 Dispo Help (external wholesaler)</span>
                          </label>
                        </div>
                        {dealForm.dispo_help && (
                          <div className="space-y-3 bg-slate-700/50 p-3 rounded-lg">
                            <div className="grid grid-cols-1 gap-3">
                              <input
                                type="text"
                                value={dealForm.dispo_name}
                                onChange={e => setDealForm(f => ({ ...f, dispo_name: e.target.value }))}
                                className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm"
                                placeholder="Dispo wholesaler name"
                              />
                              <input
                                type="email"
                                value={dealForm.dispo_email}
                                onChange={e => setDealForm(f => ({ ...f, dispo_email: e.target.value }))}
                                className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm"
                                placeholder="Email"
                              />
                              <input
                                type="tel"
                                value={dealForm.dispo_phone}
                                onChange={e => setDealForm(f => ({ ...f, dispo_phone: e.target.value }))}
                                className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm"
                                placeholder="Phone"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-slate-400 text-xs">Dispo Share</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="radio"
                                    checked={dealForm.dispo_share_type === 'percentage'}
                                    onChange={() => setDealForm(f => ({ ...f, dispo_share_type: 'percentage', dispo_share_amount: '' }))}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-slate-300 text-sm">%</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="radio"
                                    checked={dealForm.dispo_share_type === 'fixed'}
                                    onChange={() => setDealForm(f => ({ ...f, dispo_share_type: 'fixed', dispo_share_percentage: '' }))}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-slate-300 text-sm">$</span>
                                </label>
                              </div>
                              {dealForm.dispo_share_type === 'percentage' ? (
                                <input
                                  type="number"
                                  value={dealForm.dispo_share_percentage}
                                  onChange={e => setDealForm(f => ({ ...f, dispo_share_percentage: e.target.value }))}
                                  className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm"
                                  placeholder="Dispo percentage (e.g. 10)"
                                />
                              ) : (
                                <input
                                  type="number"
                                  value={dealForm.dispo_share_amount}
                                  onChange={e => setDealForm(f => ({ ...f, dispo_share_amount: e.target.value }))}
                                  className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm"
                                  placeholder="Dispo fixed amount ($)"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Realtor Commission Section */}
                        <div className="border-t border-slate-700 pt-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={dealForm.realtor_commission_paid}
                              onChange={e => setDealForm(f => ({ ...f, realtor_commission_paid: e.target.checked }))}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-slate-300">🏠 Realtor Commission Paid</span>
                          </label>
                        </div>
                        {dealForm.realtor_commission_paid && (
                          <div className="space-y-3 bg-slate-700/50 p-3 rounded-lg">
                            <div className="space-y-2">
                              <label className="text-slate-400 text-xs">Commission Type (calculated on UC price)</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="radio"
                                    checked={dealForm.realtor_commission_type === 'percentage'}
                                    onChange={() => setDealForm(f => ({ ...f, realtor_commission_type: 'percentage', realtor_commission_amount: '' }))}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-slate-300 text-sm">%</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="radio"
                                    checked={dealForm.realtor_commission_type === 'fixed'}
                                    onChange={() => setDealForm(f => ({ ...f, realtor_commission_type: 'fixed', realtor_commission_percentage: '' }))}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-slate-300 text-sm">$</span>
                                </label>
                              </div>
                              {dealForm.realtor_commission_type === 'percentage' ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={dealForm.realtor_commission_percentage}
                                  onChange={e => setDealForm(f => ({ ...f, realtor_commission_percentage: e.target.value }))}
                                  className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm"
                                  placeholder="Commission % (e.g. 3)"
                                />
                              ) : (
                                <input
                                  type="number"
                                  value={dealForm.realtor_commission_amount}
                                  onChange={e => setDealForm(f => ({ ...f, realtor_commission_amount: e.target.value }))}
                                  className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm"
                                  placeholder="Fixed commission amount ($)"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Attorney Fee Section */}
                        <div className="border-t border-slate-700 pt-4 mt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={dealForm.attorney_used}
                              onChange={e => setDealForm(f => ({ ...f, attorney_used: e.target.checked }))}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-slate-300">⚖️ Attorney Used</span>
                          </label>
                        </div>
                        {dealForm.attorney_used && (
                          <div className="space-y-3 bg-slate-700/50 p-3 rounded-lg">
                            <div>
                              <label className="text-slate-400 text-xs">Attorney Fee ($)</label>
                              <input
                                type="number"
                                value={dealForm.attorney_fee}
                                onChange={e => setDealForm(f => ({ ...f, attorney_fee: e.target.value }))}
                                className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 text-sm mt-1"
                                placeholder="Attorney fee amount ($)"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div>
                      <label className="text-slate-400 text-sm">Notes</label>
                      <textarea 
                        value={dealForm.notes}
                        onChange={e => setDealForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                        rows={2}
                        placeholder="Any notes about this deal..."
                      />
                    </div>

                    {/* Document Uploads */}
                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <label className="text-slate-400 text-sm block mb-3">📎 Deal Documents (PDF)</label>
                      <div className="space-y-3">
                        <div>
                          <label className="text-slate-300 text-xs block mb-1">Purchase & Sale Contract</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="file"
                              accept=".pdf"
                              onChange={e => setDealFiles(f => ({ ...f, purchase_contract: e.target.files[0] }))}
                              className="flex-1 text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-600 file:text-white hover:file:bg-slate-500"
                            />
                            {(dealForm.purchase_contract_url || dealFiles.purchase_contract) && (
                              <span className="text-green-400 text-xs">✓</span>
                            )}
                          </div>
                          {dealForm.purchase_contract_url && !dealFiles.purchase_contract && (
                            <a href={dealForm.purchase_contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">View current</a>
                          )}
                        </div>
                        <div>
                          <label className="text-slate-300 text-xs block mb-1">Assignment Contract</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="file"
                              accept=".pdf"
                              onChange={e => setDealFiles(f => ({ ...f, assignment_contract: e.target.files[0] }))}
                              className="flex-1 text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-600 file:text-white hover:file:bg-slate-500"
                            />
                            {(dealForm.assignment_contract_url || dealFiles.assignment_contract) && (
                              <span className="text-green-400 text-xs">✓</span>
                            )}
                          </div>
                          {dealForm.assignment_contract_url && !dealFiles.assignment_contract && (
                            <a href={dealForm.assignment_contract_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">View current</a>
                          )}
                        </div>
                        <div>
                          <label className="text-slate-300 text-xs block mb-1">HUD / Settlement Statement</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="file"
                              accept=".pdf"
                              onChange={e => setDealFiles(f => ({ ...f, hud: e.target.files[0] }))}
                              className="flex-1 text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-600 file:text-white hover:file:bg-slate-500"
                            />
                            {(dealForm.hud_url || dealFiles.hud) && (
                              <span className="text-green-400 text-xs">✓</span>
                            )}
                          </div>
                          {dealForm.hud_url && !dealFiles.hud && (
                            <a href={dealForm.hud_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">View current</a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Wholesale-only fields */}
                    {dealForm.deal_type === 'wholesale' && (
                      <>
                        <div>
                          <label className="text-slate-400 text-sm mb-2 block">Deal Source</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio"
                                name="deal_source"
                                value="on_market"
                                checked={dealForm.deal_source === 'on_market'}
                                onChange={e => setDealForm(f => ({ ...f, deal_source: e.target.value }))}
                                className="w-4 h-4"
                              />
                              <span className="text-slate-300">On Market</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio"
                                name="deal_source"
                                value="off_market"
                                checked={dealForm.deal_source === 'off_market'}
                                onChange={e => setDealForm(f => ({ ...f, deal_source: e.target.value }))}
                                className="w-4 h-4"
                              />
                              <span className="text-slate-300">Off Market</span>
                            </label>
                          </div>
                        </div>
                        {dealForm.deal_source === 'on_market' && (
                          <div>
                            <label className="text-slate-400 text-sm">Original List Price ($)</label>
                            <input 
                              type="number"
                              value={dealForm.original_list_price}
                              onChange={e => setDealForm(f => ({ ...f, original_list_price: e.target.value }))}
                              className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              placeholder="150000"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                          <input 
                            type="checkbox"
                            checked={dealForm.had_price_reduction}
                            onChange={e => setDealForm(f => ({ ...f, had_price_reduction: e.target.checked }))}
                            className="w-5 h-5 rounded"
                          />
                          <label className="text-slate-300 text-sm">Had Price Reduction</label>
                        </div>
                        {dealForm.had_price_reduction && (
                          <div>
                            <label className="text-slate-400 text-sm">Original Under Contract Price ($)</label>
                            <input 
                              type="number"
                              value={dealForm.original_uc_price}
                              onChange={e => setDealForm(f => ({ ...f, original_uc_price: e.target.value }))}
                              className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              placeholder="120000"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 bg-amber-900/30 rounded-lg border border-amber-700/30">
                          <input 
                            type="checkbox"
                            checked={dealForm.list_back_secured}
                            onChange={e => setDealForm(f => ({ ...f, list_back_secured: e.target.checked }))}
                            className="w-5 h-5 rounded"
                          />
                          <label className="text-amber-300 text-sm font-medium">🔙 List Back Secured</label>
                        </div>
                        {dealForm.list_back_secured && (
                          <div>
                            <label className="text-slate-400 text-sm">Commission % Secured</label>
                            <input 
                              type="number"
                              step="0.1"
                              value={dealForm.list_back_commission_pct}
                              onChange={e => setDealForm(f => ({ ...f, list_back_commission_pct: e.target.value }))}
                              className="w-full mt-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                              placeholder="2.5"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 p-6 pt-4 border-t border-slate-700">
                    <button 
                      onClick={() => { setShowAddDeal(false); setEditingDeal(null); }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        // Validation based on deal type
                        if (dealForm.deal_type === 'wholesale') {
                          if (!dealForm.property_address || !dealForm.uc_price || !dealForm.sold_price || !dealForm.closed_date) {
                            alert('Please fill in all required fields');
                            return;
                          }
                        } else {
                          // Traditional deal
                          if (!dealForm.property_address || !dealForm.sale_price || !dealForm.commission_amount || !dealForm.closed_date) {
                            alert('Please fill in all required fields (Property Address, Sale Price, Commission Amount, Closed Date)');
                            return;
                          }
                        }
                        
                        const dealData = {
                          organization_id: organization.id,
                          user_id: editingDeal?.user_id || currentUser.id,
                          property_address: dealForm.property_address,
                          closed_date: dealForm.closed_date,
                          notes: dealForm.notes,
                          deal_type: dealForm.deal_type
                        };

                        if (dealForm.deal_type === 'wholesale') {
                          dealData.uc_price = parseFloat(dealForm.uc_price);
                          dealData.sold_price = parseFloat(dealForm.sold_price);
                          dealData.split_with_user_id = dealForm.split_with_user_id || null;
                          dealData.split_type = dealForm.split_with_user_id ? dealForm.split_type : null;
                          dealData.split_percentage = dealForm.split_with_user_id && dealForm.split_type === 'percentage' ? parseFloat(dealForm.split_percentage) : null;
                          dealData.split_amount = dealForm.split_with_user_id && dealForm.split_type === 'fixed' ? parseFloat(dealForm.split_amount) : null;
                          dealData.deal_source = dealForm.deal_source;
                          dealData.original_list_price = dealForm.deal_source === 'on_market' && dealForm.original_list_price ? parseFloat(dealForm.original_list_price) : null;
                          dealData.had_price_reduction = dealForm.had_price_reduction;
                          dealData.original_uc_price = dealForm.had_price_reduction && dealForm.original_uc_price ? parseFloat(dealForm.original_uc_price) : null;
                          dealData.list_back_secured = dealForm.list_back_secured;
                          dealData.list_back_commission_pct = dealForm.list_back_secured && dealForm.list_back_commission_pct ? parseFloat(dealForm.list_back_commission_pct) : null;
                          // Dispo help fields
                          dealData.dispo_help = dealForm.dispo_help || false;
                          dealData.dispo_name = dealForm.dispo_help ? dealForm.dispo_name : null;
                          dealData.dispo_email = dealForm.dispo_help ? dealForm.dispo_email : null;
                          dealData.dispo_phone = dealForm.dispo_help ? dealForm.dispo_phone : null;
                          dealData.dispo_share_type = dealForm.dispo_help ? dealForm.dispo_share_type : null;
                          dealData.dispo_share_percentage = dealForm.dispo_help && dealForm.dispo_share_type === 'percentage' ? parseFloat(dealForm.dispo_share_percentage) : null;
                          dealData.dispo_share_amount = dealForm.dispo_help && dealForm.dispo_share_type === 'fixed' ? parseFloat(dealForm.dispo_share_amount) : null;
                          // Realtor commission fields (commission % calculated on UC price)
                          dealData.realtor_commission_paid = dealForm.realtor_commission_paid || false;
                          dealData.realtor_commission_type = dealForm.realtor_commission_paid ? dealForm.realtor_commission_type : null;
                          dealData.realtor_commission_percentage = dealForm.realtor_commission_paid && dealForm.realtor_commission_type === 'percentage' ? parseFloat(dealForm.realtor_commission_percentage) : null;
                          dealData.realtor_commission_amount = dealForm.realtor_commission_paid && dealForm.realtor_commission_type === 'fixed' ? parseFloat(dealForm.realtor_commission_amount) : null;
                          // Attorney fee fields
                          dealData.attorney_used = dealForm.attorney_used || false;
                          dealData.attorney_fee = dealForm.attorney_used && dealForm.attorney_fee ? parseFloat(dealForm.attorney_fee) : null;
                          dealData.sale_price = null;
                          dealData.commission_amount = null;
                        } else {
                          // Traditional deal
                          dealData.sale_price = parseFloat(dealForm.sale_price);
                          dealData.commission_amount = parseFloat(dealForm.commission_amount);
                          dealData.uc_price = null;
                          dealData.sold_price = null;
                          dealData.split_with_user_id = null;
                          dealData.split_type = null;
                          dealData.split_percentage = null;
                          dealData.split_amount = null;
                          dealData.deal_source = null;
                          dealData.original_list_price = null;
                          dealData.had_price_reduction = false;
                          dealData.original_uc_price = null;
                          dealData.list_back_secured = false;
                          dealData.list_back_commission_pct = null;
                          dealData.dispo_help = false;
                          dealData.dispo_name = null;
                          dealData.dispo_email = null;
                          dealData.dispo_phone = null;
                          dealData.dispo_share_type = null;
                          dealData.dispo_share_percentage = null;
                          dealData.dispo_share_amount = null;
                          dealData.realtor_commission_paid = false;
                          dealData.realtor_commission_type = null;
                          dealData.realtor_commission_percentage = null;
                          dealData.realtor_commission_amount = null;
                          dealData.attorney_used = false;
                          dealData.attorney_fee = null;
                        }

                        // Handle deal save with file uploads
                        let dealId = editingDeal?.id;
                        
                        try {
                          if (editingDeal) {
                            const { data, error } = await db.deals.update(editingDeal.id, dealData);
                            if (error) throw new Error(error.message || JSON.stringify(error));
                          } else {
                            const { data, error } = await db.deals.create(dealData);
                            console.log('Create result:', { data, error });
                            if (error) throw new Error(error.message || JSON.stringify(error));
                            if (data && data[0]) dealId = data[0].id;
                          }
                          
                          // Upload any new files
                          if (dealId) {
                            const fileUpdates = {};
                            if (dealFiles.purchase_contract) {
                              const url = await uploadDealDocument(dealFiles.purchase_contract, dealId, 'purchase_contract');
                              if (url) fileUpdates.purchase_contract_url = url;
                            }
                            if (dealFiles.assignment_contract) {
                              const url = await uploadDealDocument(dealFiles.assignment_contract, dealId, 'assignment_contract');
                              if (url) fileUpdates.assignment_contract_url = url;
                            }
                            if (dealFiles.hud) {
                              const url = await uploadDealDocument(dealFiles.hud, dealId, 'hud');
                              if (url) fileUpdates.hud_url = url;
                            }
                            // Update deal with file URLs if any were uploaded
                            if (Object.keys(fileUpdates).length > 0) {
                              await db.deals.update(dealId, fileUpdates);
                            }
                          }
                          
                          // Auto-update KPI deals_closed counter for new deals (not edits)
                          if (!editingDeal && dealForm.deal_type === 'wholesale') {
                            const dealDate = dealForm.closed_date;
                            // Update primary user's KPI
                            const primaryUserId = currentUser.id;
                            const { data: primaryKpi } = await db.kpis.getByUserAndDate(primaryUserId, dealDate);
                            const primaryCurrent = primaryKpi?.[0]?.deals_closed || 0;
                            await db.kpis.upsert({ 
                              user_id: primaryUserId, 
                              date: dealDate, 
                              deals_closed: primaryCurrent + 1,
                              offers: primaryKpi?.[0]?.offers || 0,
                              new_agents: primaryKpi?.[0]?.new_agents || 0,
                              follow_ups: primaryKpi?.[0]?.follow_ups || 0,
                              phone_calls: primaryKpi?.[0]?.phone_calls || 0,
                              deals_under_contract: primaryKpi?.[0]?.deals_under_contract || 0,
                              list_backs: primaryKpi?.[0]?.list_backs || 0,
                              notes: primaryKpi?.[0]?.notes || ''
                            });
                            
                            // Update partner's KPI if split
                            if (dealForm.split_with_user_id) {
                              const partnerId = dealForm.split_with_user_id;
                              const { data: partnerKpi } = await db.kpis.getByUserAndDate(partnerId, dealDate);
                              const partnerCurrent = partnerKpi?.[0]?.deals_closed || 0;
                              await db.kpis.upsert({ 
                                user_id: partnerId, 
                                date: dealDate, 
                                deals_closed: partnerCurrent + 1,
                                offers: partnerKpi?.[0]?.offers || 0,
                                new_agents: partnerKpi?.[0]?.new_agents || 0,
                                follow_ups: partnerKpi?.[0]?.follow_ups || 0,
                                phone_calls: partnerKpi?.[0]?.phone_calls || 0,
                                deals_under_contract: partnerKpi?.[0]?.deals_under_contract || 0,
                                list_backs: partnerKpi?.[0]?.list_backs || 0,
                                notes: partnerKpi?.[0]?.notes || ''
                              });
                            }
                            // Reload KPIs to reflect changes
                            loadTeamData();
                          }
                          
                          setDealFiles({ purchase_contract: null, assignment_contract: null, hud: null });
                          setShowAddDeal(false);
                          setEditingDeal(null);
                          loadDeals();
                        } catch (error) {
                          console.error('Deal save error:', error);
                          alert('Failed to save deal: ' + error.message);
                        }
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
                    >
                      {editingDeal ? 'Save Changes' : 'Add Deal'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'history' && (
          <div className="space-y-4">
            {/* Mobile: Tab switcher for History/Admin */}
            {currentUser?.role === 'owner' && (
              <div className="md:hidden flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button 
                  onClick={() => setCurrentTab('history')} 
                  className="flex-1 py-2 px-3 rounded-md text-sm font-semibold bg-blue-600 text-white"
                >
                  📅 History
                </button>
                <button 
                  onClick={() => setCurrentTab('admin')} 
                  className="flex-1 py-2 px-3 rounded-md text-sm font-semibold bg-slate-700 text-slate-300"
                >
                  👑 Admin
                </button>
              </div>
            )}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">📅 History</h2>
              <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600" />
            </div>
            {teamMembers.map(user => {
              const k = teamKPIs[user.id]?.[historyDate] || {};
              return (
                <div key={user.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2"><UserAvatar user={user} size="sm" /><h3 className="text-white font-bold">{user.display_name || user.name}</h3></div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
                    {[['Offers', k.offers], ['New', k.new_agents], ['Follow', k.follow_ups], ['Calls', k.phone_calls], ['UC', k.deals_under_contract], ['Closed', k.deals_closed]].map(([l, v]) => (
                      <div key={l} className="bg-slate-700 rounded p-2 text-center"><p className="text-slate-400 text-xs">{l}</p><p className="text-white font-bold">{v || 0}</p></div>
                    ))}
                  </div>
                  {k.notes && <p className="text-slate-400 text-sm mt-2">📝 {k.notes}</p>}
                </div>
              );
            })}
          </div>
        )}

        {currentTab === 'admin' && currentUser?.role === 'owner' && (
          <div className="space-y-4">
            {/* Mobile: Tab switcher for History/Admin */}
            <div className="md:hidden flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button 
                onClick={() => setCurrentTab('history')} 
                className="flex-1 py-2 px-3 rounded-md text-sm font-semibold bg-slate-700 text-slate-300"
              >
                📅 History
              </button>
              <button 
                onClick={() => setCurrentTab('admin')} 
                className="flex-1 py-2 px-3 rounded-md text-sm font-semibold bg-red-600 text-white"
              >
                👑 Admin
              </button>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">👑 Admin Panel</h2>
              <div className="mb-6 bg-slate-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">📊 Team KPI Goals</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[['Daily Offers', 'daily_offers'], ['Daily Calls', 'daily_calls'], ['Daily New Agent Texts', 'daily_new_agents'], ['Daily Follow-up Texts', 'daily_follow_ups'], ['Weekly Contracts', 'weekly_contracts'], ['Monthly Closed Deals', 'monthly_closed']].map(([label, key]) => (
                    <div key={key}>
                      <label className="text-slate-400 text-xs">{label}</label>
                      <input type="number" value={kpiGoals[key]} onChange={e => setKpiGoals(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-600 text-white rounded px-3 py-2 mt-1" />
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-600 mt-4 pt-4">
                  <h4 className="text-amber-400 font-semibold mb-3">💰 Yearly Revenue Goals (Owner Only)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-xs">Yearly Company Revenue Goal ($)</label>
                      <input type="number" value={kpiGoals.yearly_revenue_goal || 500000} onChange={e => setKpiGoals(prev => ({ ...prev, yearly_revenue_goal: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-600 text-white rounded px-3 py-2 mt-1" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs">Yearly Personal Net Goal ($)</label>
                      <input type="number" value={kpiGoals.yearly_personal_net_goal || 250000} onChange={e => setKpiGoals(prev => ({ ...prev, yearly_personal_net_goal: parseInt(e.target.value) || 0 }))} className="w-full bg-slate-600 text-white rounded px-3 py-2 mt-1" />
                    </div>
                  </div>
                </div>
                <button onClick={handleKpiGoalsSave} disabled={kpiSaving} className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50">{kpiSaving ? 'Saving...' : '💾 Save KPI Goals'}</button>
              </div>
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Invite Codes</h3>
                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <label className="text-slate-400 text-sm mb-2 block">Create Custom Invite Code</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={customInviteCode} 
                      onChange={e => setCustomInviteCode(e.target.value.toUpperCase())} 
                      placeholder="e.g. TEAM2024 or WELCOME" 
                      className="flex-1 bg-slate-600 text-white rounded-lg px-4 py-2 border border-slate-500 focus:border-green-500 focus:outline-none font-mono uppercase tracking-wider"
                    />
                    <button onClick={() => generateInvite(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">Create</button>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">Or <button onClick={() => generateInvite(false)} className="text-green-400 hover:text-green-300 underline">auto-generate a random code</button></p>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-400 text-sm">Active Codes:</p>
                  {invites.filter(i => i.is_active).map(inv => (
                    <div key={inv.id} className="bg-slate-700 rounded-lg p-3 flex justify-between items-center">
                      <code className="text-green-400 font-mono text-lg">{inv.code}</code>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">Active</span>
                        <button onClick={() => deleteInvite(inv.id, inv.code)} className="text-red-400 hover:text-red-300 text-sm">🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                  {invites.filter(i => i.is_active).length === 0 && <p className="text-slate-500 text-sm">No active invite codes yet.</p>}
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">✅ Approved Names</h3>
                <p className="text-slate-400 text-xs mb-3">Add names here to allow signup (in addition to names from Google Sheet)</p>
                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newApprovedName} 
                      onChange={e => setNewApprovedName(e.target.value)} 
                      placeholder="e.g. John or John Smith" 
                      className="flex-1 bg-slate-600 text-white rounded-lg px-4 py-2 border border-slate-500 focus:border-green-500 focus:outline-none"
                      onKeyPress={e => e.key === 'Enter' && addApprovedName()}
                    />
                    <button onClick={addApprovedName} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">Add</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {approvedNames.map(a => (
                    <div key={a.id} className="bg-slate-700 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-white">{a.name}</span>
                      <button onClick={() => deleteApprovedName(a.id, a.name)} className="text-red-400 hover:text-red-300 text-sm">🗑️ Remove</button>
                    </div>
                  ))}
                  {approvedNames.length === 0 && <p className="text-slate-500 text-sm">No manually approved names. Names from Google Sheet are automatically allowed.</p>}
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Team Members ({teamMembers.length})</h3>
                {teamMembers.map(u => (
                  <div key={u.id} className="bg-slate-700 rounded-lg p-3 mb-2 flex items-center gap-3">
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1">
                      <p className="text-white font-semibold">{u.display_name || u.name}</p>
                      <p className="text-slate-400 text-sm">{u.email}</p>
                    </div>
                    <button onClick={() => resyncUser(u)} className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1 bg-slate-600 rounded">🔄 Sync</button>
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
