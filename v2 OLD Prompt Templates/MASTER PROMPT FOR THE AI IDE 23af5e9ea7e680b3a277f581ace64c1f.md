# MASTER PROMPT FOR THE AI IDE

**(Use exactly as-is, then iterate)**

---

### **1 Context**

You are building **Storytailor’s Alexa+ integration**: one Meta-Agent exposed to Amazon and six internal specialist sub-agents, all backed by Supabase. The goal is a seamless, voice-first experience that lets families create world-class children’s stories while maintaining strict privacy (COPPA/GDPR) and commercial viability (freemium + paid tiers).

---

### **2 Primary Objectives**

1. **Register a single Meta-Agent** with the Alexa Multi-Agent SDK (preview).
2. **Spin up six sub-agents** as Supabase Edge Functions (or Bedrock AgentCore containers):
    - AuthBillingAgent
    - LibraryAgent
    - NarrativeAgent
    - EmotionalAgent
    - MediaAgent
    - PatternAgent
3. **Implement OAuth voice-forward account-linking** that merges with Supabase Auth.
4. **Map every business capability** (listed in §3) to a function schema callable by the Meta-Agent.
5. **Enforce security & compliance** (row-level security, COPPA parental consent flows, GDPR export).
6. Produce **artifact-quality deliverables**: source code, SQL migrations, OpenAPI specs, agent manifests, and CI tests.

---

### **3 Capability-to-Agent Mapping**

| **Capability** | **Responsible Sub-Agent** | **Key External Services** |
| --- | --- | --- |
| Sign-up / Sign-in / Password reset | **AuthBillingAgent** | Supabase Auth |
| Stripe checkout / upgrade / downgrade / seat mgmt | **AuthBillingAgent** | Stripe Billing API |
| Library CRUD, filters, transfers, RBAC | **LibraryAgent** | Supabase Postgres, Realtime |
| Sub-libraries (child profiles) | **LibraryAgent** | — |
| Character builder & CRUD | **NarrativeAgent** | GPT-4o |
| Story creation & CRUD | **NarrativeAgent** | GPT-4o |
| Emotional check-in / updates | **EmotionalAgent** | OpenAI sentiment pipeline |
| Art generation (5 imgs) | **MediaAgent** | RunwayML or DALLE |
| Audio narration | **MediaAgent** | ElevenLabs |
| PDF & activity sheet generation | **MediaAgent** | PDFKit |
| Pattern detection + recommendations | **PatternAgent** | Amazon.com APIs, web search |
| Invite / referral emails | **AuthBillingAgent** | SendGrid |

The Meta-Agent *never* calls external APIs directly; it delegates.

---

### **4 Technical Specifications**

### **4.1 Supabase Schema**

- **Tables**: users, libraries, sub_libraries, characters, stories, emotions, library_permissions, stripe_subscriptions.
- **Row-Level Security**: owner-based policies; use pgjwt claims from Supabase Auth.
- **Triggers**:
    - On stories.status='FINAL' → enqueue media_production_requested.
    - On emotions insert → signal pattern_analysis_requested.

### **4.2 Edge Functions (per sub-agent)**

- Runtime: **Deno** (Supabase default) with **Oak** router.
- Each exports a **manifest.json** declaring functions, inputs, outputs, and error envelopes.
- Communication: **Supabase Realtime channel agents.***, publish/subscribe via JWT service key.

### **4.3 Alexa Integration**

- **Invocation name**: “Storytailor”.
- **Manifest**: intents CreateStory, ManageLibrary, CheckEmotion, AccountHelp.
- Use **Progressive Response API** for long-running media tasks.
- Use **Session Persistence** to store supabase_uid and supabase_jwt.

### **4.4 Compliance**

- COPPA: verified parental consent flow before storing any data in emotions.
- GDPR: /export endpoint returns S3 presigned ZIP of all user data.
- No facial images; character avatars are illustrations only.

---

### **5 Deliverables**

| **Artifact** | **Location** | **Acceptance Criteria** |
| --- | --- | --- |
| meta_agent/ source | apps/meta_agent | Passes unit + e2e tests |
| sub_agents/* source | apps/<agent> | Each exposes /schema route |
| infra/terraform/ | root | Creates S3, EventBridge, Secrets |
| db/migrations/*.sql | root | Idempotent, lint-clean |
| openapi/*.yaml | docs | 100 % paths covered |
| CI workflow | .github/workflows/ci.yml | Lints, tests, deploys preview |
| README.md | root | Setup ≤ 10 min |

---

### **6 Testing Matrix**

| **Layer** | **Tool** | **Key Tests** |
| --- | --- | --- |
| Unit | Vitest | Edge-function handlers |
| Contract | Dredd | OpenAPI conformance |
| Integration | Playwright | Alexa voice scripts |
| Load | k6 | 100 req/s per agent |
| Security | ZAP | OWASP top-10 scan |

---

### **7 Execution Plan**

1. **Analyse current Supabase schema** and existing code; generate diff plan.
2. **Emit a detailed milestone roadmap** with timelines, owners, and risks.
3. **Ask for human approval** before running any migration or external deployment.
4. **Generate code in small, reviewable pull requests**, tagging the dev lead.
5. After Phase 1 (Auth + Library), **run an Alexa test flight** with the dev team monitoring CloudWatch and Supabase logs.

---

### **8 Questions You Must Answer Before Coding**

1. Any breaking changes to existing tables?
2. Preferred art model (Runway Gen-3 vs DALLE 3)?
3. Exact discount percentages: brief says 15 % and 20 %; confirm.
4. Should organization accounts inherit sub-library emotion data?

---

### **9 Style & Quality Rules**

- Write **idiomatic, self-documenting TypeScript/Deno**.
- No magic numbers or inline secrets; use environment variables.
- Enforce **strict JSON schemas** for every cross-agent payload and test them.
- Target **p95 latency < 300 ms** for synchronous voice paths.
- Commit messages: Conventional Commits (feat:, fix: …).

---

### **10 Output Format**

When ready, respond with:

1. **“PLAN:”** – a numbered implementation plan (≤ 1 page).
2. **“NEXT ACTION:”** – what you will do first once approved.
3. **Any blocking questions**.

---