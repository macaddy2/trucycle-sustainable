# TruCycle MVP - Product Requirements Document

TruCycle is a London-based logistics and web app platform for household waste that enables users to list, exchange, donate, or acquire household items while tracking their environmental impact.

**Experience Qualities**: 
1. **Sustainable**: Every interaction reinforces environmental consciousness through clear CO2 impact visualization
2. **Trustworthy**: Verified badges, ratings, and GDPR compliance build user confidence in exchanges  
3. **Accessible**: Simple 3-click navigation and mobile-responsive design make sustainability actions effortless

**Complexity Level**: Complex Application (advanced functionality, accounts)
Multi-user marketplace with profiles, payments, geolocation, logistics scheduling, and comprehensive tracking systems requiring sophisticated state management and real-time data handling.

## Essential Features

### User Authentication & Profiles
- **Functionality**: User registration, login, profile management with ratings and activity tracking
- **Purpose**: Enable trusted exchanges and track individual environmental impact
- **Trigger**: "Sign Up" or "Login" buttons in header
- **Progression**: Landing → Registration form → Email verification → Profile setup → Dashboard
- **Success criteria**: Users can create profiles, view their CO2 savings, and manage listings

### Item Listing & Management  
- **Functionality**: Create, edit, delete listings with photos, descriptions, categories, and conditions
- **Purpose**: Enable users to list items for exchange, donation, or sale
- **Trigger**: "List Item" button or "Donate Now" CTA
- **Progression**: Dashboard → Listing form → Category/condition selection → Photo upload → Location/action type → Submit
- **Success criteria**: Users can successfully create detailed listings that appear in search results

### Search & Browse with Filtering
- **Functionality**: Search items by keyword, filter by category, location, condition, and price
- **Purpose**: Help users find specific items or browse available exchanges
- **Trigger**: Search bar or "Search" navigation
- **Progression**: Search input → Filter selection → Results grid → Item detail → Action (exchange/purchase)
- **Success criteria**: Users can quickly find relevant items using multiple filter combinations

### Drop-off Point Locator
- **Functionality**: Interactive map showing 20 drop-off locations with details and directions
- **Purpose**: Facilitate easy item drop-offs at partner locations
- **Trigger**: "Drop-Off Points" navigation or logistics options
- **Progression**: Map view → Location selection → Shop details → Drop-off instructions → Confirmation
- **Success criteria**: Users can locate nearest drop-off points and understand requirements

### Carbon Footprint Tracking
- **Functionality**: Calculate and display CO2 savings from exchanges and donations
- **Purpose**: Motivate sustainable behavior through environmental impact visualization
- **Trigger**: Automatic calculation on item exchanges/donations
- **Progression**: Item action → CO2 calculation → Profile update → Milestone notifications
- **Success criteria**: Accurate CO2 tracking with clear progress visualization

## Edge Case Handling
- **No Items Found**: Display encouraging message with "List an Item" CTA and popular categories
- **Failed Photo Upload**: Show retry option with compression guidance for large files
- **Unavailable Drop-off Point**: Suggest nearest alternatives with updated hours and capacity
- **Payment Failure**: Clear error messages with alternative payment method suggestions
- **Location Access Denied**: Fallback to borough selection dropdown with manual location entry

## Design Direction
The design should feel trustworthy and environmentally conscious with clean, modern aesthetics that emphasize sustainability without appearing overly corporate - professional enough for marketplace transactions while maintaining approachable warmth that encourages community participation.

## Color Selection
Analogous (adjacent colors on color wheel) - Using greens and blue-greens to reinforce sustainability messaging while maintaining visual harmony and trust.

- **Primary Color**: Forest Green (oklch(0.45 0.15 145)) - Communicates environmental responsibility and trustworthiness for main actions
- **Secondary Colors**: Sage Green (oklch(0.65 0.08 135)) for supporting elements and Light Green (oklch(0.85 0.05 140)) for backgrounds
- **Accent Color**: Teal (oklch(0.55 0.12 180)) - Attention-grabbing highlight for CTAs and verified badges

### Foreground/Background Pairings:
- Background White (oklch(0.98 0 0)): Dark Gray text (oklch(0.2 0 0)) - Ratio 11.4:1 ✓
- Primary Forest Green: White text (oklch(0.98 0 0)) - Ratio 8.2:1 ✓
- Accent Teal: White text (oklch(0.98 0 0)) - Ratio 6.8:1 ✓
- Card Light Green: Dark Gray text (oklch(0.2 0 0)) - Ratio 9.1:1 ✓

## Font Selection
Typography should convey reliability and accessibility while maintaining modern appeal - Roboto provides excellent readability across devices and reinforces the platform's professional yet approachable nature.

### Typographic Hierarchy:
- **H1 (Page Titles)**: Roboto Bold/32px/tight letter spacing
- **H2 (Section Headers)**: Roboto Medium/24px/normal letter spacing  
- **H3 (Card Titles)**: Roboto Medium/18px/normal letter spacing
- **Body Text**: Roboto Regular/16px/relaxed line height
- **Small Text**: Roboto Regular/14px/for metadata and captions

## Animations
Subtle functionality-focused animations that reinforce trust and environmental themes - smooth transitions that feel natural rather than flashy, with purposeful motion that guides users through sustainable actions.

- **Purposeful Meaning**: Gentle slide transitions for form progress, subtle pulse animations for CO2 counters, smooth hover states for interactive elements
- **Hierarchy of Movement**: Primary CTAs receive subtle hover animations, secondary actions have simple state changes, background elements remain static for focus

## Component Selection
- **Components**: Cards for item listings, Dialogs for item details and forms, Tabs for profile sections, Badges for verification status, Maps integration for drop-off locator, Progress bars for CO2 tracking
- **Customizations**: Custom CO2 counter component, item card with verification badges, map integration wrapper, custom upload component for multiple photos
- **States**: Buttons show loading spinners during actions, form inputs validate in real-time, item cards display availability status, verification badges animate on earn
- **Icon Selection**: Phosphor icons - Recycle for sustainability, MapPin for locations, Heart for donations, ArrowsClockwise for exchanges, Leaf for environmental impact
- **Spacing**: Consistent 16px base unit with 8px, 16px, 24px, 32px spacing scale for tight layouts to generous section separation
- **Mobile**: Stack item cards vertically, collapsible filters sidebar, full-screen map view, thumb-friendly 44px touch targets, simplified navigation with hamburger menu