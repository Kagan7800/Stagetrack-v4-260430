// src/components/PersonalizedExplanationGenerator.jsx

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Sparkles, ArrowLeft, Copy, Check, Send, Printer, FileText, Heart, Flame, ShieldAlert, Users, Focus, Smile, Award, Plus, ShieldCheck
} from 'lucide-react';
import './PersonalizedExplanationGenerator.css';

// Predefined option definitions to make form-building robust and beautiful
const TRAIT_DEFINITIONS = {
  curious: {
    label: 'Curious & Inquisitive',
    icon: Smile,
    color: '#3b82f6',
    aboutKey: 'curiousAbout',
    refKey: 'curiousRefinements',
    aboutLabel: 'What are they curious about?',
    aboutOptions: ['Instrument Sounds', 'Tapping Rhythms', 'Banjo the Giraffe', 'Singing & Vocals'],
    refLabel: 'Sub-refinements',
    refPresets: {
      'Instrument Sounds': ['Piano notes', 'Drum kicks', 'Shaker sounds', 'Triangle rings'],
      'Tapping Rhythms': ['Steady marching beats', 'Clapping tempos', 'Syncopated sync-ups'],
      'Banjo the Giraffe': ['Banjo mascot smiles', 'Giraffe hoof taps', 'Banjo reactions'],
      'Singing & Vocals': ['Nursery song lyrics', 'Pitch matching games', 'Singing along out loud']
    }
  },
  energetic: {
    label: 'High Energy & Active',
    icon: Flame,
    color: '#ff8c00',
    aboutKey: 'energeticAbout',
    refKey: 'energeticRefinements',
    aboutLabel: 'In what ways are they energetic?',
    aboutOptions: ['Tapping & Drumming', 'Gross Motor Play', 'Loud Vocals', 'Fast tempos'],
    refLabel: 'Sub-refinements',
    refPresets: {
      'Tapping & Drumming': ['Table tapping', 'Clapping hands', 'Stomping feet'],
      'Gross Motor Play': ['Dancing in circles', 'Jumping up and down', 'Waving arms in tempo'],
      'Loud Vocals': ['Shouting count numbers', 'Joyful shouting', 'Loud counting along'],
      'Fast tempos': ['Speed tapping', 'Faster dancing']
    }
  },
  shy: {
    label: 'Shy & Observation-focused',
    icon: Heart,
    color: '#ba55d3',
    aboutKey: 'shyAbout',
    refKey: 'shyRefinements',
    aboutLabel: 'When do they show hesitation?',
    aboutOptions: ['New Environments', 'Singing Solo', 'Speaking on Microphone', 'Group Turn-taking'],
    refLabel: 'Sub-refinements',
    refPresets: {
      'New Environments': ['First class screen warming', 'Seeing new child grids'],
      'Singing Solo': ['Singing alone on mic', 'Vocal responses'],
      'Speaking on Microphone': ['Responding to direct questions', 'Telling name to instructor'],
      'Group Turn-taking': ['Waiting for visual spotlight', 'Showing drawings to others']
    }
  },
  sensitive: {
    label: 'Sensory Sensitive',
    icon: ShieldAlert,
    color: '#ef4444',
    aboutKey: 'sensitiveTo',
    refKey: 'sensitiveRefinements',
    aboutLabel: 'What are they sensitive to?',
    aboutOptions: ['Sudden Loud Sounds', 'Overwhelming Visuals', 'Fast Flashing Colors', 'High Frequencies'],
    refLabel: 'Sub-refinements',
    refPresets: {
      'Sudden Loud Sounds': ['Surprise cymbal crashes', 'Sudden sound effects'],
      'Overwhelming Visuals': ['Multiple moving overlays', 'Too many sticker additions'],
      'Fast Flashing Colors': ['Blinking webcam borders', 'Fast visual flashes'],
      'High Frequencies': ['Squeaky drum sounds', 'Sharp synthesizers']
    }
  },
  social: {
    label: 'Social & Collaborative',
    icon: Users,
    color: '#10b981',
    aboutKey: 'socialIn',
    refKey: 'socialRefinements',
    aboutLabel: 'How do they enjoy socializing?',
    aboutOptions: ['One-on-One Work', 'Group Activities', 'Collaborative Play', 'Imitating Peers'],
    refLabel: 'Sub-refinements',
    refPresets: {
      'One-on-One Work': ['Direct instructor conversation', 'Solo game challenges'],
      'Group Activities': ['Playing counts together', 'Mascot dance alongs'],
      'Collaborative Play': ['Sharing drawings on board', 'Duet percussion clicks'],
      'Imitating Peers': ['Copying classmates clapping', 'Following teacher body language']
    }
  },
  distracted: {
    label: 'Focus Challenges',
    icon: Focus,
    color: '#f59e0b',
    aboutKey: 'distractedBy',
    refKey: 'focusRefinements',
    aboutLabel: 'What distracts them? What helps focus?',
    aboutOptions: ['Background Noise', 'Visual Movement', 'Self-made Sounds', 'Room Toys'],
    refLabel: 'Focus Helpers (focusHelpers)',
    refPresets: {
      'Background Noise': ['Color highlights', 'Metronome cues', 'Direct prompts'],
      'Visual Movement': ['Steady audio ticks', 'Minimal overlays', 'One-action focus'],
      'Self-made Sounds': ['Rhythmic clap counters', 'Whiteboard draws', 'Mascot spotlight'],
      'Room Toys': ['Scheduled sticker rewards', 'Shorter segments', 'Interactive clicking']
    }
  },
  enjoys: {
    label: 'Enjoys Activities',
    icon: Award,
    color: '#06b6d4',
    aboutKey: 'enjoys',
    refKey: 'enjoysRefinements',
    aboutLabel: 'What parts do they enjoy the most?',
    aboutOptions: ['Sticker Rewards', 'Whiteboard Doodling', 'Interactive Tapping', 'Banjo Mascot Animations'],
    refLabel: 'Sub-refinements',
    refPresets: {
      'Sticker Rewards': ['Star placements', 'Crown overlays', 'Confetti blasts'],
      'Whiteboard Doodling': ['Drawing lines on media', 'Eraser tools', 'Color changes'],
      'Interactive Tapping': ['Spacebar count tapping', 'BPM wheel speed clicks'],
      'Banjo Mascot Animations': ['Watching Banjo dance', 'Hoof tap synchronized sounds']
    }
  },
  growth: {
    label: 'Growth Goals',
    icon: Sparkles,
    color: '#f43f5e',
    aboutKey: 'growthGoals',
    refKey: 'growthRefinements',
    aboutLabel: 'What are their developmental targets?',
    aboutOptions: ['Vocal Confidence', 'Rhythm Coordination', 'Focus & Attention', 'Social turn-taking'],
    refLabel: 'Sub-refinements',
    refPresets: {
      'Vocal Confidence': ['Singing on mic', 'Saying numbers out loud'],
      'Rhythm Coordination': ['Tapping exactly to tempo', 'Clapping 1-2-3-4 in time'],
      'Focus & Attention': ['Following counting wheels', 'Watching instructor screen'],
      'Social turn-taking': ['Waiting for guest spotlight', 'Cheering classmates']
    }
  }
};

