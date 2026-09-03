// src/components/PersonalizedExplanationGenerator.jsx
// MFLO Profile Builder — Identity 2-Col + Full-Width Delivery + 3x3 Trait Grid (Deep Indigo)

import { useState } from 'react';
import { 
  Sparkles, CheckCircle2, RotateCcw, Copy, Check
} from 'lucide-react';
import './PersonalizedExplanationGenerator.css';

// 3-Column Trait Grid Schema with Right-Side Info Texts
const TRAIT_SECTIONS = [
  { 
    id: 'sound', 
    title: 'Sound', 
    chips: ['Brave', 'Sensitive', 'Rhythm'], 
    infoText: 'How your child responds to music and sound — whether bold, gentle, or rhythm‑driven.' 
  },
  { 
    id: 'energy', 
    title: 'Energy', 
    chips: ['High', 'Balanced', 'Calm'], 
    infoText: 'Your child’s natural activity level and how they express movement through music.' 
  },
  { 
    id: 'social', 
    title: 'Social', 
    chips: ['Parallel', '1‑on‑1', 'Group'], 
    infoText: 'Preferred interaction style — solo, small group, or parallel play alongside others.' 
  },
  { 
    id: 'movement', 
    title: 'Movement', 
    chips: ['Free', 'Precise', 'Still'], 
    infoText: 'How your child uses their body in musical play — free, precise, or still.' 
  },
  { 
    id: 'transitions', 
    title: 'Transitions', 
    chips: ['Flow', 'Routine', 'Gradual'], 
    infoText: 'How easily your child moves between activities or songs — flowing, routine, or gradual.' 
  },
  { 
    id: 'attention', 
    title: 'Attention', 
    chips: ['Rapid', 'Deep', 'Flex'], 
    infoText: 'Your child’s focus style — quick bursts, deep engagement, or flexible shifting.' 
  },
  { 
    id: 'emotional', 
    title: 'Emotional', 
    chips: ['Big Feel', 'Calm', 'Warm Slow'], 
    infoText: 'How your child expresses feelings through music — big emotions, calm moods, or gentle warmth.' 
  },
  { 
    id: 'favorites', 
    title: 'Favorites', 
    chips: ['Bluey', 'Daniel', 'Elmo', 'Mickey', 'Cocomelon', 'Sesame'], 
    infoText: 'Shows what characters or shows your child connects with — helps personalize song choices.' 
  },
  { 
    id: 'notes', 
    title: 'Notes', 
    placeholder: 'Any special considerations...', 
    infoText: 'Space for any special considerations, sensitivities, or unique preferences.' 
  }
];

