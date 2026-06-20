# TrailConnect Progress

## Status: June 7, 2026

### Completed
- Auth (email/password, Google, Remember Me via AsyncStorage)
- Feed (posts, likes, top 3 comments with author names, pull-to-refresh, auto-refresh on focus)
- Chat (real-time messaging, auto-refresh list, getOrCreateChat)
- Friends (search, request, accept/decline, remove, getFriendIds)
- Profiles (view/edit, avatar, tap from post card to profile view)
- Push notifications (3 Cloud Functions deployed: onNewMessage, onNewFriendRequest, onFriendRequestAccepted)
- **Map Tab** - Live location sharing (Start/Stop, 5s Firestore writes), friend avatar markers with local-cache download, friend watching decoupled from own sharing
- **Explore Tab** - Firestore trail fetch, auto-seed 5 Yosemite trails, search with 300ms debounce, difficulty filter chips, pull-to-refresh, Import GPX button, My Lists toggle
- **Trail Detail** - Stats, description, tags, conditions, elevation profile SVG chart, Save to List modal with checkboxes + create new list, waypoints with category toggles, reviews with half-star rating, delete trail (owner only)
- **Trail Route Map** - Full-screen MapView with Polyline, fitToCoordinates, waypoint markers with category colors + Ionicons, waypoint visibility toggles, friend avatar markers, location sharing controls, bottom sheet
- **Waypoint System** - 12 types with Ionicons, Firestore subcollection, map long-press to place, optional image attachment, sorted by route position (Haversine projection), official/mine/friend/other categories with color distinction + toggle filters, delete by uploader, KeyboardAvoidingView on form
- **GPX Import** - Document picker, regex-based XML parse, Haversine distance, elevation gain + loss, form for name/description/difficulty/tags, saves to Firestore with route
- **Trail Lists** - Firestore subcollection users/{userId}/lists, CRUD, add/remove trails, delete list with long-press
- **Half-Star Reviews** - Star icon cycles full → half → empty, updates trail rating + reviewCount
- **State Management** - 3 Zustand stores (authStore, hikeStore, userStore)

### Bug Fixes
- Android keyboard covering chat input
- Image picker API (MediaType.Images -> 'images')
- Expo Go notification crash (dynamic import)
- Firebase Auth warnings
- Firestore nested-arrays fix (route stored as {type, points} instead of GeoJSON [[lng,lat,ele]])
- Elevation loss zero-value bug (?? over ||)
- Friend watching separated from location sharing

### Completed
- **Hike Tracking** - Full GPS recording system:
  - `useHikeTracking` hook (`src/hooks/useHikeTracking.ts`): start/stop/pause/resume GPS recording, Haversine distance calc, elevation gain/loss, timer
  - `app/hike/active.tsx`: Live tracking screen with map (Polyline of recorded route + user location), stats bar (distance, pace, current elevation), timer, Pause/Resume/End controls
  - `app/hike/new.tsx`: Start hike form with name input, Quick Start + Named Hike options
  - `app/hike/[id].tsx`: Past hike detail with route map (non-interactive), stats grid (distance, gain, duration, pace), detail rows (loss, max/min elevation, track point count), photo gallery
  - `app/hikes/index.tsx` + `_layout.tsx`: My Hikes list screen with pull-to-refresh, sorted by date desc, each showing name/date/distance/duration/elevation
  - Store updated (`src/store/hikeStore.ts`): trackPoints, paused, elapsedMs, addTrackPoint, resetTracking
  - Types updated (`src/types/hike.ts`): TrackPoint interface, updated Hike with elevationGain/Loss/max/min, duration, trackPoints
  - Profile "My Hikes" menu navigates to `/hikes`
  - Explore tab "Start Hike" button next to "Import GPX"

### Next Steps
1. **Tighten Firestore/Storage security rules** for production
2. **Create dev build** for push notification testing (Expo Go can't test notifications)

### ⚠️ Notifications Reminder (for dev build only)
Notifications are wired up and Cloud Functions are deployed, but Expo Go removed notification support in SDK 53. To test:
1. Run `npx expo prebuild && npx expo run:android`
2. The `useNotifications(user?.id)` hook in `_layout.tsx` will auto-register the push token
3. The 3 Cloud Functions (`onNewMessage`, `onNewFriendRequest`, `onFriendRequestAccepted`) are already live

### Deployed Cloud Functions
- `onNewMessage` - Sends push when new chat message
- `onNewFriendRequest` - Sends push when friend request received
- `onFriendRequestAccepted` - Sends push when request accepted

### Relevant Files
- `app/(tabs)/explore.tsx`: Trail list, search, filters, Import GPX button, My Lists toggle
- `app/(tabs)/map.tsx`: Live location sharing, friend avatar markers, friend watching on mount
- `app/trail/[id].tsx`: Detail, reviews, waypoints with category badges + delete, ElevationChart, Save to List, delete trail
- `app/trail-map/[id].tsx`: Route Polyline, waypoint markers with category colors, friend markers, waypoint toggles, location sharing controls
- `app/trail/add-waypoint/[id].tsx`: Map long-press waypoint placement, trail-route zoom, KeyboardAvoidingView
- `app/import-gpx.tsx`: GPX file import flow, KeyboardAvoidingView
- `src/hooks/useLocationSharing.ts`: Refactored — startWatchingFriends/stopWatchingFriends separated from own sharing
- `src/services/waypointService.ts`: Waypoint CRUD, sortWaypointsByRoute, deleteWaypoint with ownership check + media cleanup
- `src/services/listService.ts`: Trail list CRUD
- `src/services/gpxParser.ts`: GPX XML parse, Haversine, elevation gain+loss
- `src/services/reviewService.ts`: Review subcollection read/write
- `src/services/friendService.ts`: getFriendIds added for friend ID list queries
- `src/types/waypoint.ts`: Waypoint interface with addedByName, WAYPOINT_TYPES constants
- `src/types/list.ts`: TrailList interface
- `src/types/trail.ts`: Trail interface with optional route, uploaderId, elevationLoss
- `src/components/TrailCard.tsx`: Summary card with distance, gain/loss, rating, tags
- `src/utils/constants.ts`: FIRESTORE_COLLECTIONS with LISTS
- `src/utils/theme.ts`: COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS design system
