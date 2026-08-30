// src/components/ChildProfileBuilder.jsx
// "About Your Little One – 2" · High-Conversion Lead-Capture Profile Builder
// Single-column mobile-first form → Gemini AI generates profile →
// delivered by Email + SMS (no on-screen output) → Success screen.

import { useState, useCallback } from 'react';
import {
  Sparkles, ArrowLeft, Heart, Flame, ShieldAlert,
  Users, Smile, Award, Check, ShieldCheck
} from 'lucide-react';
import './ChildProfileBuilder.css';

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

const CORE_TRAITS = [
  {
    id: 'curious',
    label: 'Curious & Inquisitive',
    desc: 'Loves to explore & ask "why?"',
    icon: Smile,
    color: '#3b82f6',
    emoji: '🔍',
    subTraitGroups: [
      { groupLabel: 'Instrument Sounds', chips: ['Piano notes', 'Drum kicks', 'Shaker sounds', 'Guitar strums', 'Triangle rings'] },
      { groupLabel: 'Music Characters', chips: ['Banjo the Giraffe', 'Drummer Dan', 'Shaker Sue'] },
      { groupLabel: 'Learning Style', chips: ['Visual learner', 'Asks lots of questions', 'Hands-on discovery'] }
    ]
  },
  {
    id: 'energetic',
    label: 'High Energy & Active',
    desc: 'Loves to move, tap & jump!',
    icon: Flame,
    color: '#f97316',
    emoji: '⚡',
    subTraitGroups: [
      { groupLabel: 'Instrument Sounds', chips: ['Big drum beats', 'Stomping rhythms', 'Shaker shakes', 'Clap-along songs'] },
      { groupLabel: 'Movement Style', chips: ['Dancing in circles', 'Jumping with the beat', 'Waving arms to tempo', 'Marching in place'] },
      { groupLabel: 'Energy Outlets', chips: ['Fast tempos', 'Call-and-response', 'Physical counting games'] }
    ]
  },
  {
    id: 'shy',
    label: 'Shy & Observant',
    desc: 'Watches carefully before joining',
    icon: Heart,
    color: '#a855f7',
    emoji: '💜',
    subTraitGroups: [
      { groupLabel: 'Comfort Zone', chips: ['Watching first', 'One-on-one moments', 'Familiar songs', 'Gentle transitions'] },
      { groupLabel: 'Encouragement Style', chips: ['Warm invitations', 'No pressure spotlights', 'Mascot buddy moments'] },
      { groupLabel: 'Preferred Pace', chips: ['Slow introductions', 'Repeated familiar activities', 'Visual cues before verbal'] }
    ]
  },
  {
    id: 'sensitive',
    label: 'Sensory Sensitive',
    desc: 'Prefers gentler sounds & transitions',
    icon: ShieldAlert,
    color: '#ef4444',
    emoji: '🛡️',
    subTraitGroups: [
      { groupLabel: 'Sound Preferences', chips: ['Soft melodies', 'Gradual volume build', 'No sudden crashes', 'Lower frequencies'] },
      { groupLabel: 'Transition Support', chips: ['5-minute warnings', 'Predictable routines', 'Visual countdowns'] },
      { groupLabel: 'Comfort Sounds', chips: ['Singing voices', 'Gentle shaker', 'Slow piano'] }
    ]
  },
  {
    id: 'social',
    label: 'Social & Collaborative',
    desc: 'Thrives with friends & group play',
    icon: Users,
    color: '#10b981',
    emoji: '🤝',
    subTraitGroups: [
      { groupLabel: 'Group Activities', chips: ['Group counting games', 'Duet clapping', 'Call-and-response', 'Partner drumming'] },
      { groupLabel: 'Social Style', chips: ['Loves making friends', 'Imitates peers joyfully', 'Cheers for classmates', 'Turn-taking'] },
      { groupLabel: 'Instruments for Sharing', chips: ['Shakers together', 'Pass-the-drum', 'Echo singing'] }
    ]
  },
  {
    id: 'creative',
    label: 'Creative & Imaginative',
    desc: 'Makes up songs & stories',
    icon: Award,
    color: '#ec4899',
    emoji: '🎨',
    subTraitGroups: [
      { groupLabel: 'Creative Expression', chips: ['Making up songs', 'Story-telling with music', 'Drawing to music', 'Inventing instruments'] },
      { groupLabel: 'Musical Characters', chips: ['Banjo the Giraffe stories', 'Pretend conductor', 'Animal sound games'] },
      { groupLabel: 'Imaginative Play', chips: ['Musical adventures', 'Sound effect play', 'Rhythm storytelling'] }
    ]
  }
];