export default function PersonalizedExplanationGenerator({ onClose }) {
  // Child & Parent Contact Info (Empty / no default selections)
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState(true);
  const [deliverySMS, setDeliverySMS] = useState(true);

  // Selected State for all trait sections (Default to NO button selections)
  const [selections, setSelections] = useState({
    sound: null,
    energy: null,
    social: null,
    movement: null,
    transitions: null,
    attention: null,
    emotional: null,
    favorites: null,
    notes: ''
  });

  // UI States
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [generatedProfile, setGeneratedProfile] = useState(null);
  const [copyStatus, setCopyStatus] = useState(false);

  // Toggle or select chip (allows unselecting)
  const handleSelectChip = (sectionId, chipValue) => {
    setSelections(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === chipValue ? null : chipValue
    }));
  };

  // Generate Profile Handler
  const handleGenerate = async () => {
    if (!childName.trim()) {
      alert("Please enter child's name.");
      return;
    }

    if (deliveryEmail && !parentEmail.trim()) {
      alert("Please enter parent email address to receive the profile.");
      return;
    }

    if (deliverySMS && !parentPhone.trim()) {
      alert("Please enter mobile phone number for text delivery.");
      return;
    }

    if (!deliveryEmail && !deliverySMS) {
      alert("Please select at least one delivery method (Email or SMS Text).");
      return;
    }

    setIsGenerating(true);
    setLoadingStep("Connecting to Gemini AI… 🎵");

    const effectiveShow = selections.favorites || "music activities";
    const STEPS = [
      "Analyzing developmental traits…",
      `Weaving in ${effectiveShow} milestones…`,
      "Creating Bluey-inspired warm teacher profile…",
      "Preparing delivery confirmation… 📬"
    ];

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1);
      setLoadingStep(STEPS[stepIdx]);
    }, 1700);

    const effectiveName = childName.trim() || 'Your Child';
    const effectiveAge = childAge || 'toddler';
    const effectiveParent = parentName.trim() || 'Parent';

    const prompt = `Create a warm, specific musical profile for ${effectiveAge}-year-old ${effectiveName} with these developmental traits:

Sound Sensitivity: ${selections.sound || 'Observant and responsive to rhythms'}
Movement Style: ${selections.movement || 'Natural expressive motion'}
Social Engagement: ${selections.social || 'Joyful learner'}
Attention & Pacing: ${selections.attention || 'Engaged with melodic cues'}
Emotional Expression: ${selections.emotional || 'Warm expressive connection'}
Transitions & Routines: ${selections.transitions || 'Guided musical flow'}
Energy Level: ${selections.energy || 'Playful and balanced'}

Favorite Show/Character: ${effectiveShow}

Write a 220-270 word personalized musical profile that:
1. Opens warmly, celebrating ${effectiveName} as a person AND young musician
2. Weaves in all developmental traits naturally—show HOW each trait shows up in music learning
3. Reference their love of ${effectiveShow} and explain how teachers can use this to engage them
4. Explains what a typical lesson might look like for ${effectiveName}
5. Includes 2-3 specific teaching suggestions tied to their favorite show and personality
6. Ends with encouragement about their unique musical journey

Write for music teachers and parents. Be specific, warm, observational, and actionable—like Bluey's style.`;

    const payload = {
      childName: effectiveName,
      childAge: childAge ? `${childAge} years old` : 'Toddler',
      parentName: effectiveParent,
      parentEmail: parentEmail.trim(),
      parentPhone: parentPhone.trim(),
      sendEmail: deliveryEmail,
      sendSMS: deliverySMS,
      action: 'generate_and_deliver',
      prompt: prompt,
      traits: selections,
      favorites: { shows: selections.favorites || '' },
      notes: selections.notes || ""
    };

    try {
      const endpoint = "https://us-central1-stagetrack-v4-260430-461-92681.cloudfunctions.net/personalizedExplanation";
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      const profileText = data.explanation || data.text || (data.candidates && data.candidates[0]?.content?.parts[0]?.text);

      if (!profileText) {
        throw new Error("No profile text generated.");
      }

      setGeneratedProfile({
        name: effectiveName,
        age: childAge || 'Toddler',
        parentName: effectiveParent,
        email: deliveryEmail ? parentEmail.trim() : null,
        phone: deliverySMS ? parentPhone.trim() : null,
        text: profileText,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      });

      setIsGenerating(false);

    } catch (err) {
      clearInterval(stepInterval);
      console.error(err);
      alert(err.message || "An error occurred generating the profile. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedProfile) return;
    navigator.clipboard.writeText(generatedProfile.text);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  return (
    <div className="mf-profile-builder-page">
      {/* HEADER WITH CHARACTERS SURROUNDING SUBTITLE */}
      <header className="mf-builder-header">
        {onClose && (
          <button className="mf-back-btn" onClick={onClose}>
            <span>Back</span>
          </button>
        )}
        {/* HEADER WITH CHARACTERS FLANKING VERTICALLY CENTERED TITLE & SUBTITLE */}
        <div className="mf-header-characters-banner">
          {/* Left Character Mascot Group: png-1, 2, 3 (where 3 is closest to text) */}
          <div className="mf-char-group mf-char-left">
            <img src="/assets/header_characters/char1_bear.png" alt="Bear (png-1)" className="mf-char-banner-img img-1" />
            <img src="/assets/header_characters/char2_giraffe.png" alt="Giraffe (png-2)" className="mf-char-banner-img img-2 buffered" />
            <img src="/assets/header_characters/char3_bird.png" alt="Bird (png-3)" className="mf-char-banner-img img-3" />
          </div>

          {/* Centered Title & Subtitle Stack */}
          <div className="mf-title-group">
            <h1 className="mf-main-heading">
              About your Little One
            </h1>
            <p className="mf-sub-heading">
              Create a focused response why Music Fun is right for your child
            </p>
          </div>

          {/* Right Character Mascot Group: png-4, 5, 6 (where 4 is closest to text) */}
          <div className="mf-char-group mf-char-right">
            <img src="/assets/header_characters/char4_elephant.png" alt="Elephant (png-4)" className="mf-char-banner-img img-4" />
            <img src="/assets/header_characters/char5_fox.png" alt="Fox (png-5)" className="mf-char-banner-img img-5 buffered" />
            <img src="/assets/header_characters/char6_rabbit.png" alt="Rabbit (png-6)" className="mf-char-banner-img img-6" />
          </div>
        </div>
      </header>

      {/* RESULTS VIEW */}
      {generatedProfile ? (
        <div className="mf-results-overlay animate-fade-in">
          <div className="mf-results-card">
            <div className="results-header-banner">
              <CheckCircle2 size={44} className="success-icon" />
              <h2>{generatedProfile.name}'s Musical Profile</h2>
              <p className="results-meta">
                Parent: {generatedProfile.parentName} • Age: {generatedProfile.age} • Dispatched via: {generatedProfile.email ? 'Email' : ''} {generatedProfile.email && generatedProfile.phone ? '& ' : ''} {generatedProfile.phone ? 'SMS' : ''}
              </p>
            </div>

            <div className="results-body-text">
              {typeof generatedProfile.text === 'string'
                ? generatedProfile.text.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))
                : <p>{String(generatedProfile.text || '')}</p>
              }
            </div>

            <div className="results-actions-row">
              <button className="mf-action-btn copy" onClick={handleCopy}>
                {copyStatus ? <Check size={16} /> : <Copy size={16} />}
                <span>{copyStatus ? 'Copied!' : 'Copy Profile'}</span>
              </button>
              <button className="mf-action-btn reset" onClick={() => setGeneratedProfile(null)}>
                <RotateCcw size={16} />
                <span>Create Another</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mf-main-content-scroll">
          {/* TOP BAND: IDENTITY ROW (2 COLUMNS) */}
          <div className="mf-identity-grid">
            {/* Column 1: Child Info */}
            <div className="mf-card mf-identity-card">
              <h2 className="mf-card-title">Child Info</h2>
              <div className="mf-card-fields-row">
                <div className="mf-field-group flex-1">
                  <label className="mf-label">1st Name</label>
                  <input 
                    type="text" 
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="e.g. Emma"
                    className="mf-input"
                  />
                </div>
                <div className="mf-field-group">
                  <label className="mf-label">Age</label>
                  <div className="mf-age-pill-group">
                    {['2', '3', '4'].map(age => (
                      <button 
                        key={age}
                        type="button"
                        className={`mf-age-pill ${childAge === age ? 'active' : ''}`}
                        onClick={() => setChildAge(prev => prev === age ? '' : age)}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Parent Contact */}
            <div className="mf-card mf-identity-card">
              <h2 className="mf-card-title">Parent Contact</h2>
              <div className="mf-card-fields-row">
                <div className="mf-field-group flex-1">
                  <label className="mf-label">Parent 1st Name</label>
                  <input 
                    type="text" 
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="mf-input"
                  />
                </div>
                <div className="mf-field-group flex-1">
                  <label className="mf-label">Email</label>
                  <input 
                    type="email" 
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@email.com"
                    className="mf-input"
                  />
                </div>
                <div className="mf-field-group flex-1">
                  <label className="mf-label">Mobile (SMS)</label>
                  <input 
                    type="tel" 
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="mf-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FULL-WIDTH DELIVERY OPTIONS & ACTION BAND */}
          <div className="mf-delivery-fullwidth-card">
            <div className="mf-delivery-left">
              <h2 className="mf-card-title inline-title">Delivery Options</h2>
              <div className="mf-delivery-checkboxes">
                <label className="mf-checkbox-label">
                  <input 
                    type="checkbox"
                    checked={deliveryEmail}
                    onChange={(e) => setDeliveryEmail(e.target.checked)}
                  />
                  <span>Email Confirmation</span>
                </label>
                <label className="mf-checkbox-label">
                  <input 
                    type="checkbox"
                    checked={deliverySMS}
                    onChange={(e) => setDeliverySMS(e.target.checked)}
                  />
                  <span>SMS Text Summary</span>
                </label>
              </div>
            </div>

            <div className="mf-delivery-right">
              <button 
                type="button"
                className="mf-generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <span>{isGenerating ? loadingStep : "Generate Profile"}</span>
              </button>
            </div>
          </div>

          {/* MIDDLE BAND: 3-COLUMN TRAIT GRID */}
          <div className="mf-trait-grid">
            {TRAIT_SECTIONS.map((sec) => {
              const isNotes = sec.id === 'notes';

              return (
                <div key={sec.id} className={`mf-card mf-trait-card ${isNotes ? 'mf-notes-card' : ''}`}>
                  <h2 className="mf-section-title">{sec.title}</h2>

                  <div className="mf-trait-body-layout">
                    {/* Left: Options / Chips / Textarea */}
                    <div className="mf-trait-options">
                      {isNotes ? (
                        <textarea 
                          value={selections.notes}
                          onChange={(e) => setSelections({ ...selections, notes: e.target.value })}
                          placeholder={sec.placeholder}
                          className="mf-notes-textarea"
                          rows={2}
                        />
                      ) : (
                        <div className={`mf-chip-grid ${sec.id === 'favorites' ? 'mf-fav-grid' : ''}`}>
                          {sec.chips.map((chip) => {
                            const isSelected = selections[sec.id] === chip;
                            return (
                              <button
                                key={chip}
                                type="button"
                                className={`mf-chip ${isSelected ? 'mf-chip-selected' : ''}`}
                                onClick={() => handleSelectChip(sec.id, chip)}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right: Trait Info Text */}
                    <div className="mf-trait-info">
                      <p>{sec.infoText}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {isGenerating && (
        <div className="mf-loading-overlay">
          <div className="mf-loading-spinner"></div>
          <p className="loading-step-text">{loadingStep}</p>
          <span className="loading-sub">Powered securely by Google Gemini AI</span>
        </div>
      )}
    </div>
  );
}


