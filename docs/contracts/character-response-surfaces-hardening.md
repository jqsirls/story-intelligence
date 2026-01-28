## Character Response Surfaces: hardening rules

Purpose: keep public/org/admin/internal response surfaces separated and prevent prompt/trace leakage.

### Non‑negotiables (audit list)
- [ ] Surface separation: admin/internal views never exposed to org or frontend clients.
- [ ] Public responses never include prompts, traces, validation payloads, internal failures, admin flags, or `reference_images`.
- [ ] No `tpose*` keys appear anywhere in public response payloads.
- [ ] Backstory storytype is the only writer of:
  - `traits.story`
  - `traits.characterNuance`
  - `traits.inclusivityIntegration`
- [ ] Enrichment steps may derive `traits.derived`, but must not overwrite backstory‑authored fields.
- [ ] Seed payloads are projections only; they must never mutate source traits.
- [ ] Headshot/bodyshot refs are always included in story/art seed payloads (internal).
- [ ] If no inclusivity traits exist, `traits.inclusivityIntegration` is `[]` (never `null`).
- [ ] Any new surface uses the standard response envelope + error codes from the proposal.

### Guardrails in repo
- Canary review pack gate rejects forbidden keys in public snapshots and any `tpose` string.
- REST tests assert public character responses omit prompts/traces/validation payloads.