const SMART_SUGGESTIONS = [
  { id: 'fast-tempos',       label: '⚡ Loves fast tempos' },
  { id: 'gentle-transitions', label: '🌸 Needs gentle transitions' },
  { id: 'mascot-rewards',    label: '🦒 Loves mascot rewards' },
  { id: 'quieter-better',    label: '🤫 Quieter is better' },
  { id: 'counting-games',    label: '🔢 Loves counting games' },
  { id: 'easily-distracted', label: '🌀 Easily distracted' },
  { id: 'repetition-thrives', label: '🔄 Thrives with repetition' },
  { id: 'learning-to-share', label: '🤲 Learning to share' },
  { id: 'sensory-sounds',    label: '🎵 Sound explorer' },
  { id: 'vocal-shy',         label: '🎤 Building vocal confidence' }
];

const CLOUD_ENDPOINT = 'https://us-central1-stagetrack-v4-260430-461-92681.cloudfunctions.net/personalizedExplanation';

// ─────────────────────────────────────────────────────────────
// PHONE FORMATTER  (US: (555) 555-5555)
// ─────────────────────────────────────────────────────────────
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────
function validate(state) {
  const errors = {};
  if (!state.childName.trim())                    errors.childName = 'Please enter your child\'s name.';
  if (!state.age)                                 errors.age = 'Please select your child\'s age.';
  if (!state.parentEmail.trim())                  errors.parentEmail = 'Email is required.';
  else if (!/\S+@\S+\.\S+/.test(state.parentEmail)) errors.parentEmail = 'Please enter a valid email.';
  if (!state.parentPhone.trim())                  errors.parentPhone = 'Phone is required for SMS delivery.';
  else if (state.parentPhone.replace(/\D/g, '').length < 10) errors.parentPhone = 'Please enter a valid 10-digit phone number.';
  if (state.coreTraits.length === 0)              errors.coreTraits = 'Please select at least one personality trait.';
  return errors;
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ChildProfileBuilder({ onClose, standalone = false }) {
  // ── Form state ─────────────────────────────────────────────
  const [childName, setChildName]     = useState('');
  const [age, setAge]                 = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [coreTraits, setCoreTraits]   = useState([]);
  const [subTraits, setSubTraits]     = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState([]);
  const [expandedTraits, setExpandedTraits]   = useState({});
  const [errors, setErrors]           = useState({});

  // ── Screen state: 'form' | 'loading' | 'success' ──────────
  const [screen, setScreen]         = useState('form');
  const [loadingStep, setLoadingStep] = useState('');

  // ─────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────

  const handleToggleTrait = useCallback((traitId) => {
    setCoreTraits(prev => {
      const next = prev.includes(traitId)
        ? prev.filter(t => t !== traitId)
        : [...prev, traitId];
      return next;
    });
    setExpandedTraits(prev => ({
      ...prev,
      [traitId]: !prev[traitId]
    }));
    setErrors(e => ({ ...e, coreTraits: undefined }));
  }, []);

  const handleToggleSubTrait = useCallback((chip, e) => {
    e && e.stopPropagation();
    setSubTraits(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  }, []);

  const handleToggleSuggestion = useCallback((id) => {
    setAdditionalNotes(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  // ─────────────────────────────────────────────────────────
  // BUILD PAYLOAD
  // ─────────────────────────────────────────────────────────
  const buildPayload = useCallback(() => {
    const activeSuggestions = SMART_SUGGESTIONS
      .filter(s => additionalNotes.includes(s.id))
      .map(s => s.label.replace(/^[^\s]+\s/, '')); // strip emoji

    const name = childName.trim() || 'Your Little One';
    const rawPhone = parentPhone.replace(/\D/g, '');
    const e164Phone = rawPhone.length === 10 ? `+1${rawPhone}` : `+${rawPhone}`;

    return {
      childName: name,
      childAge: age ? `${age} years old` : '2-3 years old',
      parentEmail: parentEmail.trim(),
      parentPhone: e164Phone,

      // Delivery flags — backend must handle these
      sendEmail: true,
      sendSMS: true,
      action: 'generate_and_deliver',

      // Profile data
      traitsSelected: coreTraits,
      selectedSubTraits: subTraits,
      additionalNoteIds: additionalNotes,
      notes: activeSuggestions.join('. '),

      // System prompt override for Bluey-style 3-paragraph profile
      systemPromptOverride:
        `You are a warm, enthusiastic toddler music educator writing a profile for "Music Fun With Your Little One". ` +
        `Write exactly 3 paragraphs in a Bluey-inspired storytelling voice — joyful, emotionally warm, and specific to the child's traits and age. ` +
        `Use the child's name frequently. ` +
        `Paragraph 1: Introduce the child's personality and primary musical trait. ` +
        `Paragraph 2: Describe how they specifically engage with music and what moments light them up. ` +
        `Paragraph 3: Provide 2–3 concrete instructor recommendations and milestone goals. ` +
        `Keep it under 250 words total. Never use generic language. ` +
        `Make the parent feel deeply seen and excited about their child's musical journey.`,

      profileVersion: 'v2-mobile',
    };
  }, [childName, age, parentEmail, parentPhone, coreTraits, subTraits, additionalNotes]);

  // ─────────────────────────────────────────────────────────
  // GENERATE & SEND
  // ─────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    const formState = { childName, age, parentEmail, parentPhone, coreTraits, subTraits, additionalNotes };
    const errs = validate(formState);

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstErrKey = Object.keys(errs)[0];
      document.getElementById(`cpb-field-${firstErrKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setErrors({});
    setScreen('loading');

    const STEPS = [
      'Tuning up the musical analysis… 🎵',
      'Understanding your little one\'s personality…',
      'Crafting a warm, personalized profile…',
      'Preparing your report for delivery… 📬',
    ];

    let stepIdx = 0;
    setLoadingStep(STEPS[0]);
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1);
      setLoadingStep(STEPS[stepIdx]);
    }, 2200);

    try {
      const payload = buildPayload();
      const response = await fetch(CLOUD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(stepTimer);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server error: ${response.status}`);
      }

      setScreen('success');

    } catch (err) {
      clearInterval(stepTimer);
      console.error('[ChildProfileBuilder]', err);
      setScreen('form');
      setErrors({ _global: err.message || 'Something went wrong. Please try again.' });
    }
  }, [childName, age, parentEmail, parentPhone, coreTraits, subTraits, additionalNotes, buildPayload]);

  const handleStartOver = useCallback(() => {
    setChildName(''); setAge(''); setParentEmail(''); setParentPhone('');
    setCoreTraits([]); setSubTraits([]); setAdditionalNotes([]);
    setExpandedTraits({}); setErrors({});
    setScreen('form');
  }, []);

  const displayName = childName.trim() || 'your little one';

  // ─────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────
  const wrapperClass = standalone ? 'cpb-page' : 'cpb-container';

  // ─────────────────────────────────────────────────────────
  // ── LOADING SCREEN ────────────────────────────────────────
  // ─────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div className={wrapperClass}>
        {standalone && (
          <div className="cpb-page-header">
            <img src="/assets/Logo_modern.png" alt="Music Fun" className="cpb-page-logo" />
          </div>
        )}
        <div className="cpb-loading-screen">
          <div className="cpb-loader-ring" />
          <div className="cpb-loader-notes">
            <span className="cpb-loader-note">🎵</span>
            <span className="cpb-loader-note">🎶</span>
            <span className="cpb-loader-note">🎸</span>
            <span className="cpb-loader-note">🥁</span>
          </div>
          <h3 className="cpb-loading-title">Creating {displayName}'s profile…</h3>
          <p className="cpb-loading-step">{loadingStep}</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // ── SUCCESS SCREEN ────────────────────────────────────────
  // ─────────────────────────────────────────────────────────
  if (screen === 'success') {
    return (
      <div className={wrapperClass}>
        {standalone && (
          <div className="cpb-page-header">
            <img src="/assets/Logo_modern.png" alt="Music Fun" className="cpb-page-logo" />
          </div>
        )}
        <div className="cpb-success-screen">
          <span className="cpb-success-burst">🎉</span>

          <div className="cpb-success-card">
            <h2>
              {childName.trim() ? `${childName.trim()}'s` : "Your little one's"} Musical Profile is on its way! 🎵
            </h2>
            <p>
              We've created a warm, personalized musical profile and sent it directly to you — no waiting around!
            </p>

            <div className="cpb-success-delivery-list">
              {parentEmail && (
                <div className="cpb-success-delivery-item">
                  <span className="cpb-success-delivery-icon">📧</span>
                  <div className="cpb-success-delivery-text">
                    <strong>Sent to your inbox</strong>
                    <span>{parentEmail}</span>
                  </div>
                </div>
              )}
              {parentPhone && (
                <div className="cpb-success-delivery-item">
                  <span className="cpb-success-delivery-icon">📱</span>
                  <div className="cpb-success-delivery-text">
                    <strong>Text message sent</strong>
                    <span>{parentPhone} · Profile summary + link</span>
                  </div>
                </div>
              )}
              <div className="cpb-success-delivery-item">
                <span className="cpb-success-delivery-icon">🦒</span>
                <div className="cpb-success-delivery-text">
                  <strong>Shared with your instructor</strong>
                  <span>They'll use this to personalise every session</span>
                </div>
              </div>
            </div>

            <div className="cpb-success-cta-row">
              {!standalone && onClose && (
                <button className="cpb-success-primary-btn" onClick={onClose}>
                  <span>🎶 Back to Music Class</span>
                </button>
              )}
              {standalone && (
                <button
                  className="cpb-success-primary-btn"
                  onClick={() => window.open('https://musicfunwithyourlittleone.com', '_blank')}
                >
                  <span>🎵 Explore Music Fun →</span>
                </button>
              )}
              <button className="cpb-success-secondary-btn" onClick={handleStartOver}>
                Create another profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // ── FORM SCREEN ───────────────────────────────────────────
  // ─────────────────────────────────────────────────────────
  return (
    <div className={wrapperClass}>

      {/* Header */}
      {standalone ? (
        <div className="cpb-page-header">
          <img src="/assets/Logo_modern.png" alt="Music Fun" className="cpb-page-logo" />
        </div>
      ) : (
        onClose && (
          <button className="cpb-back-btn" onClick={onClose}>
            <ArrowLeft size={15} />
            <span>Back to Class</span>
          </button>
        )
      )}

      {/* Hero */}
      <div className="cpb-hero">
        <span className="cpb-hero-emoji">🎵</span>
        <h1>Discover <span>Your Little One's</span> Musical Personality</h1>
        <p>
          Takes 2 minutes · We'll email & text a warm instructor-ready profile
          crafted just for {displayName} using Gemini AI.
        </p>
      </div>

      {/* ── FORM ─────────────────────────────────────────── */}
      <div className="cpb-form-col">

        {/* Global error */}
        {errors._global && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '0.85rem', color: '#c0521a', fontWeight: 700 }}>
            ⚠️ {errors._global}
          </div>
        )}

        {/* STEP 1 — Basic Info */}
        <div className="cpb-section-card">
          <h3 className="cpb-section-label">
            <span className="cpb-step-num">1</span>
            About Your Child
          </h3>

          {/* Name */}
          <div className="cpb-input-group" id="cpb-field-childName">
            <label>Child's First Name</label>
            <input
              type="text"
              value={childName}
              onChange={e => { setChildName(e.target.value); setErrors(er => ({...er, childName: undefined})); }}
              placeholder="e.g. Danny, Emma…"
              autoComplete="off"
              className={errors.childName ? 'error' : ''}
            />
            {errors.childName && <span className="cpb-error-msg">{errors.childName}</span>}
          </div>

          {/* Age */}
          <div className="cpb-input-group" id="cpb-field-age">
            <label>Child's Age</label>
            <div className="cpb-age-toggle-row">
              {['2', '3'].map(a => (
                <button
                  key={a}
                  className={`cpb-age-toggle-btn ${age === a ? 'active' : ''}`}
                  onClick={() => { setAge(a); setErrors(er => ({...er, age: undefined})); }}
                  type="button"
                >
                  <span>{a}</span>
                  <span className="cpb-age-label">Years Old</span>
                </button>
              ))}
            </div>
            {errors.age && <span className="cpb-error-msg">{errors.age}</span>}
          </div>

          {/* Email */}
          <div className="cpb-input-group" id="cpb-field-parentEmail">
            <label>
              Parent Email <span className="cpb-required-star">*</span>
            </label>
            <input
              type="email"
              value={parentEmail}
              onChange={e => { setParentEmail(e.target.value); setErrors(er => ({...er, parentEmail: undefined})); }}
              placeholder="parent@example.com"
              className={errors.parentEmail ? 'error' : ''}
              autoComplete="email"
            />
            {errors.parentEmail && <span className="cpb-error-msg">{errors.parentEmail}</span>}
          </div>

          {/* Phone */}
          <div className="cpb-input-group" id="cpb-field-parentPhone">
            <label>
              Cell Phone <span className="cpb-required-star">*</span>
              &nbsp;<span style={{ fontSize: '0.72rem', color: '#a07050', fontWeight: 600 }}>(for instant report text)</span>
            </label>
            <div className="cpb-phone-row">
              <div className="cpb-phone-prefix">🇺🇸 +1</div>
              <div className="cpb-phone-input-wrap">
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={e => {
                    setParentPhone(formatPhone(e.target.value));
                    setErrors(er => ({...er, parentPhone: undefined}));
                  }}
                  placeholder="(555) 555-5555"
                  className={errors.parentPhone ? 'error' : ''}
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </div>
            </div>
            {errors.parentPhone && <span className="cpb-error-msg">{errors.parentPhone}</span>}
          </div>
        </div>

        {/* STEP 2 — Core Traits */}
        <div className="cpb-section-card" id="cpb-field-coreTraits">
          <h3 className="cpb-section-label">
            <span className="cpb-step-num">2</span>
            Core Personality Traits
          </h3>
          <p className="cpb-section-sub">
            Tap any traits that sound like {displayName} — expand for more detail.
          </p>
          {errors.coreTraits && <span className="cpb-error-msg">{errors.coreTraits}</span>}

          <div className="cpb-traits-list">
            {CORE_TRAITS.map(trait => {
              const Icon = trait.icon;
              const isActive   = coreTraits.includes(trait.id);
              const isExpanded = expandedTraits[trait.id];

              return (
                <div
                  key={trait.id}
                  className={`cpb-trait-card ${isActive ? 'active' : ''}`}
                  style={{ '--trait-color': trait.color }}
                >
                  {/* Header row — tap to select & toggle */}
                  <div
                    className="cpb-trait-card-header"
                    onClick={() => handleToggleTrait(trait.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleToggleTrait(trait.id)}
                  >
                    <div className="cpb-trait-icon-wrap">
                      <Icon size={18} className="cpb-trait-icon" color={isActive ? trait.color : '#c9a07a'} />
                    </div>
                    <div className="cpb-trait-info">
                      <span className="cpb-trait-name">{trait.label}</span>
                      <span className="cpb-trait-desc">{trait.desc}</span>
                    </div>
                    <div className="cpb-trait-check">
                      <Check size={13} className="cpb-trait-check-icon" />
                    </div>
                  </div>

                  {/* Expandable sub-traits */}
                  <div className={`cpb-trait-body ${isActive && isExpanded ? 'open' : ''}`}>
                    <div className="cpb-trait-body-inner">
                      {trait.subTraitGroups.map(group => (
                        <div key={group.groupLabel}>
                          <div className="cpb-subtrait-group-label">{group.groupLabel}</div>
                          <div className="cpb-chips-row" style={{ marginTop: '6px' }}>
                            {group.chips.map(chip => (
                              <button
                                key={chip}
                                type="button"
                                className={`cpb-chip ${subTraits.includes(chip) ? 'active' : ''}`}
                                style={{ '--chip-color': trait.color }}
                                onClick={e => handleToggleSubTrait(chip, e)}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 3 — Smart Suggestions */}
        <div className="cpb-section-card">
          <h3 className="cpb-section-label">
            <span className="cpb-step-num">3</span>
            Anything Else We Should Know?
          </h3>
          <p className="cpb-section-sub">
            Tap chips that add helpful context for {displayName}'s instructor.
          </p>
          <div className="cpb-suggestion-chips">
            {SMART_SUGGESTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                className={`cpb-suggestion-chip ${additionalNotes.includes(s.id) ? 'active' : ''}`}
                onClick={() => handleToggleSuggestion(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

      </div>
      {/* END .cpb-form-col */}

      {/* ── CTA ──────────────────────────────────────────── */}
      <div className="cpb-cta-section">

        {/* What gets delivered */}
        <div className="cpb-delivery-pills">
          <span className="cpb-delivery-pill">📧 Email report</span>
          <span className="cpb-delivery-pill">📱 SMS summary</span>
          <span className="cpb-delivery-pill">🔒 Secure &amp; private</span>
        </div>

        <button
          className="cpb-generate-btn"
          onClick={handleGenerate}
          type="button"
        >
          <Sparkles size={20} />
          <span>✨ Create My Child's Musical Profile</span>
        </button>

        <div className="cpb-trust-row">
          <ShieldCheck size={14} color="#10b981" />
          <span>Profile generated securely by <strong>Gemini AI</strong> · No keys in your browser</span>
        </div>

      </div>

    </div>
  );
}
