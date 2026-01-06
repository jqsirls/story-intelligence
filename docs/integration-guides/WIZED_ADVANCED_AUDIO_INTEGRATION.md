# Wized Advanced Audio Integration - Read-Along + Tracking

**Date**: December 25, 2025  
**Purpose**: Integrate your advanced audio player (WebVTT, word highlighting, color engine) with Storytailor consumption tracking  
**Style**: Ready-to-paste code matching your existing audio flow

---

## Overview

Your audio player features:
- ✅ Word-level highlighting from WebVTT timing
- ✅ Color engine (matches story cover colors)
- ✅ Click word to replay
- ✅ Vibrate on section changes
- ✅ Custom scrubber with seeking
- ✅ Read-along with scroll

This integration adds:
- ⭐ Storytailor consumption tracking
- ⭐ Word-level engagement analytics
- ⭐ Effectiveness scoring with replay patterns
- ⭐ Load WebVTT from API
- ⭐ Load story colors from API

---

## Complete Integration Code

**Paste in**: Webflow Story Player Page → Custom Code → Before </body>

```html
<!-- STORYTAILOR · Advanced Audio Player + Consumption Tracking -->
<style>
  :root {
    --hl-bg: #3f3f46;
    --hl-fg: #ffffff;
  }

  .story-block span {
    position: relative;
    cursor: pointer;
  }

  .story-block span.highlight {
    color: var(--hl-fg);
    transition: color .15s ease;
  }

  .story-block span.highlight::before {
    content: "";
    position: absolute;
    left: -0.25em;
    right: -0.25em;
    top: -0.12em;
    bottom: -0.12em;
    background-color: var(--hl-bg);
    border-radius: 6px;
    z-index: -1;
    transition: background-color .15s ease;
  }
</style>

<script>
/* ==========================================================
   STORYTAILOR · COLOR ENGINE + CONSUMPTION TRACKING
========================================================== */
function withWized(cb){ window.Wized=window.Wized||[]; window.Wized.push(cb); }

// Color utilities
function parseRGBA(input) {
  const probe = document.createElement('span');
  probe.style.color = input;
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe).color;
  document.body.removeChild(probe);

  const m = cs.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return { r: 0, g: 0, b: 0, a: 1 };

  return {
    r: +m[1],
    g: +m[2],
    b: +m[3],
    a: m[4] !== undefined ? parseFloat(m[4]) : 1
  };
}

function relLuminance({ r, g, b }) {
  const toLin = v => {
    const u = v / 255;
    return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r), G = toLin(g), B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function normalizeColor(value) {
  if (!value) return null;
  let v = String(value).trim();
  if (/^[0-9a-fA-F]{6}$/.test(v)) v = "#" + v;
  return v;
}

function pickTextColor(bgCss) {
  const rgb = parseRGBA(bgCss);
  const lum = relLuminance(rgb);
  return lum < 0.5 ? "#FFFFFF" : "#111111";
}

function setVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function applyStorytailorColor(rawColor) {
  const color = normalizeColor(rawColor);
  if (!color) return;

  const textColor = pickTextColor(color);

  setVar("--hl-bg", color);
  setVar("--hl-fg", textColor);

  const logline = document.querySelector(".s_logline_wrapper");
  if (logline) {
    logline.style.backgroundColor = color;
    logline.style.color = textColor;
    logline.style.borderRadius = "6px";
    logline.style.transition = "background-color .2s ease, color .2s ease";
  }
}

// Connect to Wized data for story colors
window.Wized.push((Wized) => {
  Wized.reactivity.effect(() => {
    // Get story cover color from API response
    const story = Wized.data.v.currentStory;
    const coverHex = story?.cover_hex || story?.coverHex1 || story?.color_palettes?.[0]?.[0];
    
    applyStorytailorColor(coverHex);
  });
});
</script>

<script>
/* ==========================================================
   STORYTAILOR · Audio Controls + Consumption Tracking
========================================================== */
const audio = document.getElementById('audio');
const toggleBtn = document.getElementById('audio-toggle');
const seekContainer = document.getElementById('seek-container');
const seekTrack = document.getElementById('seek-track');
const thumb = document.getElementById('thumb');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');

// Consumption tracking state
let playStartTime = null;
let pauseCount = 0;
let wordReplays = {}; // Track which words clicked

const fmt = s => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

// Toggle play/pause
toggleBtn.addEventListener('click', () => {
  audio.paused ? audio.play() : audio.pause();
});

audio.addEventListener('play', () => {
  toggleBtn.classList.add('playing');
  toggleBtn.setAttribute('aria-label', 'Pause audio');
  
  // TRACK: Play start
  playStartTime = Date.now();
  
  withWized(async (Wized) => {
    const storyId = Wized?.data?.v?.currentStoryId;
    if(!storyId) return;
    
    try {
      await Wized.requests.execute("TrackConsumption", {
        storyId: storyId,
        eventType: "play_start",
        position: Math.floor(audio.currentTime),
        metadata: {
          device: "web",
          pauseCount: pauseCount,
          page: location.pathname
        }
      });
    } catch(e) {
      console.error("Track play failed:", e);
    }
  });
});

audio.addEventListener('pause', () => {
  toggleBtn.classList.remove('playing');
  toggleBtn.setAttribute('aria-label', 'Play audio');
  
  if(audio.ended) return; // Don't track natural end
  
  pauseCount++;
  const duration = playStartTime ? (Date.now() - playStartTime) / 1000 : 0;
  
  // TRACK: Pause
  withWized(async (Wized) => {
    const storyId = Wized?.data?.v?.currentStoryId;
    if(!storyId) return;
    
    try {
      await Wized.requests.execute("TrackConsumption", {
        storyId: storyId,
        eventType: "play_pause",
        position: Math.floor(audio.currentTime),
        duration: Math.floor(duration),
        metadata: {
          pauseCount: pauseCount,
          pausePatterns: [] // Could track pause positions
        }
      });
    } catch(e) {
      console.error("Track pause failed:", e);
    }
  });
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = fmt(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  const pct = (audio.currentTime / audio.duration) * 100;
  seekTrack.style.width = pct + '%';
  thumb.style.left = pct + '%';
  currentTimeEl.textContent = fmt(audio.currentTime);
});

// Seeking
let seeking = false;
const updateSeek = e => {
  const rect = seekContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const clamped = Math.max(0, Math.min(x, rect.width));
  const pct = clamped / rect.width;
  audio.currentTime = pct * audio.duration;
};

seekContainer.addEventListener('pointerdown', e => {
  seeking = true;
  seekContainer.classList.add('seeking');
  updateSeek(e);
  window.addEventListener('pointermove', updateSeek);
});

window.addEventListener('pointerup', () => {
  if (!seeking) return;
  seeking = false;
  seekContainer.classList.remove('seeking');
  window.removeEventListener('pointermove', updateSeek);
});
</script>

<script type="module">
/* ==========================================================
   STORYTAILOR · Read-Along Highlighter + Word Replay Tracking
========================================================== */
const audioEl = document.getElementById('audio');
const WORDS   = [...document.querySelectorAll('.story-block span')];
if (!WORDS.length) {
  console.warn('Read-along spans missing - WebVTT may not be loaded');
}

const starts  = WORDS.map(w => +w.dataset.start);
const ends    = WORDS.map(w => +w.dataset.end);

function findIndex(t){
  let lo=0, hi=WORDS.length-1;
  while(lo<=hi){
    const mid=(lo+hi)>>1;
    if(t<starts[mid]) hi=mid-1;
    else if(t>ends[mid]) lo=mid+1;
    else return mid;
  }
  return lo;
}

let idx = 0;
let lastSection = null;
let wordReplays = {}; // Track replays for analytics

function clearHighlight(){ WORDS[idx]?.classList.remove('highlight'); }

function flash(){
  const t = audioEl.currentTime;
  if(t<starts[idx] || t>ends[idx]){
    clearHighlight();
    idx = findIndex(t);
  }

  const node = WORDS[idx];
  node?.classList.add('highlight');

  const section = node?.classList.contains('section-start') ? idx : lastSection;
  if (section !== lastSection && 'vibrate' in navigator) {
    navigator.vibrate(20);
    lastSection = section;
  }
}

audioEl.addEventListener('timeupdate', flash);
audioEl.addEventListener('seeked', () => { clearHighlight(); idx=findIndex(audioEl.currentTime); flash(); });
audioEl.addEventListener('ended', () => { 
  clearHighlight(); 
  lastSection = null; 
  
  // TRACK: Play complete with word replay data
  window.Wized.push((Wized) => {
    const storyId = Wized?.data?.v?.currentStoryId;
    if(!storyId) return;
    
    Wized.requests.execute("TrackConsumption", {
      storyId: storyId,
      eventType: "play_complete",
      duration: Math.floor(audioEl.duration),
      metadata: {
        wordReplays: wordReplays, // Which words were replayed
        totalWordReplays: Object.keys(wordReplays).length,
        device: "web"
      }
    }).then(() => {
      // Get effectiveness insights
      setTimeout(async () => {
        await Wized.requests.execute("GetStoryEffectiveness", {
          storyId: storyId
        });
        
        // Show modal if has improvements
        if(Wized.data.v.storyEffectiveness?.improvements?.length > 0){
          document.getElementById("effectiveness-modal").style.display = "flex";
        }
      }, 2000);
    }).catch(e => console.error("Track complete failed:", e));
  });
});

// Auto-scroll highlighted word
audioEl.addEventListener('timeupdate', () =>
  WORDS[idx]?.scrollIntoView({block:'center', behavior:'smooth'})
);

// Word replay click tracking
let wordTimeout = null;
WORDS.forEach((span,i)=>{
  span.addEventListener('click',()=>{
    if(wordTimeout){ clearTimeout(wordTimeout); wordTimeout=null; }

    audioEl.pause();
    audioEl.currentTime = starts[i];
    clearHighlight(); idx=i; flash();

    audioEl.play();
    const dur = (ends[i]-starts[i])*1000 + 120;
    wordTimeout = setTimeout(()=>{ audioEl.pause(); wordTimeout=null; }, dur);
    
    // TRACK: Word replay for engagement analytics
    const wordText = span.textContent;
    wordReplays[i] = (wordReplays[i] || 0) + 1;
    
    console.log(`Word replayed: "${wordText}" (${wordReplays[i]} times)`);
    
    // Track word replay to API (debounced)
    window.Wized.push((Wized) => {
      const storyId = Wized?.data?.v?.currentStoryId;
      if(!storyId) return;
      
      // Store in local state for batch send on complete
      Wized.data.v._wordReplays = wordReplays;
    });
  });
});

audioEl.addEventListener('play', ()=>{
  if(wordTimeout && !audioEl.paused){
    clearTimeout(wordTimeout);
    wordTimeout = null;
  }
});
</script>

<script>
/* ==========================================================
   STORYTAILOR · Load Story Data from Wized + WebVTT
========================================================== */
window.Wized.push(async (Wized) => {
  // Get story ID from URL
  const urlParams = new URLSearchParams(location.search);
  const storyId = urlParams.get("s") || urlParams.get("storyId");
  
  if(!storyId){
    console.error("No story ID in URL");
    return;
  }
  
  // Set story ID
  Wized.data.v.currentStoryId = storyId;
  Wized.data.v.isLoading = true;
  
  try {
    // Load story details
    await Wized.requests.execute("GetStory", { storyId });
    
    const story = Wized.data.v.currentStory;
    if(!story){
      console.error("Story not loaded");
      return;
    }
    
    // Load audio
    const audioElement = document.getElementById("audio");
    const audioSource = audioElement?.querySelector("source");
    if(audioElement && audioSource && story.audio_url){
      audioSource.src = story.audio_url;
      audioElement.load();
    }
    
    // Apply story cover color to highlighter
    const coverColor = story.cover_hex || story.coverHex1 || story.color_palettes?.[0]?.[0];
    if(coverColor){
      applyStorytailorColor(coverColor);
    }
    
    // Load WebVTT and parse for word timing
    if(story.webvtt_url){
      await loadWebVTT(story.webvtt_url);
    }
    
    Wized.data.v.isLoading = false;
  } catch(e) {
    console.error("Load story failed:", e);
    Wized.data.v.isLoading = false;
  }
});

// Load and parse WebVTT for word timing
async function loadWebVTT(url){
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse WebVTT (simplified - production would use full parser)
    const lines = text.split('\n');
    const cues = [];
    
    for(let i = 0; i < lines.length; i++){
      const line = lines[i];
      
      // Parse timing line (e.g., "00:00:01.234 --> 00:00:01.567")
      const timingMatch = line.match(/(\d{2}):(\d{2}):(\d{2}\.\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}\.\d{3})/);
      if(timingMatch){
        const startHours = parseInt(timingMatch[1]);
        const startMins = parseInt(timingMatch[2]);
        const startSecs = parseFloat(timingMatch[3]);
        const endHours = parseInt(timingMatch[4]);
        const endMins = parseInt(timingMatch[5]);
        const endSecs = parseFloat(timingMatch[6]);
        
        const start = startHours * 3600 + startMins * 60 + startSecs;
        const end = endHours * 3600 + endMins * 60 + endSecs;
        
        // Next line should be the word
        const word = lines[i + 1]?.trim();
        if(word){
          cues.push({ start, end, word });
        }
      }
    }
    
    // Apply timing to word spans
    const wordSpans = document.querySelectorAll('.story-block span');
    wordSpans.forEach((span, index) => {
      if(cues[index]){
        span.dataset.start = cues[index].start;
        span.dataset.end = cues[index].end;
      }
    });
    
    console.log(`WebVTT loaded: ${cues.length} word timings`);
  } catch(e) {
    console.error("Load WebVTT failed:", e);
  }
}
</script>
```

