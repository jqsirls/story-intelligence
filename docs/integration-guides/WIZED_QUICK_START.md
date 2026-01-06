# Wized Quick Start - 30 Minutes to Working Integration

**Date**: December 25, 2025  
**Time**: 30 minutes to MVP, 6 hours to full site  
**Requirements**: Wized account, Webflow site, Storytailor API access

---

## 30-Minute MVP Setup

### Step 1: Create Wized App (5 minutes)

1. Go to https://app.wized.com
2. Create new project: "Storytailor Integration"
3. Apps → Create New App
   - Name: `Storytailor API`
   - Base URL: `https://api.storytailor.dev/api/v1`
   - Auth Type: `Bearer Token`
   - Token Variable: `v.accessToken`
4. Save app

### Step 2: Import Core Requests (10 minutes)

**Copy from [`WIZED_REQUEST_TEMPLATES.json`](WIZED_REQUEST_TEMPLATES.json)**

**Create these 10 essential requests**:

1. **Login**
   - Method: POST
   - Endpoint: `/auth/login`
   - Body: `{ email: v.loginEmail, password: v.loginPassword }`
   - On Success: `v.accessToken = r.Login.data.accessToken`

2. **GetStories**
   - Method: GET
   - Endpoint: `/stories`
   - Params: `{ page: v.currentPage, perPage: 20 }`
   - On Success: `v.userStories = r.GetStories.data.stories`

3. **GetStory**
   - Method: GET
   - Endpoint: `/stories/{v.currentStoryId}`
   - On Success: `v.currentStory = r.GetStory.data`

4. **CreateStory**
   - Method: POST
   - Endpoint: `/stories`
   - Body: `{ title: v.storyTitle, character_id: v.selectedCharacterId }`

5. **GetCharacters**
   - Method: GET
   - Endpoint: `/characters`
   - On Success: `v.userCharacters = r.GetCharacters.data.characters`

6. **CreateCharacter**
   - Method: POST
   - Endpoint: `/characters`
   - Body: `{ name: v.characterName, traits: { personality: v.personalityTraits, species: v.characterSpecies } }`

7. **TrackConsumption**
   - Method: POST
   - Endpoint: `/stories/{v.currentStoryId}/consumption`
   - Body: `{ eventType: v.playEventType }`

8. **GetCredits**
   - Method: GET
   - Endpoint: `/users/me/credits`
   - On Success: `v.creditsFormatted = r.GetCredits.data.formattedAmount`

9. **GetReferralLink**
   - Method: GET
   - Endpoint: `/users/me/referral-link`
   - On Success: `v.referralLink = r.GetReferralLink.data.referralLink`

10. **GetNotifications**
    - Method: GET
    - Endpoint: `/users/me/notifications`
    - On Success: `v.notifications = r.GetNotifications.data.notifications`

### Step 3: Set Up Data Store (5 minutes)

**Create these variables in Wized Data Store**:

**Authentication**:
```javascript
v.accessToken = null
v.userId = null
v.userType = null
v.isAuthenticated = false
```

**Core Data**:
```javascript
v.userStories = []
v.currentStory = null
v.userCharacters = []
v.creditsFormatted = "$0.00"
v.referralLink = ""
v.notifications = []
```

**UI State**:
```javascript
v.isLoading = false
v.currentPage = 1
v.totalPages = 1
```

### Step 4: Add to Webflow (5 minutes)

1. Open your Webflow project
2. Go to Project Settings → Custom Code
3. In "Before </body> tag", add:
```html
<script src="https://cdn.wized.com/v2/wized.js"></script>
```
4. Publish site

### Step 5: Test Authentication (5 minutes)

**Create Login Page in Webflow**:

1. Add a form with email & password inputs
2. Add wized attributes:
   ```html
   <form wized="login-form" wized-submit="login">
     <input wized-bind="v.loginEmail" type="email" required />
     <input wized-bind="v.loginPassword" type="password" required />
     <button type="submit">Log In</button>
   </form>
   ```
3. Test: Enter credentials, verify token stored

---

## 2-Hour MVP Build

**After 30-min setup, add these pages:**

### Hour 1: Core Pages

**Page 1: Story Library** (20 min)
- Grid of story cards
- Pagination controls
- Click to navigate to player

**Page 2: Story Player** (20 min)
- Load story details
- Audio player with controls
- Track consumption on play

**Page 3: Story Creator** (20 min)
- Form with character dropdown
- Submit to create story
- Navigate to new story

### Hour 2: Pipeline Features

**Page 4: Dashboard** (30 min)
- Today's activity
- Available credits
- Top effective stories

**Page 5: Referral Page** (30 min)
- Referral link with copy button
- Milestone progress
- Reward history

---

## 6-Hour Complete Site Build

### Hours 3-4: Advanced Features

- Email preferences page
- Character gallery
- Insights dashboard
- Notifications center

### Hours 5-6: User-Type Pages

- Teacher: Classroom dashboard
- Therapist: Client dashboard
- B2B: Organization dashboard
- Testing & polish

---

## Quick Troubleshooting

### Issue: 401 Unauthorized

**Check**:
1. Is `v.accessToken` set?
2. Is Authorization header configured in app?
3. Has token expired? (run RefreshToken)

### Issue: Data not displaying

**Check**:
1. Is request running? (check Wized logs)
2. Is response data structure correct?
3. Are Wized bindings correct? (`{item.title}` not `{data.title}`)

### Issue: Consumption tracking not working

**Check**:
1. Are audio event workflows configured?
2. Is `v.currentStoryId` set?
3. Check browser console for errors

---

## MVP Checklist

**30-Minute Setup**:
- [ ] Wized app created
- [ ] 10 core requests configured
- [ ] Data store variables set up
- [ ] Wized script added to Webflow
- [ ] Login tested

**2-Hour MVP**:
- [ ] Story library page (list + pagination)
- [ ] Story player page (audio + tracking)
- [ ] Story creator page (form + submit)

**6-Hour Full Site**:
- [ ] Dashboard with pipeline intelligence
- [ ] Referral dashboard with credits
- [ ] Email preferences page
- [ ] User-type-specific pages
- [ ] All 19 pages complete

---

## Resources

**Wized Documentation**: https://docs.wized.com/  
**Complete API Reference**: [`WIZED_COMPLETE_API_REFERENCE.md`](WIZED_COMPLETE_API_REFERENCE.md)  
**Page Templates**: [`WIZED_WEBFLOW_PAGE_TEMPLATES.md`](WIZED_WEBFLOW_PAGE_TEMPLATES.md)  
**Component Library**: [`WEBFLOW_COMPONENT_LIBRARY.md`](WEBFLOW_COMPONENT_LIBRARY.md)  
**Integration Examples**: [`WIZED_WEBFLOW_COMPLETE_EXAMPLES.md`](WIZED_WEBFLOW_COMPLETE_EXAMPLES.md)

---

## Next Steps

1. **Follow this quick start** (30 min)
2. **Build MVP** (2 hours)
3. **Add pipeline features** (4 hours)
4. **Test thoroughly** (1 hour)
5. **Launch**

**Total time from zero to production Wized/Webflow site: ~7.5 hours**

---

**Start here, then refer to other guides for complete feature implementation.**

