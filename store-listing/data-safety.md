# Google Play Data Safety Form - 5tepTracker

Use these answers when filling out the Data Safety section in Google Play Console.

---

## Does your app collect or share any of the required user data types?
**Yes**

---

## Data Collection

### Personal Info
| Data Type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| Name (display name) | Yes | Yes (visible to friends) | App functionality | No |
| Email address | Yes | No | Account management | No |
| Phone number | Yes (if phone signup) | No | Account management | Yes |
| User profile photo | Yes | Yes (visible to friends) | App functionality | Yes |

### Health & Fitness
| Data Type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| Step count | Yes | Yes (visible to friends) | App functionality, Core feature | No |
| Distance | Yes | No | App functionality | No |
| Calories burned | Yes | No | App functionality | No |
| Exercise/activity data | Yes | No | App functionality | No |

### Location
| Data Type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| Approximate location | Yes | No | App functionality (run tracking) | Yes |
| Precise location | Yes | No | App functionality (GPS routes) | Yes |

### App Activity
| Data Type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| In-app actions | Yes | No | App functionality | No |

### Device Info
| Data Type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| Device type/model | No | No | N/A | N/A |

---

## Data Handling

### Is data encrypted in transit?
**Yes** - All data transmitted over HTTPS via Supabase

### Can users request data deletion?
**Yes** - Users can delete their account from within the app (Settings > Delete Account), which removes all associated data

### Is data processed ephemerally?
**No** - Data is stored persistently for app functionality

---

## Data Sharing

### Is any data shared with third parties?
**No** - Data is NOT sold or shared with third-party companies

### Is data shared with other users?
**Yes** - The following is visible to friends only:
- Display name
- Profile photo
- Daily step count
- XP level
- Activity feed posts

GPS routes and detailed health data are NEVER shared.

---

## Additional Notes for Form

- **Health Connect integration**: App reads step count, distance, and calories from Health Connect. This data stays on the user's device and synced to their private account.
- **Location**: Only collected during active GPS tracking sessions (runs/walks). Never collected in background unless user explicitly enables background tracking for an active session.
- **No ads**: App contains no advertising SDKs.
- **No analytics SDKs**: No Firebase Analytics, Mixpanel, etc.
- **Authentication**: Supabase Auth with email verification.
