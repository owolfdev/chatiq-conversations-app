# Legal Document Audit Notes

**Date:** November 11, 2025  
**Auditor Role:** Senior SaaS Counsel + Product Risk Engineer  
**Scope:** Terms of Service, Privacy Policy, Security Overview

## Executive Summary

Comprehensive audit and revision of three legal documents to align with platform/infrastructure provider risk posture. Documents were restructured to clarify that Team Chat Code provides infrastructure services and does not control customer content, bot configurations, or end-user interactions.

## Key Risks Identified

### 1. **Over-Promising on Security & Availability**
- **Risk:** Absolute language ("impossible," "guaranteed," "100% secure") creates liability exposure
- **Mitigation:** Softened language to "aim to," "designed to," "may," with explicit disclaimers that no system is 100% secure

### 2. **Missing Platform Provider Context**
- **Risk:** Documents read as if we control customer content and bot behavior, creating assumption of responsibility
- **Mitigation:** Added explicit "Platform Provider Role" sections clarifying customer responsibilities and our limited role

### 3. **Insufficient Output Accuracy Disclaimers**
- **Risk:** Customers or end users may rely on AI outputs for critical decisions (legal, medical, financial)
- **Mitigation:** Added strong "Not Professional Advice" and "No Guarantee of Accuracy" sections with explicit warnings

### 4. **Missing Indemnification**
- **Risk:** No protection against claims arising from customer content, configurations, or end-user use
- **Mitigation:** Added comprehensive indemnification clause covering customer content, bot configurations, end-user interactions, and violations

### 5. **Unclear Data Processing Relationship**
- **Risk:** GDPR/compliance confusion about controller vs. processor roles
- **Mitigation:** Explicitly stated customer is controller, we are processor; added DPA reference and subprocessor list

### 6. **Training Usage Ambiguity**
- **Risk:** Unclear whether customer content is used for model training
- **Mitigation:** Explicitly stated "by default, we do not use Customer Content for training" with note about third-party provider policies

### 7. **Missing Professional Advice Disclaimer**
- **Risk:** Customers may use platform for regulated services without appropriate disclaimers
- **Mitigation:** Added prohibition on using Services for professional advice without disclaimers, plus explicit "Not Professional Advice" section

### 8. **Insufficient IP Ownership Clarity**
- **Risk:** Ambiguity about output ownership and customer content rights
- **Mitigation:** Clarified customer owns content and outputs (as between parties), with our rights to anonymized aggregated data

## Changes Made

### Terms of Service

**Added:**
- Definitions section (Customer, End User, Customer Content, Output, Services)
- Platform Provider Role section clarifying limited responsibility
- Professional advice prohibition and disclaimer
- Output accuracy disclaimers ("Not Professional Advice," "No Guarantee of Accuracy")
- Expanded prohibited uses section
- Data Processing section (controller/processor, DPA reference, subprocessors)
- Indemnification clause
- Confidentiality section
- Enhanced limitation of liability
- Output ownership clarification
- Expanded termination and service modification language

**Revised:**
- Acceptable use section expanded with more specific prohibitions
- Content & Ownership section restructured with clearer IP ownership
- Disclaimer & Limitation of Liability expanded and strengthened

### Privacy Policy

**Added:**
- "Our Role" section explicitly stating controller/processor distinction
- Detailed data collection breakdown (Account/Billing, Customer Content, End User Data)
- AI Model Training section with explicit "by default, we do not use Customer Content for training"
- Detailed subprocessor list (OpenAI, Anthropic, Supabase, Vercel, Stripe)
- End-user rights handling (direct to customer)
- Data retention periods with specific timelines
- International transfers safeguards description
- Children's privacy section
- DPA reference

**Revised:**
- Information collection section restructured by data type and our role
- Data usage section with lawful bases
- Security measures language softened ("designed to," "where supported")
- Sharing & Disclosure expanded with subprocessor details

### Security Overview

**Added:**
- Opening disclaimer: "This is an overview, not a guarantee"
- Platform provider context in introduction
- "Customer Responsibilities" section
- "Limitations & Disclaimers" section
- Vulnerability reporting section
- Softened language throughout ("aim to," "may," "designed to," "where supported")

**Revised:**
- Multi-tenancy isolation: Changed "impossible" to "aims to prevent" with disclaimer
- Encryption: Changed absolute claims to "aims to enforce" / "where supported"
- All absolute security claims softened with appropriate disclaimers
- Infrastructure section notes dependency on third-party providers
- Incident response: Changed "within 72 hours" to "target: within 72 hours where feasible"

## TODOs Requiring Product Confirmation

### High Priority

1. **Encryption at Rest Verification**
   - **Location:** Security Overview, Section 1.2
   - **Issue:** Document states "AES-256 where supported by Supabase" but needs verification
   - **Action:** Confirm with infrastructure team whether Supabase Postgres and Storage actually provide AES-256 encryption at rest, or if this is infrastructure-managed encryption
   - **Current Language:** "Data stored in Supabase Postgres and Storage benefits from infrastructure-level encryption (AES-256 where supported by Supabase)"