export default function PersonalizedExplanationGenerator({ onClose }) {
  const { handleSendChatMessage } = useAppContext();

  // Basic Details States
  const [childName, setChildName] = useState('Danny');
  const [childAge, setChildAge] = useState('4 years old');
  const [parentEmail, setParentEmail] = useState('');
  const [traitsSelected, setTraitsSelected] = useState(['curious', 'energetic']);
  const [notes, setNotes] = useState('');

  // Structured Trait Values
  const [curiousAbout, setCuriousAbout] = useState(['Instrument Sounds']);
  const [curiousRefinements, setCuriousRefinements] = useState({ 'Instrument Sounds': ['Piano notes', 'Drum kicks'] });

  const [energeticAbout, setEnergeticAbout] = useState(['Tapping & Drumming']);
  const [energeticRefinements, setEnergeticRefinements] = useState({ 'Tapping & Drumming': ['Table tapping', 'Clapping hands'] });

  const [shyAbout, setShyAbout] = useState([]);
  const [shyRefinements, setShyRefinements] = useState({});

  const [sensitiveTo, setSensitiveTo] = useState([]);
  const [sensitiveRefinements, setSensitiveRefinements] = useState({});

  const [socialIn, setSocialIn] = useState([]);
  const [socialRefinements, setSocialRefinements] = useState({});

  const [distractedBy, setDistractedBy] = useState([]);
  const [focusHelpers, setFocusHelpers] = useState([]);
  const [focusRefinements, setFocusRefinements] = useState({});

  const [enjoys, setEnjoys] = useState([]);
  const [enjoysRefinements, setEnjoysRefinements] = useState({});

  const [growthGoals, setGrowthGoals] = useState([]);
  const [growthRefinements, setGrowthRefinements] = useState({});

  // Dynamic input fields for adding custom refinements
  const [customInput, setCustomInput] = useState({});

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [copyStatus, setCopyStatus] = useState(false);
  const [shareStatus, setShareStatus] = useState(false);

  // Map state hooks dynamically to make form modifications generalizable
  const getTraitState = (traitKey) => {
    switch (traitKey) {
      case 'curious':
        return {
          about: curiousAbout,
          setAbout: setCuriousAbout,
          refinements: curiousRefinements,
          setRefinements: setCuriousRefinements
        };
      case 'energetic':
        return {
          about: energeticAbout,
          setAbout: setEnergeticAbout,
          refinements: energeticRefinements,
          setRefinements: setEnergeticRefinements
        };
      case 'shy':
        return {
          about: shyAbout,
          setAbout: setShyAbout,
          refinements: shyRefinements,
          setRefinements: setShyRefinements
        };
      case 'sensitive':
        return {
          about: sensitiveTo,
          setAbout: setSensitiveTo,
          refinements: sensitiveRefinements,
          setRefinements: setSensitiveRefinements
        };
      case 'social':
        return {
          about: socialIn,
          setAbout: setSocialIn,
          refinements: socialRefinements,
          setRefinements: setSocialRefinements
        };
      case 'distracted':
        return {
          about: distractedBy,
          setAbout: setDistractedBy,
          refinements: focusRefinements,
          setRefinements: setFocusRefinements,
          extraAbout: focusHelpers,
          setExtraAbout: setFocusHelpers
        };
      case 'enjoys':
        return {
          about: enjoys,
          setAbout: setEnjoys,
          refinements: enjoysRefinements,
          setRefinements: setEnjoysRefinements
        };
      case 'growth':
        return {
          about: growthGoals,
          setAbout: setGrowthGoals,
          refinements: growthRefinements,
          setRefinements: setGrowthRefinements
        };
      default:
        return null;
    }
  };

  const handleToggleTrait = (traitKey) => {
    setTraitsSelected(prev => {
      if (prev.includes(traitKey)) {
        return prev.filter(t => t !== traitKey);
      } else {
        return [...prev, traitKey];
      }
    });
  };

  const handleToggleAbout = (traitKey, option) => {
    const { setAbout, refinements, setRefinements } = getTraitState(traitKey);
    setAbout(prev => {
      let next;
      if (prev.includes(option)) {
        next = prev.filter(o => o !== option);
        // Clean up refinements for this removed item
        const nextRefs = { ...refinements };
        delete nextRefs[option];
        setRefinements(nextRefs);
      } else {
        next = [...prev, option];
      }
      return next;
    });
  };

  const handleToggleRefinement = (traitKey, aboutItem, refinement) => {
    const { refinements, setRefinements } = getTraitState(traitKey);
    const itemRefs = refinements[aboutItem] || [];
    let nextRefs;
    if (itemRefs.includes(refinement)) {
      nextRefs = itemRefs.filter(r => r !== refinement);
    } else {
      nextRefs = [...itemRefs, refinement];
    }

    setRefinements(prev => ({
      ...prev,
      [aboutItem]: nextRefs
    }));
  };

  const handleAddCustomRefinement = (traitKey, aboutItem) => {
    const text = customInput[`${traitKey}-${aboutItem}`] || '';
    if (!text.trim()) return;

    const { refinements, setRefinements } = getTraitState(traitKey);
    const itemRefs = refinements[aboutItem] || [];
    if (!itemRefs.includes(text.trim())) {
      setRefinements(prev => ({
        ...prev,
        [aboutItem]: [...itemRefs, text.trim()]
      }));
    }

    setCustomInput(prev => ({
      ...prev,
      [`${traitKey}-${aboutItem}`]: ''
    }));
  };

  // Generate via Google Gemini AI Cloud Function
  const handleGenerate = async () => {
    if (!parentEmail.trim()) {
      alert("Please enter a parent's email address to receive the report.");
      return;
    }

    setIsGenerating(true);
    setLoadingStep("Preparing child profile...");
    setGeneratedResult(null);
    setShareStatus(false);

    const traitPayload = {
      childAge,
      traitsSelected,
      parentEmail,
      childName,
      curiousAbout,
      curiousRefinements,
      energeticAbout,
      energeticRefinements,
      shyAbout,
      shyRefinements,
      sensitiveTo,
      sensitiveRefinements,
      socialIn,
      socialRefinements,
      distractedBy,
      focusHelpers,
      focusRefinements,
      enjoys,
      enjoysRefinements,
      growthGoals,
      growthRefinements,
      notes: notes || ""
    };

    try {
      setLoadingStep("Connecting to secure server...");
      
      const endpoint = "https://us-central1-stagetrack-v4-260430-461-92681.cloudfunctions.net/personalizedExplanation";
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(traitPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server returned status ${response.status}`);
      }

      setLoadingStep("Formatting alignment report...");
      const data = await response.json();
      
      if (!data || !data.explanation) {
        throw new Error("No explanation returned from the server.");
      }

      setGeneratedResult({
        explanationMarkdown: data.explanation,
        summary: `✨ Personalized Music Fun explanation generated for ${childName}!`,
        recommendedActivities: ['Counting Wheel (Interactive Tapping)', 'Make Music Household Jam', 'Mascot Spotlights & Sticker Sharing']
      });
      setIsGenerating(false);

    } catch (err) {
      console.error(err);
      alert(err.message || "An error occurred during generation. Please verify your internet connection.");
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult.explanationMarkdown);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleShareToChat = () => {
    if (!generatedResult) return;
    handleSendChatMessage(generatedResult.summary);
    setShareStatus(true);
    setTimeout(() => setShareStatus(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="explanation-generator-container glass-panel animate-fade-in">
      {/* HEADER ROW */}
      <div className="generator-header">
        <button className="back-btn" onClick={onClose}>
          <ArrowLeft size={18} />
          <span>Back to Class</span>
        </button>
        <div className="header-title">
          <Sparkles className="sparkle-icon animate-pulse" size={22} />
          <h2>Music Fun Personalized Profile Builder</h2>
        </div>
        <div style={{ width: '120px' }}></div> {/* Spacer */}
      </div>

      <div className="generator-content-split">
        {/* LEFT COLUMN: FORM */}
        <div className="generator-form-pane">
          {/* STEP 1: BASIC INFO */}
          <div className="form-card-section">
            <h3 className="section-label">
              <span className="step-num">1</span>
              Child Information
            </h3>
            <div className="form-grid-2">
              <div className="input-group">
                <label>Child's First Name</label>
                <input 
                  type="text" 
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Enter name..."
                />
              </div>
              <div className="input-group">
                <label>Child's Age (childAge)</label>
                <select 
                  value={childAge} 
                  onChange={(e) => setChildAge(e.target.value)}
                >
                  <option value="1 year old">1 year old</option>
                  <option value="2 years old">2 years old</option>
                  <option value="3 years old">3 years old</option>
                  <option value="4 years old">4 years old</option>
                  <option value="5 years old">5 years old</option>
                </select>
              </div>
            </div>
            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Parent's Email Address</label>
              <input 
                type="email" 
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="E.g., parent@example.com (Required for SendGrid dispatch)"
                required
              />
            </div>
          </div>

          {/* STEP 2: SELECT CORE TRAITS */}
          <div className="form-card-section">
            <h3 className="section-label">
              <span className="step-num">2</span>
              Core Traits Selection (traitsSelected)
            </h3>
            <p className="section-sub">Select the core behaviors that define how this child engages with the class.</p>
            <div className="traits-select-grid">
              {Object.entries(TRAIT_DEFINITIONS).map(([key, def]) => {
                const isSelected = traitsSelected.includes(key);
                const Icon = def.icon;
                return (
                  <button 
                    key={key} 
                    className={`trait-select-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleToggleTrait(key)}
                    style={{ '--hover-color': def.color }}
                  >
                    <Icon size={20} className="trait-icon" />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: REFINEMENTS */}
          {traitsSelected.length > 0 && (
            <div className="form-card-section">
              <h3 className="section-label">
                <span className="step-num">3</span>
                Refinement Details & Sub-Items
              </h3>
              <div className="refinements-acc-container">
                {traitsSelected.map(traitKey => {
                  const def = TRAIT_DEFINITIONS[traitKey];
                  const { about, refinements } = getTraitState(traitKey);
                  return (
                    <div key={traitKey} className="refinement-section-box">
                      <div className="ref-box-header" style={{ borderLeftColor: def.color }}>
                        <span className="ref-box-title" style={{ color: def.color }}>{def.label} Details</span>
                      </div>
                      
                      {/* About Selection */}
                      <div className="ref-group">
                        <label>{def.aboutLabel}</label>
                        <div className="badge-chips-row">
                          {def.aboutOptions.map(option => {
                            const active = about.includes(option);
                            return (
                              <button
                                key={option}
                                className={`badge-chip ${active ? 'active' : ''}`}
                                onClick={() => handleToggleAbout(traitKey, option)}
                                style={{ '--badge-active-color': def.color }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nested Refinements */}
                      {about.map(aboutItem => {
                        const presets = def.refPresets[aboutItem] || [];
                        const itemRefs = refinements[aboutItem] || [];
                        return (
                          <div key={aboutItem} className="nested-refinement-box">
                            <span className="nested-header">{aboutItem} Sub-refinements</span>
                            <div className="presets-chips-row">
                              {presets.map(preset => {
                                const active = itemRefs.includes(preset);
                                return (
                                  <button
                                    key={preset}
                                    className={`preset-chip ${active ? 'active' : ''}`}
                                    onClick={() => handleToggleRefinement(traitKey, aboutItem, preset)}
                                  >
                                    {preset}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Write-in input */}
                            <div className="custom-input-inline">
                              <input 
                                type="text"
                                placeholder={`Add custom to ${aboutItem}...`}
                                value={customInput[`${traitKey}-${aboutItem}`] || ''}
                                onChange={(e) => setCustomInput(prev => ({
                                  ...prev,
                                  [`${traitKey}-${aboutItem}`]: e.target.value
                                }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomRefinement(traitKey, aboutItem);
                                  }
                                }}
                              />
                              <button onClick={() => handleAddCustomRefinement(traitKey, aboutItem)}>
                                <Plus size={16} />
                              </button>
                            </div>

                            {/* Show active items */}
                            {itemRefs.length > 0 && (
                              <div className="active-refs-list">
                                {itemRefs.map(ref => (
                                  <span key={ref} className="ref-tag">
                                    {ref}
                                    <button onClick={() => handleToggleRefinement(traitKey, aboutItem, ref)}>✕</button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: ADDITIONAL NOTES */}
          <div className="form-card-section">
            <h3 className="section-label">
              <span className="step-num">4</span>
              Additional Notes
            </h3>
            <div className="input-group">
              <label>Special Instructions / Custom Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Child loves the color blue, responds well to slow transitions..."
                rows={3}
              />
            </div>

            {/* Secure server processing indicator */}
            <div className="api-config-box" style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', margin: '16px 0 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
                <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Profile alignments are compiled securely on our servers via <strong>Gemini AI</strong>. No API keys are held in your browser.</span>
              </div>
            </div>

            {/* Submit button */}
            <button 
              className="generate-submit-btn" 
              onClick={handleGenerate} 
              disabled={isGenerating || childAge.trim() === ''}
            >
              <Sparkles size={18} />
              <span>Generate Personalized Explanation</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW */}
        <div className="generator-preview-pane">
          {isGenerating ? (
            <div className="preview-loading-state">
              <div className="loader-orbit">
                <div className="loader-planet primary"></div>
                <div className="loader-planet secondary"></div>
              </div>
              <p className="loading-step-text">{loadingStep}</p>
              <span className="loading-sub">Building pediatric curriculum map...</span>
            </div>
          ) : generatedResult ? (
            <div className="report-output-box animate-scale-up">
              {/* REPORT CONTROL HEADERS */}
              <div className="report-actions-row">
                <button className="action-pill-btn copy" onClick={handleCopyToClipboard}>
                  {copyStatus ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copyStatus ? 'Copied' : 'Copy'}</span>
                </button>
                <button className="action-pill-btn share" onClick={handleShareToChat}>
                  {shareStatus ? <Check size={16} /> : <Send size={16} />}
                  <span>{shareStatus ? 'Shared' : 'Share to Chat'}</span>
                </button>
                <button className="action-pill-btn print" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>Print</span>
                </button>
              </div>

              {/* RENDERED LETTER */}
              <div className="report-printable-letter">
                <div className="letter-decor-stripe"></div>
                <div className="letter-header">
                  <img src="/assets/Logo_modern.png" alt="Music Fun" className="letter-logo" />
                  <div className="letter-meta">
                    <span className="date-field">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span className="subject-field">Subject: Personalized Profile Alignment</span>
                  </div>
                </div>

                <div className="letter-body-markdown">
                  {generatedResult.explanationMarkdown.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={idx} className="md-h1">{line.replace('# ', '')}</h1>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={idx} className="md-lead"><strong>{line.replaceAll('**', '')}</strong></p>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={idx} className="md-h2">{line.replace('## ', '')}</h2>;
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={idx} className="md-h3">{line.replace('### ', '')}</h3>;
                    }
                    if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                      return <li key={idx} className="md-li">{line}</li>;
                    }
                    if (line.startsWith('*') && line.endsWith('*')) {
                      return <p key={idx} className="md-italic"><em>{line.replaceAll('*', '')}</em></p>;
                    }
                    if (line.trim() === '---') {
                      return <hr key={idx} className="md-hr" />;
                    }
                    if (line.trim() === '') {
                      return <div key={idx} style={{ height: '10px' }} />;
                    }
                    return <p key={idx} className="md-p">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="preview-empty-state">
              <div className="empty-state-card glass-panel">
                <FileText size={48} className="empty-icon animate-pulse" />
                <h4>No Report Generated</h4>
                <p>Select traits on the left questionnaire and click the "Generate" button. A detailed, warm program explanation will be crafted here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
