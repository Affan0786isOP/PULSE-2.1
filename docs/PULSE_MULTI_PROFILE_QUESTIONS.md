# PULSE — Multi-Profile System Architecture & Implementation Questions

This document compiles every question regarding the design, architectural edge cases, security boundaries, user experience, and integration details for the PULSE optional local-first multi-profile system.

---

## 1. Identity & Profile Constraints

1. **Display Name Character Set & Formatting:**
   - What characters and symbols should be permitted in profile display names (e.g. alphanumeric only, spaces, hyphens, underscores, emojis)?
   - What should the minimum and maximum character length be for display names (e.g. 3 to 20 characters)?
   - Should profanity or reserved keyword filtering (e.g. "admin", "pulse", "system", "moderator") be enforced server-side upon reservation?

2. **Profile UID Structure:**
   - The spec specifies exactly 16 lowercase alphanumeric characters (`[a-z0-9]{16}`). Should generation use cryptographic random byte sampling (e.g. `crypto.getRandomValues`) with base36 or custom alphabet encoding?
   - Should profile UIDs include any prefix (e.g. `prof_...`) or strictly remain raw 16 characters?

3. **Theme Customization & Visual Palette:**
   - Should users choose theme colors from a curated set of preset observatory accent tokens (e.g. Signal Cyan, Neon Green, Amber, Violet, Rose, Azure), or should arbitrary hex/HSL color codes be permitted?
   - Does each profile also support a selectable avatar icon/symbol (e.g. Lucide iconography, geometric glyphs), or is identity visually distinguished solely by name, age group, and theme accent?

4. **Age Cohort Updates:**
   - When a user edits a profile's age group in Profile Settings, should there be any restriction or confirmation dialog warning that subsequent assessments will use the new age group while historical assessments retain the prior cohort?

---

## 2. Server Registry & Three-Database Architecture

5. **Firestore Named Database Configuration:**
   - How should the secondary database IDs be configured across environments (e.g. hardcoded `pulse-profiles` and `pulse-leaderboard`, or configured via environment variables such as `PROFILES_DATABASE_ID` and `LEADERBOARD_DATABASE_ID`)?
   - In local development or automated CI where Firestore emulator is used, should the emulator emulate multiple databases, or fall back to distinct collections/namespaces when multi-database support is unavailable in the emulator environment?

6. **Global Name Uniqueness & Reservation Lifecycle:**
   - When a profile is deleted, should its display name reservation be immediately freed up for any user to claim, or placed in a cooling-off / tombstone state for a retention window?
   - When a profile is renamed, should the previous name be released immediately in the same atomic transaction that reserves the new name?

7. **Rate Limiting & Anti-Abuse:**
   - What rate limits should apply to `/api/profiles/check-name` to prevent bad actors from brute-force scanning reserved names?
   - What rate limits should be enforced for profile creation, renaming, and deletion attempts per IP or authenticated session?

---

## 3. Account Linking & Cross-Device Recovery

8. **Account Linking Collision Resolution:**
   - If an anonymous user on Device A creates 3 profiles, and attempts to link to a Google account that already owns 3 profiles registered on Device B, the combined count (6) exceeds the account cap of 5. How should this conflict be presented and resolved?
     - Reject linking with a prompt requiring profile deletion on one device first?
     - Offer an interactive resolution screen allowing the user to select which 5 profiles to keep and which to release?
     - Abort account linking cleanly without altering either set of profiles?

9. **Multi-Device Local Sync:**
   - When a user logs into a linked account on a brand-new device, the remote registry contains their profile UIDs, names, and age groups, but lacks their local theme colors and UI preferences. How should the new device initialize these profiles?
     - Create local profile entries with sensible default themes, with a prompt to import an encrypted backup if available?
     - Prompt the user immediately during initial setup to choose theme colors for the recovered profiles?

10. **Account Unlinking & Sign-Out:**
    - If a user signs out of a linked account on a device, should local profile data in IndexedDB be retained locally, cleared, or prompted to the user?
    - If an account is deleted entirely, how should the backend cascade deletion across reserved names and profile documents?

---

## 4. Local-First Storage & Cryptographic Backup

11. **IndexedDB Schema & Lifecycle:**
    - Should the IndexedDB database be named `pulse_local_store` (version 1), with stores for `profiles` and `preferences`?
    - How should schema migrations be handled if additional local profile fields are introduced in future versions?

12. **Encrypted Backup Cryptographic Specifications:**
    - Should the key derivation parameters for the Web Crypto API be standardized to PBKDF2 with SHA-256 and a minimum of 100,000 or 600,000 iterations?
    - Should backup files be exported as a JSON envelope containing `{ version: 1, kdf: "PBKDF2", salt: "<hex>", iv: "<hex>", ciphertext: "<hex>", tag: "<hex>" }` with a specific file extension (e.g. `.pulse-backup`)?
    - Should an unencrypted plaintext JSON export option also be provided for convenience, or must backup exports strictly require passphrase encryption?

13. **Local Storage Fallback:**
    - If IndexedDB is blocked or disabled by strict browser privacy settings (e.g. certain private browsing modes), should the application fall back to `localStorage`, in-memory session storage, or notify the user that local profile persistence is limited?

---

## 5. Assessment Integration & Pre-Flight UX

14. **Pre-Flight Selection Trigger & Bypass:**
    - For a user with one or more profiles, when starting an assessment:
      - Should the pre-flight profile selector always be displayed as an explicit step before the stimulus countdown?
      - Or should the currently "Active" profile be used automatically by default, with a one-click "Switch Profile" button on the assessment briefing card?
    - Should the pre-flight screen include a prominent "Continue as Guest" button that bypasses profile usage and presents the standard demographic age selector?

15. **Assessment Interruption & Offline Handling:**
    - If an assessment session starts with a selected profile, but the user loses internet connection during the test, how should completion be handled?
      - Store the completed result locally with the profile UID and age group, and queue it for submission when back online?
      - Allow viewing the local results card immediately while indicating cloud sync status?

---

## 6. Leaderboard Integration & Privacy

16. **Leaderboard Submission Flow:**
    - When a user with multiple profiles achieves a leaderboard-eligible score, should the submission modal auto-select the profile that completed the assessment, or allow selecting any profile owned by the account?
    - If the user decides to submit without a profile (guest), should they be allowed to enter a one-time public alias as in the existing system?

17. **Profile Name Changes vs Historical Leaderboard Entries:**
    - If a user renames their profile from "Apex" to "Nova", what should happen to existing leaderboard entries submitted under "Apex"?
      - Should historical leaderboard entries retain the name active at the moment of submission ("Apex")?
      - Or should existing leaderboard submissions update to reflect the new display name ("Nova")?

18. **Leaderboard Display & Public Fields:**
    - What fields should be visible on public leaderboard rows for profile submissions (e.g. Profile Display Name, Age Group, Score, Timestamp, Provenance Verification Badge)?
    - Should there be any visual badge or indicator distinguishing verified profile submissions from guest/anonymous submissions on the public board?

---

## 7. Profile Management UI (`/profiles`) & Dual-Surface Parity

19. **Navigation & Entry Points:**
    - Where should navigation links to `/profiles` be located in the header and navigation shell on desktop and mobile?
    - Should an active profile pill/avatar be visible directly in the top header next to the Settings icon when a profile is selected?

20. **Mobile PWA Layout Differences:**
    - On mobile screens ($< 768\text{px}$), should `/profiles` render as a dedicated full-screen view within the mobile routing stack, with bottom-sheet modals for profile editing and theme swatch selection?
    - Should haptic feedback be triggered on mobile devices during profile switching and active profile selection?
