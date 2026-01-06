# Wized Integration - Document Index

**Date**: December 25, 2025  
**Purpose**: Guide to which document to use for what

---

## Quick Lookup

### "I need to configure Requests in Wized dashboard"

**Use**: [`WIZED_COMPLETE_API_REFERENCE.md`](WIZED_COMPLETE_API_REFERENCE.md)
- Shows request configuration for all 131 endpoints
- Name, method, endpoint, body, params, on success
- **For**: Wized dashboard → Requests → Create Request

**Quick Import**: [`WIZED_REQUEST_TEMPLATES.json`](WIZED_REQUEST_TEMPLATES.json)
- Import this JSON into Wized for instant setup
- Pre-configured requests, variables, workflows

---

### "I need HTML structure for Webflow"

**Use**: [`WIZED_WEBFLOW_PAGE_TEMPLATES.md`](WIZED_WEBFLOW_PAGE_TEMPLATES.md)
- 19 complete page layouts
- Wized attribute patterns
- **For**: Webflow designer (visual design)

**Plus**: [`WEBFLOW_COMPONENT_LIBRARY.md`](WEBFLOW_COMPONENT_LIBRARY.md)
- 15 reusable components
- HTML + CSS structure
- **For**: Copy/paste components across pages

---

### "I need JavaScript code for Webflow custom code"

**Use**: [`WIZED_WEBFLOW_CODE_SNIPPETS.md`](WIZED_WEBFLOW_CODE_SNIPPETS.md)
- 20+ ready-to-paste JavaScript blocks
- Like your Hue integration style
- **For**: Webflow → Page Settings → Custom Code → Before </body>

**Special**: [`WIZED_ADVANCED_AUDIO_INTEGRATION.md`](WIZED_ADVANCED_AUDIO_INTEGRATION.md)
- Your sophisticated audio player + Storytailor tracking
- WebVTT word highlighting + consumption analytics
- **For**: Story player page custom code

---

### "I need to understand complete user flows"

**Use**: [`WIZED_WEBFLOW_COMPLETE_EXAMPLES.md`](WIZED_WEBFLOW_COMPLETE_EXAMPLES.md)
- 8 end-to-end integration examples
- Story creation, play tracking, referrals, etc.
- **For**: Understanding how pieces connect

---

### "I need quick setup instructions"

**Use**: [`WIZED_QUICK_START.md`](WIZED_QUICK_START.md)
- 30-minute setup guide
- Step-by-step from zero to working integration
- **For**: First-time Wized setup

---

## By Use Case

### Setting Up Wized

1. **Create app**: WIZED_COMPLETE_API_REFERENCE.md (app config section)
2. **Import requests**: WIZED_REQUEST_TEMPLATES.json (import into dashboard)
3. **Set variables**: WIZED_REQUEST_TEMPLATES.json (variables section)
4. **Test**: WIZED_QUICK_START.md (testing steps)

### Building in Webflow

1. **Design pages**: You handle this yourself ✅
2. **Add Wized attributes**: WIZED_WEBFLOW_PAGE_TEMPLATES.md (wized="..." examples)
3. **Add custom code**: WIZED_WEBFLOW_CODE_SNIPPETS.md (JavaScript to paste)
4. **Advanced audio**: WIZED_ADVANCED_AUDIO_INTEGRATION.md (your player + tracking)

### Understanding API

1. **All endpoints**: WIZED_COMPLETE_API_REFERENCE.md
2. **REST API spec**: docs/api/REST_API_IMPLEMENTATION_GUIDE.md
3. **Pipeline features**: docs/pipelines/FRONTEND_INTEGRATION_GUIDE.md

---

## Document Purpose Matrix

