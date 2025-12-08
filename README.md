# 🌿 TruCycle - Sustainable Item Exchange Platform

TruCycle is a London-based logistics and web application platform for household waste management that enables users to list, exchange, donate, or acquire household items while tracking their environmental impact through CO2 savings.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Application Architecture](#application-architecture)
- [Pages & Routes](#pages--routes)
- [Components Reference](#components-reference)
- [Real-time Features](#real-time-features)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Known Issues & Caveats](#known-issues--caveats)
- [Code Navigation Tips](#code-navigation-tips)
- [Development Workflow](#development-workflow)
- [Deployment & Handover Notes](#deployment--handover-notes)
- [License](#license)

---

## 🎯 Overview

### Core Features
- **User Authentication**: Registration, login, email verification, and profile management
- **Item Listing**: Create, edit, and manage item listings with photos, categories, and conditions
- **Search & Browse**: Filter items by category, location, condition, and price
- **Exchange System**: Request, approve, and track item exchanges and donations
- **Drop-off Points**: Interactive map showing 20 partner drop-off locations
- **Carbon Tracking**: Calculate and display CO2 savings from sustainable actions
- **Real-time Messaging**: WebSocket-based chat between users
- **Real-time Notifications**: WebSocket-based notifications for claims, messages, and system events
- **QR Code System**: Shop partners can scan items for drop-offs and collections
- **Partner Portal**: Separate interface for shop partners to manage inventory

### Tech Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite
- **Styling**: Tailwind CSS 4.x + Radix UI components
- **State Management**: React hooks + custom KV store (localStorage-based)
- **Real-time**: Socket.IO client for WebSocket connections
- **Forms**: React Hook Form + Zod validation
- **Maps**: React Leaflet for drop-off location maps
- **Icons**: Phosphor Icons + Heroicons
- **Animations**: Framer Motion
- **Image Upload**: Cloudinary (unsigned upload)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- A backend API server running (see `VITE_API_BASE_URL`)
- Cloudinary account for image uploads

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trucycle-sustainable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values (see Environment Variables section)
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or the next available port)

### Available Scripts

- `npm run dev` - Start Vite development server with hot reload
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm test` - Run Vitest unit tests
- `npm run kill` - Kill process running on port 5000

---

## 🔑 Environment Variables

All environment variables are prefixed with `VITE_` to be accessible in the frontend. Create a `.env` file in the root directory:

### Required Variables

#### **VITE_API_BASE_URL**
- **Purpose**: Base URL of the backend API server
- **Example**: `https://api.trucycle.com` or `http://localhost:3000`
- **Usage**: All API calls are prefixed with this URL
- **Critical**: Application will not function without this
- **Location**: `src/lib/api/client.ts`

#### **VITE_CLOUDINARY_CLOUD_NAME**
- **Purpose**: Your Cloudinary cloud name for image uploads
- **Example**: `dxxxxxxxxxxxx`
- **How to get**: Sign up at cloudinary.com and find in dashboard
- **Usage**: Used for uploading item photos and chat images
- **Location**: `src/lib/cloudinary.ts`

#### **VITE_CLOUDINARY_UPLOAD_PRESET**
- **Purpose**: Unsigned upload preset name from Cloudinary
- **Example**: `trucycle_unsigned`
- **Setup**: Create an unsigned preset in Cloudinary settings → Upload → Upload presets
- **Security**: Must be "unsigned" for frontend uploads
- **Location**: `src/lib/cloudinary.ts`

#### **VITE_CLOUDINARY_FOLDER** (Optional)
- **Purpose**: Folder path in Cloudinary where images are stored
- **Default**: `trucycle/items`
- **Example**: `production/trucycle/items` or `dev/trucycle/items`
- **Best Practice**: Use different folders for dev/staging/prod
- **Location**: `src/lib/cloudinary.ts`

### Example .env file
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_CLOUDINARY_CLOUD_NAME=dxxxxxxxxxxxx
VITE_CLOUDINARY_UPLOAD_PRESET=trucycle_unsigned
VITE_CLOUDINARY_FOLDER=trucycle/items
```

### Environment Variable Validation
- Missing `VITE_API_BASE_URL` will throw an error on first API call
- Missing Cloudinary config will throw an error when trying to upload images
- Check browser console for configuration errors

---

## 📁 Project Structure

```
trucycle-sustainable/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── messaging/      # Chat and messaging components
│   │   ├── partner/        # Partner portal components
│   │   ├── skeletons/      # Loading skeleton components
│   │   └── ui/             # Radix UI component wrappers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   ├── api/           # API client and types
│   │   ├── messaging/     # Messaging WebSocket logic
│   │   └── notifications/ # Notification WebSocket logic
│   ├── types/              # TypeScript type definitions
│   ├── styles/             # Global styles
│   ├── App.tsx            # Main consumer app component
│   ├── PartnerRouter.tsx  # Partner portal router
│   ├── RootRouter.tsx     # Root application router
│   └── main.tsx           # Application entry point
├── backend_docs/           # Backend API documentation
├── .env.example           # Environment variable template
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

---

## 🏗️ Application Architecture

### Routing System
The app uses a custom client-side router without external routing libraries:

1. **RootRouter** (`src/RootRouter.tsx`)
   - Top-level router that handles path parsing
   - Routes authentication pages: `/auth/verify`, `/auth/forgot-password`, `/auth/reset-password`
   - Routes partner portal: `/partner/*`
   - Default route goes to main App

2. **PartnerRouter** (`src/PartnerRouter.tsx`)
   - Handles partner portal routes: `/partner/home`, `/partner/items`, `/partner/shops`, `/partner/profile`
   - Manages authentication state for partners
   - Redirects unauthenticated users to `/partner/login`

3. **Main App** (`src/App.tsx`)
   - Tab-based navigation: `home`, `search`, `list`, `map`, `profile`, `mylistings`
   - All navigation is handled via state, not URL changes
   - Modal-based interface for most interactions

### Authentication Flow

1. **Consumer Users**
   - Sign up via `AuthDialog` component
   - Email verification required (check inbox for link)
   - Post-signup onboarding for user type (donor/collector) and location
   - JWT tokens stored in localStorage via `kvStore`
   - Auto-logout after 24 hours of inactivity

2. **Partner Users** (Shop Owners)
   - Separate registration at `/partner/register`
   - Must provide shop details during registration
   - Access to partner portal with different features
   - Same JWT authentication but different user type

### State Management

#### KV Store (`src/lib/kvStore.ts`)
- localStorage-based key-value store with type safety
- Supports serialization of complex objects
- Used for: user profiles, auth tokens, preferences, onboarding state
- Hook: `useKV(key, defaultValue)` provides reactive state

#### Loading Store (`src/lib/loadingStore.ts`)
- Global loading state management
- Tracks multiple concurrent operations by key
- Used for API calls and async operations
- Functions: `startLoading(key)`, `finishLoading(key)`

#### React Query (Planned but not implemented)
- `@tanstack/react-query` is installed but not actively used
- Most data fetching is done via custom hooks and manual state management

---

## 📄 Pages & Routes

### Consumer App Pages (Main App)

#### 1. **Home Tab** (`currentTab === 'home'`)
- **Component**: `<Homepage />`
- **Purpose**: Landing page with hero, featured items, and quick actions
- **Features**:
  - Hero section with app introduction
  - Quick action buttons (List Item, Browse, Find Drop-offs)
  - Environmental impact stats
  - Demo guide for first-time users
- **Navigation**: Default tab on app load

#### 2. **Search Tab** (`currentTab === 'search'`)
- **Component**: `<ItemListing />`
- **Purpose**: Browse and search all available items
- **Features**:
  - Search bar with real-time filtering
  - Category filters (Furniture, Electronics, Clothing, etc.)
  - Condition filters (New, Like New, Good, Fair)
  - Action type filters (Exchange, Donate, Recycle)
  - Grid view of item cards
  - Item detail modals with claim/request functionality
  - QR code generation for items
- **API**: `GET /items/search`

#### 3. **List Tab** (`currentTab === 'list'`)
- **Component**: `<ItemListingForm />`
- **Purpose**: Create new item listings
- **Features**:
  - Multi-step form (Category → Details → Photos → Location → Action)
  - Photo upload (up to 5 images via Cloudinary)
  - Category selection (predefined categories)
  - Condition selection
  - Action type selection (Exchange, Donate, Recycle)
  - Location/postcode input
  - Drop-off location selector for donations
  - Draft saving capability
- **API**: `POST /items`
- **Caveat**: Must be authenticated to list items

#### 4. **Map Tab** (`currentTab === 'map'`)
- **Component**: `<DropOffMap />`
- **Purpose**: Find partner drop-off locations
- **Features**:
  - Interactive Leaflet map with 20 partner locations
  - Location markers with shop details
  - Filter by shop capabilities (donations, recycling)
  - Directions and contact information
  - Shop hours and capacity indicators
- **Data**: Static shop locations from `src/components/dropOffLocations.ts`
- **Note**: Map tiles load from OpenStreetMap (requires internet)

#### 5. **Profile Tab** (`currentTab === 'profile'`)
- **Component**: `<ProfileDashboard />`
- **Purpose**: User profile, stats, and settings
- **Features**:
  - Profile information and avatar
  - Environmental impact stats (CO2 saved, items exchanged)
  - Trust score and verification badges
  - Verification center (email, identity, address)
  - Rewards balance
  - Settings dialog (edit profile, change preferences)
  - Logout functionality
- **API**: `GET /users/me`, `GET /users/me/impact`

#### 6. **My Listings Tab** (`currentTab === 'mylistings'`)
- **Component**: `<MyListingsView />`
- **Purpose**: Manage user's own listings and collections
- **Features**:
  - Two sections: "My Items" and "My Collections"
  - Edit/delete own listings
  - View and manage claims on listed items
  - Approve/reject claim requests
  - Mark items as collected
  - View collected items and their status
  - QR code generation for pickups
- **API**: `GET /items/me/listed`, `GET /items/me/collected`

### Authentication Pages

#### 1. **Email Verification** (`/auth/verify`)
- **Component**: `<VerifyEmailPage />`
- **Purpose**: Email verification after signup
- **Triggered**: When user clicks verification link in email
- **Query Params**: `?token=xxx`
- **Flow**: Auto-verifies and redirects to app

#### 2. **Forgot Password** (`/auth/forgot-password`)
- **Component**: `<ForgotPasswordPage />`
- **Purpose**: Request password reset email
- **Input**: Email address
- **API**: `POST /auth/forgot-password`

#### 3. **Reset Password** (`/auth/reset-password`)
- **Component**: `<ResetPasswordPage />`
- **Purpose**: Set new password with reset token
- **Query Params**: `?token=xxx`
- **API**: `POST /auth/reset-password`

### Partner Portal Pages (`/partner/*`)

#### 1. **Partner Login** (`/partner/login`)
- **Component**: `<PartnerLoginPage />`
- **Purpose**: Login for shop partners
- **Different from consumer login**: Separate authentication flow

#### 2. **Partner Register** (`/partner/register`)
- **Component**: `<PartnerRegisterPage />`
- **Purpose**: Shop registration
- **Required Info**: Shop name, address, contact, capabilities

#### 3. **Partner Home** (`/partner/home`)
- **Component**: `<PartnerHome />`
- **Purpose**: Partner dashboard with stats

#### 4. **Partner Items** (`/partner/items`)
- **Component**: `<PartnerItems />`
- **Purpose**: View items dropped off at partner shops

#### 5. **Partner Shops** (`/partner/shops`)
- **Component**: `<PartnerShops />`
- **Purpose**: Manage shop locations and details

#### 6. **Partner Profile** (`/partner/profile`)
- **Component**: `<PartnerProfile />`
- **Purpose**: Partner account settings

---

## 🧩 Components Reference

### Core Components

#### **Homepage** (`src/components/Homepage.tsx`)
- Landing page component
- Features: Hero, stats, CTAs, demo guide
- Props: Navigation callbacks, auth state

#### **ItemListing** (`src/components/ItemListing.tsx`)
- Search and browse items interface
- Features: Filters, search, grid view, item details
- Complex component with multiple sub-components
- Manages: Search state, filter state, selected item

#### **ItemListingForm** (`src/components/ItemListingForm.tsx`)
- Multi-step item creation form
- Largest component (~1400 lines)
- Steps: Category → Details → Photos → Location → Action
- Features: Draft saving, photo upload, validation
- Props: Callbacks for completion, draft state

#### **MyListingsView** (`src/components/MyListingsView.tsx`)
- User's listings and collections manager
- Two tabs: Listed items and Collected items
- Features: Edit, delete, claim management
- Complex claim approval workflow

#### **ProfileDashboard** (`src/components/ProfileDashboard.tsx`)
- User profile and stats display
- Features: Impact metrics, verification status, trust score
- Integrates: VerificationCenter, TrustScore, CarbonTracker

#### **DropOffMap** (`src/components/DropOffMap.tsx`)
- Interactive map component using React Leaflet
- Shows 20 partner drop-off locations
- Features: Markers, popups, filters, directions
- Note: Lazy-loads Leaflet to reduce initial bundle size

### Authentication Components

#### **AuthDialog** (`src/components/auth/AuthDialog.tsx`)
- Modal dialog for login/signup
- Switches between signin and signup modes
- Features: Email/password auth, validation, error handling
- API: `POST /auth/login`, `POST /auth/register`

#### **ProfileOnboarding** (`src/components/auth/ProfileOnboarding.tsx`)
- Post-signup onboarding flow
- Collects: User type (donor/collector), location, preferences
- Can be reopened for editing profile
- API: `PUT /users/me`

### Messaging Components

#### **MessageCenter** (`src/components/messaging/MessageCenter.tsx`)
- Real-time chat interface
- Two views: Chats list and Request inbox
- Features: Message sending, image attachments, presence indicators
- WebSocket: `/messages` namespace
- See [Messaging System](#messaging-system) for details

#### **MessageComponents** (`src/components/messaging/MessageComponents.tsx`)
- Reusable message UI components
- Components: MessageBubble, ChatHeader, RoomList

### Notification Components

#### **NotificationList** (`src/components/NotificationList.tsx`)
- Notification dropdown in header
- Shows recent notifications with unread count badge
- Types: Claims, collections, drop-offs, system messages
- WebSocket: `/notifications` namespace
- Features: Mark as read, navigation to related items

### QR Code Components

#### **QRCode** (`src/components/QRCode.tsx`)
- Generates QR codes for items
- Used for: Item pickups, drop-offs, partner scans
- Encodes: Item ID and action type

#### **QuickClaimScanner** (`src/components/QuickClaimScanner.tsx`)
- Collector's QR scanner for quick claims
- Scans item QR codes to instantly claim
- Uses browser camera API
- Library: jsqr for QR decoding

#### **ShopScanner** (`src/components/ShopScanner.tsx`)
- Partner's scanner for drop-offs and collections
- Handles: Drop-in scanning, claim-out scanning
- Validates items and processes transactions
- API: `POST /scan/dropin`, `POST /scan/claimout`

### Utility Components

#### **CarbonTracker** (`src/components/CarbonTracker.tsx`)
- Displays CO2 savings visualization
- Animated progress bars and stats
- Data from user impact metrics

#### **TrustScore** (`src/components/TrustScore.tsx`)
- User trust/reputation score display
- Based on: Transactions, ratings, verifications
- Visual: Stars and percentage

#### **VerificationBadge** (`src/components/VerificationBadge.tsx`)
- Shows verification status badges
- Types: Email verified, Identity verified, Address verified
- Used in: Profile, listings, messages

#### **DemoGuide** (`src/components/DemoGuide.tsx`)
- Interactive tutorial overlay
- Shows on first visit (dismissible)
- Guides users through key features

### UI Components (`src/components/ui/`)
Radix UI wrappers for design system consistency:
- Button, Input, Select, Checkbox, Radio, Switch
- Dialog, Sheet, Popover, Tooltip, Dropdown Menu
- Card, Badge, Avatar, Separator, Tabs
- Alert Dialog, Toast (Sonner), Progress Bar
- All styled with Tailwind CSS and CVA (Class Variance Authority)

---

## 🔄 Real-time Features

The app uses Socket.IO for real-time WebSocket communication. There are two separate namespaces:

### Messaging System

#### Connection Setup
```typescript
// src/lib/messaging/socket.ts
import { io } from 'socket.io-client'

const socket = io(API_BASE_URL + '/messages', {
  auth: { token: accessToken },
  transports: ['websocket'],
  autoConnect: false
})
```

#### Authentication
- JWT token required in handshake: `{ auth: { token } }`
- Alternative: Query param `?token=xxx` or header `Authorization: Bearer xxx`
- Connection rejected if token missing/invalid

#### Client → Server Events

**`room:join`** - Create/join a direct message room
```typescript
socket.emit('room:join', { otherUserId: 'user-uuid' })
socket.once('room:joined', (room: ActiveRoomViewModel) => {
  // Room ready
})
```

**`message:send`** - Send text or image message
```typescript
socket.emit('message:send', {
  roomId: 'room-uuid',
  text: 'Hello!',
  files: [{ name: 'image.jpg', type: 'image/jpeg', data: base64Data }]
})
socket.once('message:sent', (message: MessageViewModel) => {
  // Message sent
})
```

#### Server → Client Events

- **`message:new`** - New message in a room
- **`room:activity`** - Room last activity updated
- **`presence:update`** - User online/offline status changed
- **`room:cleared`** - Room history cleared
- **`room:deleted`** - Room deleted

#### HTTP Endpoints (Complementary)
- `POST /messages/rooms` - Ensure room exists
- `GET /messages/rooms/active` - List active rooms
- `GET /messages/rooms/:id/messages` - Message history (paginated)
- `POST /messages/rooms/:id/messages/image` - Upload image (for large files)
- `DELETE /messages/rooms/:id` - Delete room

#### Hook: `useMessaging()`
Custom hook in `src/hooks/useMessaging.ts`:
- Manages socket connection lifecycle
- Handles room joining and message sending
- Provides reactive state for rooms and messages
- Auto-reconnects on token changes

#### Caveats
- Image files sent via WebSocket are base64-encoded (size limit ~1MB)
- For larger images, use HTTP upload endpoint
- Messages are automatically marked with direction (`incoming`/`outgoing`) per viewer
- Presence is tracked per socket (user online if any socket connected)

See full documentation: `backend_docs/messaging_websocket.md`

### Notification System

#### Connection Setup
```typescript
// src/lib/notifications/socket.ts
const socket = io(API_BASE_URL + '/notifications', {
  auth: { token: accessToken },
  transports: ['websocket'],
  autoConnect: false
})
```

#### Server → Client Events

**`notification:new`** - New notification received
```typescript
socket.on('notification:new', (notification: NotificationViewModel) => {
  // Update badge count, show toast, update list
})
```

#### Client → Server Events

**`notification:read`** - Mark notification(s) as read
```typescript
// Single
socket.emit('notification:read', { id: 'notif-uuid' })

// Multiple
socket.emit('notification:read', { ids: ['uuid1', 'uuid2'] })

socket.once('notification:read:ack', ({ count }) => {
  console.log(`Marked ${count} as read`)
})
```

#### HTTP Endpoints
- `GET /notifications` - List notifications (with `?unread=true` filter)
- `GET /notifications/unread-count` - Get unread count for badge

#### Notification Types
- `item.claim.request` - Someone requested to claim your item
- `item.claim.approved` - Your claim was approved
- `item.collection` - Item was collected/delivered
- `dropin.created` - Item dropped off at partner shop
- `dropoff.created` - Drop-off recorded
- `pickup.created` - Pickup scheduled (future feature)
- `general` - System messages

#### Hook: `useNotifications()`
Custom hook in `src/hooks/useNotifications.ts`:
- Manages socket connection
- Maintains notification list and unread count
- Plays sound on new notifications (optional)
- Provides `markRead()` function

#### Caveats
- Notifications are persisted in database (not lost if offline)
- Unread count should be reconciled with server on app start
- Sound file: `src/lib/notificationSound.ts` (uses Web Audio API)
- Desktop notifications not implemented (only in-app)

See full documentation: `backend_docs/notification_websocket.md`

---

## 🌐 API Integration

### API Client
Located in `src/lib/api/client.ts`, this module handles all HTTP communication with the backend.

#### Configuration
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
```

#### Authentication
- JWT-based authentication
- Access token stored in localStorage (key: `auth.tokens`)
- Refresh token used for token renewal
- Auto-logout after 24 hours of inactivity
- Token included in all requests via `Authorization: Bearer <token>` header

#### Error Handling
```typescript
class ApiError extends Error {
  status: number    // HTTP status code
  details?: unknown // Additional error details
}
```

Common status codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `422` - Unprocessable entity (business logic error)
- `500` - Server error

#### Key API Functions

##### Authentication
- `register(dto: RegisterDto): Promise<RegisterResponse>`
- `login(dto: LoginDto): Promise<LoginResponse>`
- `verify(dto: VerifyDto): Promise<void>`
- `forgotPassword(dto: ForgetPasswordDto): Promise<void>`
- `resetPassword(dto: ResetPasswordDto): Promise<void>`
- `me(): Promise<MeResponse>` - Get current user profile
- `updateProfile(dto: UpdateProfileDto): Promise<void>`

##### Items
- `searchItems(query?: string, filters?: object): Promise<SearchItemsResponse>`
- `createItem(dto: CreateItemDto): Promise<CreateItemResponse>`
- `updateItem(id: string, dto: UpdateItemDto): Promise<UpdateItemResponse>`
- `deleteItem(id: string): Promise<void>`
- `myListedItems(): Promise<MyListedItemsResponse>`
- `myCollectedItems(): Promise<MyCollectedItemsResponse>`
- `getItemByQr(itemId: string): Promise<QrItemView>`

##### Claims
- `createClaim(dto: CreateClaimDto): Promise<CreateClaimResponse>`
- `approveClaim(claimId: string): Promise<ApproveClaimResponse>`
- `rejectClaim(claimId: string): Promise<void>`
- `collectItem(dto: CollectItemDto): Promise<CollectItemResponse>`

##### Shops
- `nearbyShops(lat: number, lng: number): Promise<NearbyShop[]>`
- `createShop(dto: CreateShopDto): Promise<ShopDto>`
- `listMyShopItems(shopId: string): Promise<ListMyShopItemsResponse>`

##### Scanning
- `scanDropin(dto: DropoffScanDto): Promise<DropoffInResult>`
- `scanClaimout(dto: ShopScanDto): Promise<ClaimOutResult>`
- `scanItemQr(itemId: string): Promise<QrScanAck>`

##### Impact
- `getUserImpact(): Promise<ImpactMetrics>`

#### Rate Limiting
- No client-side rate limiting implemented
- Backend may enforce rate limits (check API responses for `429` status)

#### Request Flow
1. Check if tokens exist and are not expired
2. Add `Authorization` header with access token
3. Make fetch request to `${API_BASE_URL}${endpoint}`
4. Handle response:
   - Success: Parse JSON and return data
   - `401`: Attempt token refresh, retry once
   - Other errors: Throw `ApiError`

---

## 🗂️ State Management

### Local State (Component State)
Most UI state is managed locally with `useState`:
- Form inputs
- Modal open/close states
- Tab selections
- Filter selections

### Global State (KV Store)
Persistent state in localStorage via `src/lib/kvStore.ts`:

#### Stored Data
- `auth.tokens` - JWT access and refresh tokens
- `auth.tokens.meta` - Last activity timestamp
- `current-user` - Current consumer user profile
- `partner-user` - Current partner user profile
- `onboarding-dismissals` - Dismissed onboarding prompts
- `show-demo-guide` - Demo guide visibility preference
- Custom keys via `useKV(key, defaultValue)`

#### KV Store API
```typescript
// Low-level functions
kvGet<T>(key: string): Promise<T | undefined>
kvSet<T>(key: string, value: T): Promise<void>
kvDelete(key: string): Promise<void>

// React hook (reactive)
const [value, setValue] = useKV<T>(key, defaultValue)
```

#### Caveats
- Data is NOT encrypted (avoid storing sensitive data)
- Data persists across sessions (until logout or browser clear)
- Storage quota: ~5-10MB depending on browser
- Changes don't sync across tabs (use `storage` event listener if needed)

### WebSocket State
Real-time state managed by custom hooks:
- `useMessaging()` - Chat rooms and messages
- `useNotifications()` - Notifications list and count
- `usePresence()` - User online/offline status

### Loading State
Global loading indicators via `src/lib/loadingStore.ts`:
```typescript
startLoading('unique-key')
// ... async operation
finishLoading('unique-key')

// Component usage
const isLoading = useLoadingStore((s) => s.loadingKeys.has('unique-key'))
```

---

## ⚠️ Known Issues & Caveats

### Security Issues (See `TruCycle_Loophole_Analysis.doc`)

#### Fixed Issues ✅
1. **Email verification enforcement** - Users must verify email before accessing app
2. **Password strength validation** - Enforced strong passwords (min length, mixed case, number, symbol)
3. **Input sanitization** - HTML and control characters stripped from user input
4. **File upload validation** - Image type and size validation implemented

#### Remaining Issues ⚠️
1. **No rate limiting** - Forms and API calls can be spammed
2. **No CAPTCHA** - Bots can create accounts
3. **No two-factor authentication** - Only email/password auth
4. **No CSRF protection** - API calls don't include CSRF tokens
5. **LocalStorage not encrypted** - Tokens and user data visible in dev tools
6. **No account lockout** - Unlimited login attempts allowed
7. **Console logging** - Errors logged to console (visible in production)
8. **No XSS protection beyond sanitization** - Should use Content Security Policy

### Functional Caveats

#### 1. **Map Component (DropOffMap)**
- **Issue**: Requires internet connection to load map tiles
- **Workaround**: Show error message if tiles fail to load
- **Note**: Map uses OpenStreetMap (free, no API key needed)

#### 2. **Image Uploads**
- **Issue**: Large images (>2MB) may timeout or fail
- **Workaround**: Client-side compression before upload (not implemented)
- **Best Practice**: Use HTTP upload endpoint for files >1MB (not WebSocket)

#### 3. **Real-time Connections**
- **Issue**: WebSocket connections close when app is backgrounded on mobile
- **Workaround**: Auto-reconnect on visibility change (implemented)
- **Note**: Some notifications may be missed if app closed

#### 4. **QR Code Scanning**
- **Issue**: Camera access blocked on HTTP (requires HTTPS)
- **Workaround**: Use `localhost` for dev (allowed by browsers)
- **Production**: Must deploy on HTTPS

#### 5. **Search Performance**
- **Issue**: No debouncing on search input (API called on every keystroke)
- **Impact**: Unnecessary API calls, potential rate limiting
- **Workaround**: Add debounce hook (not implemented)

#### 6. **Offline Support**
- **Issue**: App requires internet connection (no service worker)
- **Impact**: Breaks completely when offline
- **Future**: Implement PWA with offline caching

#### 7. **Browser Compatibility**
- **Tested**: Chrome 90+, Firefox 88+, Safari 14+
- **Not Tested**: Edge, Opera, mobile browsers extensively
- **Known Issue**: Safari sometimes blocks localStorage in private mode

#### 8. **Mobile Responsiveness**
- **Issue**: Some modals are hard to use on small screens (<375px)
- **Workaround**: Use Sheet component instead of Dialog on mobile

#### 9. **Token Refresh**
- **Issue**: Refresh token logic is basic (retries once, no queue)
- **Impact**: Concurrent requests may fail during refresh
- **Workaround**: Retry failed requests manually

#### 10. **Partner Portal**
- **Issue**: Partner portal is less polished than consumer app
- **Features**: Some features are stubs or incomplete
- **Testing**: Less tested than consumer app

### Performance Considerations

1. **Large Lists**: Item lists not virtualized (lag with >100 items)
2. **Image Loading**: No lazy loading (all images load immediately)
3. **Bundle Size**: ~500KB gzipped (mainly Radix UI and Leaflet)
4. **Initial Load**: ~2-3s on 3G (can be optimized with code splitting)

---

## 🗺️ Code Navigation Tips

### Where to Find Things

#### Authentication Logic
- **Components**: `src/components/auth/`
- **API Calls**: `src/lib/api/client.ts` - `register()`, `login()`, `verify()`
- **Token Management**: `src/lib/api/client.ts` - `getTokens()`, `setTokens()`
- **Auth Dialog**: `src/components/auth/AuthDialog.tsx`

#### Item Listing & Management
- **Listing Form**: `src/components/ItemListingForm.tsx` (large file, 1400+ lines)
- **Browse UI**: `src/components/ItemListing.tsx`
- **My Listings**: `src/components/MyListingsView.tsx`
- **API**: `src/lib/api/client.ts` - `createItem()`, `searchItems()`, etc.
- **Types**: `src/types/listings.ts`

#### Messaging System
- **UI**: `src/components/messaging/MessageCenter.tsx`
- **Socket Logic**: `src/lib/messaging/socket.ts`
- **Hook**: `src/hooks/useMessaging.ts`
- **Backend Docs**: `backend_docs/messaging_websocket.md`

#### Notification System
- **UI**: `src/components/NotificationList.tsx`
- **Socket Logic**: `src/lib/notifications/socket.ts`
- **Hook**: `src/hooks/useNotifications.ts`
- **Backend Docs**: `backend_docs/notification_websocket.md`

#### QR Code Features
- **Generation**: `src/components/QRCode.tsx`
- **Consumer Scanning**: `src/components/QuickClaimScanner.tsx`
- **Partner Scanning**: `src/components/ShopScanner.tsx`
- **API**: `src/lib/api/client.ts` - `getItemByQr()`, `scanDropin()`, `scanClaimout()`

#### Styling & Theme
- **Tailwind Config**: `tailwind.config.js`
- **Global Styles**: `src/main.css`, `src/index.css`
- **Theme Toggle**: `src/components/ThemeToggle.tsx`
- **Theme Hook**: `src/hooks/useThemeMode.ts`
- **UI Components**: `src/components/ui/`

#### Maps & Locations
- **Map Component**: `src/components/DropOffMap.tsx`
- **Location Selector**: `src/components/LocationSelector.tsx`
- **Drop-off Locations**: `src/components/dropOffLocations.ts` (static data)
- **Map Loader**: `src/lib/loadLeaflet.ts`

### Code Patterns

#### 1. API Calls
```typescript
import { apiFunction } from '@/lib/api'
import { startLoading, finishLoading } from '@/lib/loadingStore'
import { toast } from 'sonner'

async function handleAction() {
  startLoading('action-key')
  try {
    const result = await apiFunction(params)
    toast.success('Success!')
  } catch (error) {
    toast.error(error.message || 'Failed')
  } finally {
    finishLoading('action-key')
  }
}
```

#### 2. Form Handling (React Hook Form + Zod)
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  field: z.string().min(1, 'Required')
})

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { field: '' }
})

<form onSubmit={form.handleSubmit(onSubmit)}>
  <Input {...form.register('field')} />
  {form.formState.errors.field && <span>{form.formState.errors.field.message}</span>}
</form>
```

#### 3. WebSocket Events
```typescript
import { messageSocket } from '@/lib/messaging/socket'

useEffect(() => {
  const handler = (data) => {
    // Handle event
  }
  messageSocket.on('event:name', handler)
  return () => {
    messageSocket.off('event:name', handler)
  }
}, [])
```

#### 4. KV Store Usage
```typescript
import { useKV } from '@/hooks/useKV'

const [value, setValue] = useKV<string>('my-key', 'default')

// Update
setValue('new-value')

// Value persists across page reloads
```

### File Size Reference (Lines of Code)
Large files that may be intimidating:
1. `ItemListingForm.tsx` - 1,400 lines (multi-step form logic)
2. `MyListingsView.tsx` - 1,500 lines (complex claim management)
3. `ItemListing.tsx` - 1,000 lines (search, filters, detail view)
4. `App.tsx` - 800 lines (main orchestration)
5. `api/client.ts` - 600 lines (all API functions)

Small, focused files:
- Most hooks: 100-300 lines
- UI components: 50-200 lines
- Utility files: 50-150 lines

---

## 💻 Development Workflow

### Getting Started (Day 1)
1. Clone repo and install dependencies
2. Set up `.env` file (see [Environment Variables](#environment-variables))
3. Ensure backend API is running
4. Run `npm run dev` and open `http://localhost:5173`
5. Create a test account and explore the app
6. Read `PRD.md` for product requirements
7. Read `backend_docs/` for API documentation

### Daily Development
1. Pull latest changes: `git pull`
2. Install new dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Make changes (hot reload active)
5. Test changes in browser
6. Run linter: `npm run lint`
7. Commit and push: `git add . && git commit -m "..." && git push`

### Testing Strategy
- **Unit Tests**: Vitest for utility functions (run: `npm test`)
- **Manual Testing**: Use app in browser (most critical)
- **API Testing**: Use backend's built-in test tools (see backend docs)
- **Browser Testing**: Test on Chrome, Firefox, Safari
- **Mobile Testing**: Use browser dev tools mobile emulation

### Debugging Tips

#### 1. API Errors
- Open browser console (F12)
- Check Network tab for failed requests
- Look at request/response headers and body
- Verify `VITE_API_BASE_URL` is correct
- Check backend server logs

#### 2. WebSocket Issues
- Check console for socket connection errors
- Verify JWT token is valid (not expired)
- Test with backend's built-in WebSocket tester (see backend docs)
- Check network tab for WebSocket frames

#### 3. State Not Updating
- Check if component is using the right state hook
- Verify KV store key names are correct
- Look for missing dependencies in `useEffect()`
- Use React DevTools to inspect component state

#### 4. Styling Issues
- Check Tailwind class names are correct
- Verify theme colors in `tailwind.config.js`
- Use browser inspector to see computed styles
- Check for CSS specificity conflicts

#### 5. Image Upload Failures
- Check browser console for Cloudinary errors
- Verify env variables are set correctly
- Check image file size (<2MB recommended)
- Test with different image formats (JPEG, PNG)

### Common Tasks

#### Adding a New Page
1. Create component in `src/components/YourPage.tsx`
2. Add tab or route in `App.tsx` or router
3. Update navigation UI to access new page
4. Add types if needed

#### Adding a New API Endpoint
1. Add type definitions in `src/lib/api/types.ts`
2. Add function in `src/lib/api/client.ts`
3. Export function in `src/lib/api/index.ts`
4. Use in component with error handling

#### Adding a New Component
1. Create file in `src/components/YourComponent.tsx`
2. Export from `src/components/index.ts` (if shared)
3. Import and use in parent component

#### Adding a New Hook
1. Create file in `src/hooks/useYourHook.ts`
2. Export from `src/hooks/index.ts`
3. Use in components

#### Updating Dependencies
```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Update all (careful!)
npm update

# After updates, test thoroughly
npm run build
npm run lint
npm test
```

---

## 🚀 Deployment & Handover Notes

### Pre-Deployment Checklist
- [ ] All environment variables set in production
- [ ] Backend API URL points to production server
- [ ] Cloudinary configured for production folder
- [ ] HTTPS enabled (required for camera/location access)
- [ ] Domain configured and SSL certificate valid
- [ ] Build runs without errors: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] Browser testing completed (Chrome, Firefox, Safari)
- [ ] Mobile testing completed (iOS, Android)

### Build for Production
```bash
# Build optimized bundle
npm run build

# Output will be in dist/ directory
# Contains:
# - index.html (entry point)
# - assets/ (JS, CSS, images)
```

### Deployment Options

#### Option 1: Static Hosting (Recommended)
Deploy `dist/` folder to:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: Push `dist/` to `gh-pages` branch
- **AWS S3 + CloudFront**: Upload to S3, serve via CDN

#### Option 2: Node Server
Use a simple static server:
```bash
npm install -g serve
serve -s dist -p 3000
```

#### Option 3: Docker
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables in Production
Create `.env.production`:
```env
VITE_API_BASE_URL=https://api.trucycle.com
VITE_CLOUDINARY_CLOUD_NAME=dxxxxxxxxxxxx
VITE_CLOUDINARY_UPLOAD_PRESET=trucycle_prod
VITE_CLOUDINARY_FOLDER=production/trucycle/items
```

### Monitoring & Analytics (Not Implemented)
Consider adding:
- **Error Tracking**: Sentry, Rollbar, Bugsnag
- **Analytics**: Google Analytics, Mixpanel, Amplitude
- **Performance**: Lighthouse CI, Web Vitals
- **Uptime**: Pingdom, UptimeRobot

### Maintenance Tasks

#### Regular Tasks (Weekly)
- Review error logs and user feedback
- Check backend API health
- Monitor Cloudinary storage usage
- Review and moderate user content

#### Regular Tasks (Monthly)
- Update dependencies: `npm update`
- Run security audit: `npm audit`
- Check browser compatibility with new releases
- Review and optimize Cloudinary folder structure

#### Regular Tasks (Quarterly)
- Major dependency updates (React, Vite, etc.)
- Performance audit and optimization
- Security review
- Backup and disaster recovery test

### Handover Documentation

#### For New Developers
1. **Start Here**: Read this README thoroughly
2. **Understand Product**: Read `PRD.md` for requirements
3. **Understand Backend**: Read `backend_docs/` for API docs
4. **Code Walkthrough**: Start with `App.tsx`, then explore components
5. **Common Tasks**: See [Common Tasks](#common-tasks) section
6. **Ask Questions**: Document maintainer: [Your Contact Info]

#### Key Contacts
- **Backend API**: [Backend team contact]
- **Cloudinary**: [Account owner]
- **Domain/Hosting**: [DevOps contact]
- **Product Owner**: [Product contact]

#### Critical Files to Understand
1. `src/App.tsx` - Main app orchestration
2. `src/lib/api/client.ts` - All API communication
3. `src/lib/messaging/socket.ts` - Messaging WebSocket
4. `src/lib/notifications/socket.ts` - Notification WebSocket
5. `src/components/ItemListingForm.tsx` - Item creation
6. `src/components/MyListingsView.tsx` - Claim management

#### Third-party Services
- **Cloudinary**: Image hosting and optimization
- **OpenStreetMap**: Map tiles (no account needed)
- **Backend API**: Custom Node.js/Express API (separate repo)

#### Passwords & Credentials
- **Cloudinary**: [Store in password manager]
- **Domain Registrar**: [Store in password manager]
- **Hosting Service**: [Store in password manager]
- **Backend Database**: [Backend team manages]

### Future Enhancements (Roadmap)
1. **PWA Support**: Service worker for offline access
2. **Push Notifications**: Web push for real-time alerts
3. **Advanced Search**: Elasticsearch for better search
4. **Payment Integration**: Stripe for paid exchanges
5. **Admin Dashboard**: Moderation and analytics
6. **AI Features**: Image recognition, fraud detection
7. **Mobile Apps**: React Native or native iOS/Android
8. **Multi-language**: i18n support for internationalization
9. **Accessibility**: WCAG 2.1 AA compliance
10. **Testing**: Comprehensive unit and E2E test suite

---

## 📄 License

This project is licensed under the MIT License.

Copyright (c) 2024 TruCycle

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 📞 Support & Contact

For questions, issues, or contributions:
- **GitHub Issues**: [Repository Issues](https://github.com/macaddy2/trucycle-sustainable/issues)
- **Email**: [Your contact email]
- **Documentation**: This README and files in `backend_docs/`

---

**Last Updated**: December 2024  
**Version**: 0.0.0  
**Maintainer**: [Your Name]