2. **Retention Periods**
   - **Location:** Privacy Policy, Section 6.1; Terms, Section 11
   - **Issue:** 30-day deletion period and 90-day chat log retention need product confirmation
   - **Action:** Verify actual deletion timelines in codebase/database policies
   - **Current Language:** "Deleted documents and embeddings are removed within 30 days" / "Chat logs: Retained per Customer's configuration (default: 90 days)"

3. **Training Usage - Third-Party Provider Settings**
   - **Location:** Privacy Policy, Section 4
   - **Issue:** Need to confirm whether OpenAI/Anthropic API settings actually allow opting out of training
   - **Action:** Verify current API configuration and whether customers can control training opt-out
   - **Current Language:** "Customers should review these policies and configure model settings accordingly (e.g., using API settings that opt out of training, where available)"

4. **Moderation Implementation**
   - **Location:** Security Overview, Section 4; Terms, Section 5
   - **Issue:** Document says content "may be screened" - need to confirm if this is always-on or optional
   - **Action:** Verify moderation API usage in codebase (is it mandatory or configurable?)
   - **Current Language:** "Uploaded text may be screened using OpenAI Moderation API"

### Medium Priority

5. **DPA Document Creation**
   - **Location:** Terms, Section 9; Privacy Policy, Section 13
   - **Issue:** DPA is referenced but document doesn't exist
   - **Action:** Create Data Processing Addendum document for enterprise customers
   - **Current Status:** Placeholder reference only

6. **Subprocessor List Updates**
   - **Location:** Terms, Section 9; Privacy Policy, Section 5.1
   - **Issue:** List may need updates if additional providers are added
   - **Action:** Establish process for updating subprocessor list and notifying customers
   - **Current List:** OpenAI, Anthropic, Supabase, Vercel, Stripe

7. **SOC 2 Status**
   - **Location:** Security Overview, Section 6
   - **Issue:** Document says "planned for Q3 2025" - verify if this is still accurate
   - **Action:** Confirm current SOC 2 assessment timeline
   - **Current Language:** "SOC 2 readiness assessment planned for Q3 2025 (roadmap item, not current status)"

8. **Backup Encryption**
   - **Location:** Security Overview, Section 5
   - **Issue:** States "Backup procedures in place; encryption status depends on infrastructure provider"
   - **Action:** Verify actual backup encryption status with Supabase/Vercel
   - **Current Language:** Generic statement needs verification

### Low Priority

9. **PII Filtering Availability**
   - **Location:** Security Overview, Section 2.1
   - **Issue:** States "Optional regex filtering for PII may be available"
   - **Action:** Confirm if this feature actually exists in the product
   - **Current Language:** "Optional regex filtering for PII (emails, card numbers, SSNs) may be available"

10. **Rate Limiting Details**
    - **Location:** Security Overview, Section 3.2
    - **Issue:** States "Rate limiting implemented" but doesn't specify limits
    - **Action:** Consider adding specific rate limits or reference to documentation (optional)
    - **Current Language:** Generic statement

## Consistency Checks

✅ **Terminology:** Consistent use of "Customer," "End User," "Customer Content," "Output" across all three documents  
✅ **Subprocessors:** Same list in Terms and Privacy Policy  
✅ **Retention Periods:** Consistent 30-day deletion, 90-day audit log retention  
✅ **Training Usage:** Consistent "by default, we do not use Customer Content for training"  
✅ **Platform Provider Language:** Consistent messaging about infrastructure role  
✅ **Contact Emails:** Consistent legal@teamchatcode.com, privacy@teamchatcode.com, security@teamchatcode.com

## Risk Posture Alignment

✅ **Platform Provider Role:** Clearly established - we provide infrastructure, customers control content  
✅ **No Absolute Promises:** Removed "guarantee," "always," "100% secure" language  
✅ **Professional Advice Disclaimer:** Strong warnings against reliance on outputs  
✅ **Indemnification:** Customer indemnifies for their content, configurations, and end-user use  
✅ **Output Accuracy:** Explicit disclaimers that outputs may be incorrect  
✅ **Third-Party Pass-Through:** Clear that model provider issues are not our liability  
✅ **Controller/Processor:** Explicit GDPR-aligned data processing relationship  
✅ **Training Usage:** Clear statement that we don't train on customer content by default

## Next Steps

1. **Product Team Review:** Share TODOs with product/engineering to verify technical claims
2. **DPA Creation:** Draft Data Processing Addendum for enterprise customers
3. **Subprocessor Management:** Establish process for maintaining and updating subprocessor list
4. **Legal Review:** Consider external legal review for indemnification and limitation of liability clauses
5. **Customer Communication:** Plan notification strategy if material changes are made post-verification

## Document Status

- ✅ **Terms of Service:** Complete, ready for product verification of technical claims
- ✅ **Privacy Policy:** Complete, ready for product verification of retention/training claims  
- ✅ **Security Overview:** Complete, ready for product verification of encryption/security claims

All documents are commit-ready pending product team verification of technical assertions marked in TODOs.