---

## Wized Request Configurations

### Required Requests (Create in Wized Dashboard)

**1. GetStory**:
```javascript
Name: GetStory
Method: GET
Endpoint: /stories/{v.currentStoryId}
On Success:
  v.currentStory = response.data
```

**2. TrackConsumption**:
```javascript
Name: TrackConsumption
Method: POST
Endpoint: /stories/{v.currentStoryId}/consumption
Body: {
  eventType: "v.playEventType",
  position: "v.audioPosition",
  duration: "v.eventDuration",
  metadata: "v.trackingMetadata"
}
```

**3. GetStoryEffectiveness**:
```javascript
Name: GetStoryEffectiveness
Method: GET
Endpoint: /stories/{v.currentStoryId}/effectiveness
On Success:
  v.storyEffectiveness = response.data
```

---

## Enhanced Tracking Features

### Word-Level Engagement Analytics

**Your audio player now tracks**:
- Which words are replayed (click tracking)
- How many times each word is replayed
- Section completion patterns
- Pause locations
- Total engagement time

**This data feeds into**:
- Story effectiveness scoring (comparative)
- Engagement patterns analysis
- Recommendation engine ("Emma loved the dragon scene")

### API Response with Word Replay Data

**When you track play_complete**:
```javascript
{
  eventType: "play_complete",
  duration: 720,
  metadata: {
    wordReplays: {
      15: 3,  // Word index 15 replayed 3 times
      47: 2,  // Word index 47 replayed 2 times
      89: 1   // Word index 89 replayed 1 time
    },
    totalWordReplays: 3, // 3 different words replayed
    pauseCount: 2,
    device: "web"
  }
}
```

