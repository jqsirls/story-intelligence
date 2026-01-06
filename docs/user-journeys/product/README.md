# Product User Journeys

**Audience:** Product Managers, Designers, Marketing, Support, Non-Technical Stakeholders  
**Style:** Apple-like clarity with no technical jargon  
**Last Updated:** December 2025

## Overview

This folder contains user journey documentation written for non-technical audiences. Each journey uses clear, simple language and real user examples to show how features work in practice.

**For technical documentation** with code references, see the parent folder's technical journey documents.

## Journey Documents

### [Registration and Authentication](./registration-and-auth.md)
All flows related to account creation, login, and identity verification:
- Child under 13 registration (with parent approval)
- Child under 13 registration (blocked without parent email)
- Adult (13+) registration
- Parent creating own account
- Login and authentication
- Password reset
- Email verification

### [Story Creation](./story-creation.md)
How users create, edit, and finalize stories:
- First story creation
- Creating with existing characters
- Creating new characters
- Story types and customization
- Saving and finalizing stories
- Story preview and editing

### [Library and Sharing](./library-and-sharing.md)
Library management, permissions, and family sharing:
- Creating and organizing libraries
- Inviting family members (with permission levels)
- Transferring stories between libraries
- Changing permission levels
- Managing who has access
- Sub-libraries and profiles

### [Parental Controls](./parental-controls.md)
Parent-specific flows for managing children's accounts:
- Checking consent status
- Revoking consent
- Accessing child's data
- Deleting child's data
- Exporting child's data
- Managing child's account settings
- Profile and email updates

### [Edge Cases and Error Recovery](./edge-cases.md)
What happens when things go wrong and how users recover:
- Network interruptions
- Account lockouts
- Failed story generation
- Permission denied scenarios
- Consent expiration
- Account deletion scenarios
- Data recovery options

## Journey Style Guide

All product journeys follow these principles:

### Apple-Like Clarity
- Use simple, clear language
- No technical jargon or developer terms
- Real user names (Emma, Mom, Dad, Grandma)
- Conversational tone while remaining professional

### Step-by-Step Format
- Numbered steps showing progression
- "What happens" descriptions
- Clear outcomes for each step
- Visual formatting (bold, sections, quotes for UI text)

### Context Notes
- UI details may change (wording, navigation)
- Flows remain consistent regardless of UI changes
- Note where alternate methods exist (web UI vs. email)

### Complete Information
- Show success paths
- Show failure scenarios
- Explain why certain steps exist
- Link to related journeys
- Reference technical docs when needed

## Using These Journeys

### For Product Managers
Use these to:
- Understand complete user experience
- Identify UX improvements
- Plan feature enhancements
- Communicate with stakeholders

### For Designers
Use these to:
- Design screens and flows
- Understand user context
- Identify UI requirements
- Plan user testing scenarios

### For Marketing
Use these to:
- Create marketing materials
- Write product copy
- Develop customer education
- Plan demo scenarios

### For Support Teams
Use these to:
- Understand how features work
- Troubleshoot user issues
- Create support documentation
- Train new support staff

## Related Documentation

- **Technical Journeys:** `../comprehensive-user-journeys.md` - Full technical flows with code references
- **REST API Journeys:** `../rest-api.md` - API-specific flows
- **Journey Index:** `../INDEX.md` - Complete map of all journeys (technical + product)
- **API Documentation:** `../../api-reference/` - API reference and error handling
- **Compliance:** `../../compliance/` - COPPA/GDPR compliance documentation

---

**Note:** These journeys describe intended functionality. Some features may be in development. Always verify current implementation status with engineering team.