| Document | Purpose | Use When |
|----------|---------|----------|
| **WIZED_COMPLETE_API_REFERENCE.md** | Request configurations for Wized dashboard | Creating requests, understanding endpoints |
| **WIZED_REQUEST_TEMPLATES.json** | Import file for instant Wized setup | Initial setup, want to skip manual config |
| **WIZED_WEBFLOW_PAGE_TEMPLATES.md** | HTML structure with Wized attributes | Need page layout examples |
| **WEBFLOW_COMPONENT_LIBRARY.md** | Reusable HTML/CSS components | Building pages, need consistent components |
| **WIZED_WEBFLOW_CODE_SNIPPETS.md** | Ready-to-paste JavaScript | Need custom code for Webflow pages |
| **WIZED_ADVANCED_AUDIO_INTEGRATION.md** | Your audio player + tracking | Story player page with read-along |
| **WIZED_WEBFLOW_COMPLETE_EXAMPLES.md** | End-to-end integration flows | Understanding complete user journeys |
| **WIZED_QUICK_START.md** | Step-by-step setup guide | First time setting up Wized |

---

## What You Do vs. What Docs Provide

### You Handle (Your Expertise)

✅ **Webflow visual design** - Layout, spacing, typography, colors  
✅ **UI/UX design** - User flows, interactions, animations  
✅ **Responsive design** - Mobile/tablet/desktop breakpoints  
✅ **Brand styling** - Matching Storytailor brand guidelines

### Docs Provide (Technical Integration)

✅ **Wized request configurations** - API endpoint setup  
✅ **Wized variable definitions** - Data store structure  
✅ **Custom code snippets** - JavaScript for Webflow  
✅ **Advanced features** - Audio tracking, color engine, effectiveness  
✅ **Wized attribute patterns** - Data binding examples

---

## Special Cases

### Hue Integration

**Already have working code** - Keep it! ✅  
**Add**: Consumption tracking calls if you want to track story plays that triggered Hue

### Advanced Audio Player

**Already have working code** - Keep it! ✅  
**Add**: Consumption tracking + effectiveness insights (see WIZED_ADVANCED_AUDIO_INTEGRATION.md)

### Custom Features

**If you build custom interactions**:
- Use your own JavaScript
- Add `Wized.requests.execute()` calls for API integration
- Reference WIZED_COMPLETE_API_REFERENCE.md for endpoints

---

## Quick Answer to Your Questions

### "Which files explain Wized actions, requests?"

**Answer**: 
- **WIZED_COMPLETE_API_REFERENCE.md** - All request configurations
- **WIZED_REQUEST_TEMPLATES.json** - Import file (skip manual config)
- **WIZED_WEBFLOW_COMPLETE_EXAMPLES.md** - Workflow/action examples

### "For Webflow, I can design myself"

**Answer**: Correct! You only need:
- **WIZED_WEBFLOW_CODE_SNIPPETS.md** - Custom code (like Hue)
- **WIZED_ADVANCED_AUDIO_INTEGRATION.md** - Audio player integration
- Optional: **WIZED_WEBFLOW_PAGE_TEMPLATES.md** - Reference for Wized attributes

### "What about my audio flow?"

**Answer**: **WIZED_ADVANCED_AUDIO_INTEGRATION.md**
- Keeps your existing code (word highlighting, color engine, etc.)
- Adds Storytailor tracking calls
- Tracks word replays for engagement analytics
- Shows effectiveness insights after play complete
- Ready to paste - integrates with your existing code

---

## Recommended Reading Order

### First Time Setup

1. **WIZED_QUICK_START.md** - Overview and setup steps
2. **WIZED_REQUEST_TEMPLATES.json** - Import into Wized
3. **WIZED_COMPLETE_API_REFERENCE.md** - Reference for all endpoints

### Building Specific Features

4. **WIZED_WEBFLOW_CODE_SNIPPETS.md** - Copy/paste JavaScript as needed
5. **WIZED_ADVANCED_AUDIO_INTEGRATION.md** - Story player integration
6. **WIZED_WEBFLOW_COMPLETE_EXAMPLES.md** - When stuck on flows

### Reference

7. **WEBFLOW_COMPONENT_LIBRARY.md** - Component patterns
8. **WIZED_WEBFLOW_PAGE_TEMPLATES.md** - Page examples

---

**Use this index to find the right document for your specific need.**

