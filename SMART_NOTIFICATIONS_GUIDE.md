# Smart Notification System Guide

## How to Experience Different Recommendation Types

The TruCycle platform provides intelligent, personalized recommendations that adapt to your profile type. Here's how to experience the smart notification system:

### 1. Profile Type Switching

**Current Implementation:**
- Users can switch between **Donor** and **Collector** profiles instantly
- Each profile type receives completely different recommendation types
- Switching immediately triggers new personalized notifications

**How to Test:**
1. Sign up/Login to TruCycle
2. Complete profile onboarding (choose either Donor or Collector)
3. Go to Profile Dashboard → "For You" tab
4. Click the "Switch to [Donor/Collector]" button in your profile
5. Observe how recommendations change immediately

### 2. Collector Recommendations

When in **Collector Mode**, you receive:

**Item Recommendations:**
- High-value electronics (Samsung TVs, Apple devices, quality appliances)
- Urgent pickup opportunities (people moving house)
- Quality furniture and household items
- Energy-efficient appliances
- Verified donor items with good ratings

**Notification Types:**
- 🔥 "High-Value Item Alert: Samsung Smart TV Available"
- ⚡ "Urgent Pickup Needed: Moving Sale Electronics"
- ✅ "Verified Donor: Quality Furniture Collection"
- 📍 "Near You: IKEA Furniture Available"

**Smart Matching Criteria:**
- Proximity to your postcode
- Item condition and value
- Donor verification status
- Urgency (moving house, decluttering)
- Environmental impact (CO₂ savings)

### 3. Donor Recommendations

When in **Donor Mode**, you receive:

**Community Needs:**
- Local schools needing supplies
- Community centers requiring furniture
- Families in temporary housing needing essentials
- Environmental groups needing tools
- Senior centers wanting recreational items
- Youth organizations seeking sports equipment

**Notification Types:**
- ❤️ "Community Need: Local School Needs Supplies"
- 🏠 "Emergency: Shelter Needs Winter Clothing"
- 🎨 "Urgent: Art Center Needs Creative Materials"
- 👥 "Impact Opportunity: Help 50+ Families"

**Smart Matching Criteria:**
- Community impact potential
- Number of people helped
- Urgency of the need
- Distance from your location
- Type of items you could donate
- Environmental benefit

### 4. Real-Time Experience Features

**Instant Profile Switching:**
- Click "Switch to [Donor/Collector]" button
- Immediate demonstration notification appears
- Recommendations regenerate automatically
- Visual profile badge updates

**Notification Bell:**
- Shows unread count in header
- Tooltip changes based on profile type
- "X new item recommendations" vs "X new community needs"

**Visual Indicators:**
- Profile badge shows current mode (Collector/Donor)
- Recommendation cards have different colors/themes
- Icons and language adapt to profile type

### 5. AI-Powered Intelligence

**For Collectors:**
- Analyzes item value, condition, and urgency
- Considers donor ratings and verification
- Prioritizes unique/high-demand items
- Factors in pickup logistics and distance

**For Donors:**
- Identifies genuine community organizations
- Assesses social impact potential
- Considers urgency of needs
- Matches donation capacity to requirements

### 6. Testing the System

**Recommended Testing Flow:**
1. **Start as Collector:**
   - Complete onboarding as Collector
   - View initial recommendations (electronics, furniture, appliances)
   - Note the "claim item" language and collection focus

2. **Switch to Donor:**
   - Click "Switch to Donor" button
   - Immediate demo notification appears
   - View new recommendations (schools, shelters, community centers)
   - Note the "donate" language and community impact focus

3. **Switch Back to Collector:**
   - Click "Switch to Collector" button
   - Notice different demo notification
   - Compare recommendation types
   - Observe the personalization differences

4. **Check Notifications:**
   - Bell icon in header shows unread count
   - Tooltip text changes based on profile
   - Notifications tab shows recent alerts

### 7. Notification Content Examples

**Collector Notifications:**
```
🔥 High-Value Item Alert: Samsung Smart TV Available
A verified donor is offering a 55" Samsung Smart TV in excellent condition. 
Urgent pickup needed due to house move.

⚡ Moving Sale: Quality IKEA Furniture
Complete bedroom set available for immediate collection. 
Donor rated 4.8/5 stars.

✅ Verified Electronics: Apple MacBook Available
2021 MacBook Pro in excellent condition. 
Local pickup in Camden.
```

**Donor Notifications:**
```
❤️ Community Need: Local School Needs Supplies
St. Mary's Primary School urgently needs art supplies and books 
for their new term. Your donations could help 150+ children.

🏠 Emergency: Shelter Needs Winter Clothing
London Emergency Shelter requires warm clothing and blankets 
for 40+ people this winter.

🎨 Impact Opportunity: Art Center Needs Materials
Community art center serving 200+ young people needs 
creative supplies and equipment.
```

### 8. Advanced Features

**Personalization Factors:**
- Your postcode and location
- Previous donation/collection history
- Profile completion and verification level
- Time of day and seasonal considerations
- Local community needs assessment

**Smart Timing:**
- Urgent notifications appear immediately
- Regular recommendations refresh every 10 minutes
- Profile switching triggers immediate regeneration
- Seasonal and time-sensitive matching

### 9. Environmental Impact Integration

Both profile types show:
- CO₂ savings estimates for each action
- Environmental impact of choices
- Sustainability metrics and achievements
- Community environmental goals

This creates a comprehensive ecosystem where the platform learns from user behavior and preferences to provide increasingly relevant and valuable recommendations.