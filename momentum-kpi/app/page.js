'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bnzbaywpfzfochqurqte.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuemJheXdwZnpmb2NocXVycXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTU0MTYsImV4cCI6MjA4NDg5MTQxNn0._d0wNc0kzacLHAUYT1Iafx4LeKjrQA8NGhXScz4xu60';

// Supabase Auth Client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_KPI_GOALS = {
  daily_offers: 20,
  daily_calls: 20,
  daily_new_agents: 300,
  daily_follow_ups: 500,
  weekly_contracts: 2,
  monthly_closed: 5
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
    create: (invite) => supabaseFetch('invites', { method: 'POST', body: [invite] }),
    use: (code, userId) => supabaseFetch(`invites?code=eq.${code}`, { method: 'PATCH', body: { used_by: userId, used_at: new Date().toISOString(), is_active: false } }),
    getByOrg: (orgId) => supabaseFetch(`invites?organization_id=eq.${orgId}&select=*`),
    delete: (inviteId) => supabaseFetch(`invites?id=eq.${inviteId}`, { method: 'DELETE' }),
  },
  kpis: {
    getByOrg: (orgId, userIds) => supabaseFetch(`daily_kpis?user_id=in.(${userIds.join(',')})&select=*`),
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
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Offers Submitted</h3>
            {isGoogleSync && (
              <p className="text-sm text-green-400 mt-0.5">📊 Synced from Google Sheets</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{status.emoji}</span>
            <span className={`text-lg font-extrabold tracking-wide bg-gradient-to-r ${status.color} bg-clip-text text-transparent`}>
              {status.text}
            </span>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex items-center gap-8">
          <CircularProgress percentage={percentage} size={130} strokeWidth={10} />
          
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold tracking-tight ${isComplete ? 'text-green-400' : 'text-white'}`}>{offers}</span>
                <span className="text-slate-500 text-lg font-medium">/ {goal}</span>
              </div>
              <p className="text-slate-500 text-sm mt-1">Daily Target</p>
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
            
            <div className="flex items-center gap-2">
              {[25, 50, 75, 100].map((milestone) => (
                <div key={milestone} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${percentage >= milestone ? milestone === 100 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}>
                  {percentage >= milestone && <span>✓</span>}
                  <span>{milestone}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {!isGoogleSync && (
          <div className="flex gap-2 mt-6 pt-4 border-t border-slate-700/50">
            <button onClick={() => onUpdate(offers - 1)} className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white py-2.5 rounded-xl font-medium transition-all border border-slate-600/50">− 1</button>
            <button onClick={() => onUpdate(offers + 1)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20">+ 1</button>
            <button onClick={() => onUpdate(offers + 5)} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20">+ 5</button>
          </div>
        )}
      </div>
    </div>
  );
};

// iOS-style Notes Component (Full Page)
const NotesApp = ({ userId, notes, setNotes }) => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    }
  };

  const selectNote = (note) => {
    setSelectedNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
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
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreview = (content) => {
    if (!content) return 'No additional text';
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden" style={{ height: '500px' }}>
      <div className="flex h-full">
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

// Quick Notes Widget for Personal Tab
const QuickNotesWidget = ({ notes, setNotes, userId, onOpenFullNotes }) => {
  const [quickNote, setQuickNote] = useState('');
  const latestNote = notes[0];

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: '', avatar_emoji: '', avatar_url: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [kpiGoals, setKpiGoals] = useState(DEFAULT_KPI_GOALS);
  const [kpiSaving, setKpiSaving] = useState(false);
  const [userNotes, setUserNotes] = useState([]);
  const [customInviteCode, setCustomInviteCode] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const getGoals = () => organization?.kpi_goals ? { ...DEFAULT_KPI_GOALS, ...organization.kpi_goals } : DEFAULT_KPI_GOALS;

  const getMotivation = () => {
    const h = currentTime.getHours();
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
      if (organization.kpi_goals) setKpiGoals({ ...DEFAULT_KPI_GOALS, ...organization.kpi_goals });
    }
  }, [currentUser, organization]);

  useEffect(() => {
    if (currentUser && organization && currentTab !== 'personal') loadTeamData();
  }, [currentTab]);

  const loadUserNotes = async () => {
    if (!currentUser) return;
    const { data } = await db.notes.getByUser(currentUser.id);
    if (data) setUserNotes(data);
  };

  const checkSession = async () => {
    const saved = localStorage.getItem('momentum_user');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setProfileForm({ display_name: user.display_name || '', avatar_emoji: user.avatar_emoji || '', avatar_url: user.avatar_url || '' });
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
        await db.invites.use(invite.code, user.id);
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
      // Check if code already exists
      const { data: existing } = await db.invites.getByCode(code);
      if (existing?.length > 0) {
        alert('This invite code already exists. Please choose a different one.');
        return;
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
      alert(`✅ Synced ${count} offer record(s) for ${user.display_name || user.name}!`);
      loadTeamData();
    } else {
      alert(`No pending offers found for ${user.display_name || user.name}. Check that the name in Google Sheets matches.`);
    }
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

  const getMyKPI = () => teamKPIs[currentUser?.id]?.[today] || { offers: 0, new_agents: 0, follow_ups: 0, phone_calls: 0, deals_under_contract: 0, deals_closed: 0, notes: '' };

  const updateKPI = async (field, value) => {
    const current = getMyKPI();
    const newValue = typeof value === 'string' ? value : Math.max(0, value);
    const updated = { ...current, [field]: newValue, user_id: currentUser.id, date: today };
    setTeamKPIs(prev => ({ ...prev, [currentUser.id]: { ...prev[currentUser.id], [today]: updated } }));
    const { error } = await db.kpis.upsert({ user_id: currentUser.id, date: today, offers: updated.offers || 0, new_agents: updated.new_agents || 0, follow_ups: updated.follow_ups || 0, phone_calls: updated.phone_calls || 0, deals_under_contract: updated.deals_under_contract || 0, deals_closed: updated.deals_closed || 0, notes: updated.notes || '' });
    if (error) console.error('KPI save failed:', error);
  };

  const getStats = (userId, period) => {
    const userKPIs = teamKPIs[userId] || {};
    const now = new Date();
    let startDateStr, endDateStr;
    if (period === 'week') {
      const startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay());
      const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
      startDateStr = formatDateString(startDate); endDateStr = formatDateString(endDate);
    } else if (period === 'month') {
      startDateStr = formatDateString(new Date(now.getFullYear(), now.getMonth(), 1));
      endDateStr = formatDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (period === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDateStr = formatDateString(new Date(now.getFullYear(), quarter * 3, 1));
      endDateStr = formatDateString(new Date(now.getFullYear(), quarter * 3 + 3, 0));
    } else {
      startDateStr = endDateStr = formatDateString(now);
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
    let s = `⚡ MOMENTUM - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\nTEAM: ${t.offers} offers | ${t.texts} texts | ${t.calls} calls\n\n`;
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

  const pct = (c, g) => Math.min((c / g) * 100, 100);
  const pColor = (c, g) => pct(c, g) >= 100 ? 'bg-green-500' : pct(c, g) >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  if (view === 'loading') return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-white text-xl">⚡ Loading...</div></div>;

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
    <div className="min-h-screen bg-slate-900 p-4">
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

        {/* Header */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">⚡</span>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{organization?.name || 'Momentum'}</h1>
                <p className="text-slate-400 text-sm">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black text-white tracking-tight">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
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
          
          <div className="flex gap-2 mt-4 flex-wrap">
            {['personal', 'team', 'analytics', 'history', 'notes'].map(tab => (
              <button key={tab} onClick={() => setCurrentTab(tab)} className={`px-4 py-2 rounded-lg font-semibold transition ${currentTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                {tab === 'notes' ? '📝 Notes' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            {currentUser?.role === 'owner' && (
              <button onClick={() => setCurrentTab('admin')} className={`px-4 py-2 rounded-lg font-semibold transition ${currentTab === 'admin' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Admin</button>
            )}
          </div>
        </div>

        {currentTab === 'personal' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
              <button onClick={openProfileModal} className="hover:opacity-80 transition"><UserAvatar user={currentUser} size="lg" /></button>
              <div className="flex-1">
                <p className="text-white font-bold text-xl">{displayName}</p>
                <p className="text-slate-400 text-sm">Your daily KPIs</p>
              </div>
              <button onClick={openProfileModal} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium">✏️ Edit Profile</button>
            </div>

            <OffersCard offers={myKPI.offers || 0} goal={goals.daily_offers} isGoogleSync={organization?.google_sheet_sync} onUpdate={(value) => updateKPI('offers', value)} />

            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">Phone Conversations</span>
                <span className="text-white text-2xl font-bold">{myKPI.phone_calls || 0}/{goals.daily_calls}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
                <div className={`h-3 rounded-full ${pColor(myKPI.phone_calls || 0, goals.daily_calls)}`} style={{ width: `${pct(myKPI.phone_calls || 0, goals.daily_calls)}%` }}></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => updateKPI('phone_calls', (myKPI.phone_calls || 0) - 1)} className="flex-1 bg-slate-600 text-white py-2 rounded-lg">-1</button>
                <button onClick={() => updateKPI('phone_calls', (myKPI.phone_calls || 0) + 1)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg">+1</button>
                <button onClick={() => updateKPI('phone_calls', (myKPI.phone_calls || 0) + 5)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg">+5</button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">Agent Texts</span>
                <span className="text-white text-2xl font-bold">{totalTexts}/{goals.daily_new_agents + goals.daily_follow_ups}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
                <div className={`h-3 rounded-full ${pColor(totalTexts, goals.daily_new_agents + goals.daily_follow_ups)}`} style={{ width: `${pct(totalTexts, goals.daily_new_agents + goals.daily_follow_ups)}%` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'New Agents', field: 'new_agents', goal: goals.daily_new_agents }, { label: 'Follow-ups', field: 'follow_ups', goal: goals.daily_follow_ups }].map(({ label, field, goal }) => (
                  <div key={field} className="bg-slate-700 rounded-lg p-3">
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
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-white font-bold">Deals Under Contract</p>
                <p className="text-xs text-slate-400 mb-1">Weekly Goal: {goals.weekly_contracts}</p>
                <p className="text-3xl font-bold text-purple-400">{weeklyStats.contracts}/{goals.weekly_contracts}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => updateKPI('deals_under_contract', (myKPI.deals_under_contract || 0) - 1)} className="flex-1 bg-slate-600 text-white py-2 rounded-lg">-1</button>
                  <button onClick={() => updateKPI('deals_under_contract', (myKPI.deals_under_contract || 0) + 1)} className="flex-1 bg-purple-600 text-white py-2 rounded-lg">+1</button>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-white font-bold">Deals Closed</p>
                <p className="text-xs text-slate-400 mb-1">Monthly Goal: {goals.monthly_closed}</p>
                <p className="text-3xl font-bold text-yellow-400">{monthlyStats.closed}/{goals.monthly_closed}</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => updateKPI('deals_closed', (myKPI.deals_closed || 0) - 1)} className="flex-1 bg-slate-600 text-white py-2 rounded-lg">-1</button>
                  <button onClick={() => updateKPI('deals_closed', (myKPI.deals_closed || 0) + 1)} className="flex-1 bg-yellow-600 text-white py-2 rounded-lg">+1</button>
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
          </div>
        )}

        {currentTab === 'notes' && <NotesApp userId={currentUser?.id} notes={userNotes} setNotes={setUserNotes} />}

        {currentTab === 'team' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">🏆 Leaderboard</h2>
                <div className="flex gap-2">
                  {['week', 'month'].map(p => <button key={p} onClick={() => setLeaderboardPeriod(p)} className={`px-4 py-2 rounded-lg font-semibold ${leaderboardPeriod === p ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{p === 'week' ? 'Week' : 'Month'}</button>)}
                </div>
              </div>
              {getLeaderboard().map((e, i) => (
                <div key={e.user.id} className="bg-slate-700 rounded-lg p-4 mb-2 flex items-center gap-4">
                  <span className="text-3xl">{['🥇', '🥈', '🥉', '🏅'][i] || '🏅'}</span>
                  <UserAvatar user={e.user} size="sm" />
                  <div className="flex-1">
                    <p className="text-white font-bold">{e.user.display_name || e.user.name}</p>
                    <p className="text-slate-400 text-xs">Offers: {e.stats.offers} | Texts: {e.stats.texts} | Calls: {e.stats.calls}</p>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{e.score}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">📊 Analytics</h2>
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly', 'quarterly'].map(p => <button key={p} onClick={() => setAnalyticsPeriod(p)} className={`px-3 py-1 rounded text-sm font-semibold ${analyticsPeriod === p ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>)}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {(() => {
                  const t = getTeamTotals(analyticsPeriod);
                  const teamSize = teamMembers.length || 1;
                  const goalMultipliers = { daily: [1, 1, 1, 1, 1], weekly: [7, 7, 7, 1, 1], monthly: [30, 30, 30, 4, 1], quarterly: [90, 90, 90, 12, 3] }[analyticsPeriod];
                  const teamGoals = [goals.daily_offers * teamSize * goalMultipliers[0], (goals.daily_new_agents + goals.daily_follow_ups) * teamSize * goalMultipliers[1], goals.daily_calls * teamSize * goalMultipliers[2], goals.weekly_contracts * teamSize * goalMultipliers[3], goals.monthly_closed * teamSize * goalMultipliers[4]];
                  return [['Offers', t.offers, teamGoals[0]], ['Texts', t.texts, teamGoals[1]], ['Calls', t.calls, teamGoals[2]], ['UC', t.contracts, teamGoals[3]], ['Closed', t.closed, teamGoals[4]]].map(([n, v, g]) => (
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

        {currentTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">📅 History</h2>
              <input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600" />
            </div>
            {teamMembers.map(user => {
              const k = teamKPIs[user.id]?.[historyDate] || {};
              return (
                <div key={user.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2"><UserAvatar user={user} size="sm" /><h3 className="text-white font-bold">{user.display_name || user.name}</h3></div>
                  <div className="grid grid-cols-6 gap-2 text-sm">
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