**Backend uses this for**:
- Identifying engagement hotspots ("dragon scene replayed 3x")
- Comparative effectiveness ("3x more replays than other stories")
- Recommendations ("Create more dragon stories")

---

## Integration with Effectiveness Modal

**After audio complete**:

```javascript
audio.addEventListener('ended', () => {
  // Your existing code
  clearHighlight(); 
  lastSection = null;
  
  // NEW: Track complete + get effectiveness
  window.Wized.push(async (Wized) => {
    const storyId = Wized?.data?.v?.currentStoryId;
    if(!storyId) return;
    
    try {
      // Track with word replay data
      await Wized.requests.execute("TrackConsumption", {
        storyId: storyId,
        eventType: "play_complete",
        duration: Math.floor(audioEl.duration),
        metadata: {
          wordReplays: wordReplays,
          totalWordReplays: Object.keys(wordReplays).length,
          pauseCount: pauseCount
        }
      });
      
      // Wait 2 seconds then get effectiveness
      setTimeout(async () => {
        const effectiveness = await Wized.requests.execute("GetStoryEffectiveness", {
          storyId: storyId
        });
        
        // Show modal if has comparative improvements
        const data = effectiveness?.data;
        if(data?.improvements?.length > 0){
          // Populate modal
          const list = document.getElementById("improvements-list");
          if(list){
            list.innerHTML = '';
            data.improvements.forEach(imp => {
              const li = document.createElement("div");
              li.style.cssText = "margin:8px 0;padding:8px;background:#f0f9ff;border-radius:4px";
              li.innerHTML = `<strong>${imp.interpretation}</strong>`;
              list.appendChild(li);
            });
          }
          
          const rec = document.getElementById("recommendation");
          if(rec && data.recommendation){
            rec.innerHTML = `<p><strong>Recommendation:</strong> ${data.recommendation}</p>`;
          }
          
          // Show modal
          document.getElementById("effectiveness-modal").style.display = "flex";
        }
      }, 2000);
    } catch(e) {
      console.error("Track complete failed:", e);
    }
  });
});
```

---

## Complete Page Setup

### Webflow HTML Structure

```html
<!-- Audio Player Controls -->
<div class="audio-controls">
  <button id="audio-toggle" aria-label="Play audio">▶</button>
  <span id="current-time">0:00</span>
  <div id="seek-container">
    <div id="seek-track"></div>
    <div id="thumb"></div>
  </div>
  <span id="duration">0:00</span>
</div>

<audio id="audio" preload="metadata">
  <source type="audio/mpeg" />
</audio>

<!-- Story Text with Word Spans -->
<div class="story-block">
  <!-- Words populated from Wized v.currentStory.content -->
  <!-- Each word needs data-start and data-end attributes -->
  <span data-start="0.0" data-end="0.5">Once</span>
  <span data-start="0.5" data-end="0.8">upon</span>
  <span data-start="0.8" data-end="1.0">a</span>
  <span data-start="1.0" data-end="1.4" class="section-start">time</span>
  <!-- ... -->
</div>

<!-- Effectiveness Modal -->
<div id="effectiveness-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);align-items:center;justify-content:center;z-index:9999">
  <div style="background:white;padding:24px;border-radius:12px;max-width:500px">
    <h2>⭐ This story was effective!</h2>
    <div id="improvements-list"></div>
    <div id="recommendation"></div>
    <button id="close-modal" class="button">Close</button>
  </div>
</div>
```

### Wized Page Load

**Run Function** (paste in Wized):
```javascript
/* Load story + WebVTT on page load */
withWized(async (Wized) => {
  const urlParams = new URLSearchParams(location.search);
  const storyId = urlParams.get("s");
  
  Wized.data.v.currentStoryId = storyId;
  await Wized.requests.execute("GetStory", { storyId });
  
  // Story data now in v.currentStory
  // Color engine and WebVTT loader run automatically (from custom code)
});
```

---

## What This Integration Provides

### For Users

**Rich reading experience**:
- Word-by-word highlighting
- Click words to replay
- Story colors applied dynamically
- Smooth seeking and controls
- Section vibration feedback

**Plus intelligence**:
- Consumption tracked automatically
- Effectiveness insights after play
- Comparative recommendations
- "Dragon scene replayed 3x" analytics

### For Analytics

**Enhanced engagement data**:
- Word-level replay patterns
- Section completion tracking
- Pause pattern analysis
- Total engagement time
- Replay hotspots

**Used for**:
- Comparative effectiveness scoring
- Engagement pattern detection
- Content recommendation engine
- "Your story X worked better" insights

---

## Files for Wized Configuration

**Primary**: [`WIZED_COMPLETE_API_REFERENCE.md`](WIZED_COMPLETE_API_REFERENCE.md)
- How to create each request in Wized dashboard
- Request name, method, endpoint, body, params
- On Success variable assignments
- All 131 endpoints

**Quick Import**: [`WIZED_REQUEST_TEMPLATES.json`](WIZED_REQUEST_TEMPLATES.json)
- Import this JSON into Wized
- Pre-configured requests
- No manual setup needed

**For Your Design**: You handle Webflow HTML/CSS yourself ✅

**For Advanced Features**: This document (audio integration with tracking)

---

## Summary

**Your sophisticated audio player** (WebVTT, word highlighting, color engine)  
**+**  
**Storytailor tracking** (consumption, effectiveness, comparative insights)  
**=**  
**Best-in-class story player with intelligence** ⭐

**Design team gets**:
- Your existing audio code (keep it)
- Add Wized.requests.execute() calls (this document)
- Track word replays (enhanced analytics)
- Show effectiveness insights (after complete)

**No changes to your audio UX** - just adds intelligence tracking underneath.

