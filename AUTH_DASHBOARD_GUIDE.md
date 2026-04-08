# UrbanDrainX Authentication & Role-Based Dashboard System

## System Overview

Your authentication system is now fully integrated with role-based access control. All user data is stored locally using localStorage for demo mode (no backend required).

---

## 1. LOGIN SYSTEM (Demo Mode - No Backend)

### Location: `src/components/Login.js`

**Features:**
- Mock users array with 3 pre-configured accounts
- Stores user object to localStorage (key: "user")
- Automatic redirect to dashboard on success
- Error handling with auto-clear on input

**Mock Users (Instant Login):**

```
Username: officer1    | Password: 12345 | Role: Field Officer | Area: Velachery
Username: supervisor1 | Password: 12345 | Role: Area Supervisor | Areas: Velachery, Triplicane
Username: admin1      | Password: 12345 | Role: District Head | Areas: ALL
```

**How It Works:**
```javascript
// User stored in localStorage
{
  username: "officer1",
  password: "12345",
  role: "Field Officer",
  assignedAreas: ["Velachery"]
}
```

---

## 2. REGISTER SYSTEM (Backend Integration)

### Location: `src/components/Register.js`

**Features:**
- Dynamic area fetching from backend (`/drains` endpoint)
- Role-based area selection:
  - **Field Officer**: Single area select
  - **Area Supervisor**: Multi-select areas
  - **District Head**: Auto-assigned to "ALL"
- Form validation with real-time feedback
- Stores new user to localStorage on success
- Auto-redirect to dashboard with 1.5s delay

**Form Fields:**
1. Full Name (required)
2. Official Email (required)
3. Role dropdown (required)
4. Assigned Area(s) - dynamic based on role
5. Username (required)
6. Password (min 6 chars)
7. Confirm Password

**User Object Structure:**
```javascript
{
  name: "John Officer",
  email: "officer@city.gov",
  role: "Field Officer",
  assignedAreas: ["Velachery"],
  username: "john_officer",
  password: "securePassword123"
}
```

---

## 3. DASHBOARD (Role-Based Access)

### Location: `src/components/Dashboard.js`

**Key Features:**
- Reads user from localStorage on load
- Auto-redirects to login if user not found
- Role-based area filtering
- Dynamic data filtering by selected area
- Professional government-style UI
- Real-time KPI calculations
- Alert severity prioritization
- Drain health visualization

**Role-Based Behavior:**

### Field Officer
```
- View: Only 1 assigned area
- Display: Area name (no dropdown)
- Data: All drains & alerts for that area only
- Example: Sees only "Velachery" data
```

### Area Supervisor
```
- View: Multiple assigned areas
- Display: Dropdown with assigned areas
- Data: Filters drains & alerts by selected area
- Example: Can switch between "Velachery" and "Triplicane"
```

### District Head
```
- View: ALL areas in database
- Display: Dropdown with all areas from DB
- Data: Filters drains & alerts by selected area
- Example: Can view any area in the system
```

**KPI Metrics Displayed:**
- Total Drains (in selected area)
- High Risk Alerts (immediate action required)
- Drain System Status (Good/Moderate/Critical)
- Health Score % (based on average DHI)
- Alerts Today (with comparison to yesterday)

**Data Sections:**

1. **Area Summary** - Overview of current area
2. **KPI Grid** - 4 key metrics with visual indicators
3. **Analytics Charts**:
   - Drain Health Overview (Bar chart)
   - Alert Severity Distribution (Pie chart)
4. **Recent Alerts** - Filterable by severity (ALL/HIGH/MEDIUM/LOW)
5. **Map View** - Visual representation of drain locations

---

## 4. SIDEBAR NAVIGATION

### Location: `src/components/DashboardSidebar.js`

**Menu Items:**
- Dashboard (main view)
- Alerts (jump to alerts section)
- Analytics (jump to charts section)
- Map View (jump to map section)
- Profile (navigate to profile page)

**Features:**
- Active menu highlighting
- Smooth scroll navigation
- Professional branding
- No page reloads

---

## 5. PROFILE PAGE

### Location: `src/components/Profile.js`

**Display Sections:**

### User Information
- Name
- Email
- Role
- Assigned Areas
- Username

### Change Password
- Validates current password
- Minimum 6 characters for new password
- Password confirmation required
- Updates localStorage user object

**Buttons:**
- Back to Dashboard (navigate)
- Logout (clears localStorage, redirects to login)

---

## 6. DATA FILTERING & CONSISTENCY

### Area Name Matching
All area names must match exactly between:
- Database (drain_master table)
- Register component dropdowns
- Dashboard area filters
- Alert area field

**Example - Areas in Database:**
```
Velachery
Triplicane
Adyar
Bessant Nagar
```

These exact names are:
1. Fetched from `/drains` endpoint
2. Displayed in register dropdowns
3. Used for filtering data
4. Shown in area selector on dashboard

### Data Flow
```
Login → Store user in localStorage
   ↓
Dashboard → Read user from localStorage
   ↓
Check role & assigned areas
   ↓
Filter drains & alerts by selected area
   ↓
Display role-based UI
```

---

## 7. AUTHENTICATION FLOW

### Login Flow
```
User enters credentials
    ↓
Compare with mock users array
    ↓
If match:
  - Store user to localStorage ("user" key)
  - Clear error
  - Navigate to /dashboard
    ↓
If no match:
  - Display error: "Invalid username or password"
  - Error clears on next input
```

### Dashboard Access Flow
```
User visits /dashboard
    ↓
Read from localStorage.getItem("user")
    ↓
If not found:
  - Redirect to /login
    ↓
If found:
  - Load user data
  - Determine role
  - Set up area options based on role
  - Fetch & filter data
  - Display dashboard
```

### Logout Flow
```
User clicks Logout
    ↓
localStorage.removeItem("user")
    ↓
Navigate to /login
    ↓
Form cleared, ready for next login
```

---

## 8. ROUTING

### App Routes (`src/App.js`)

```javascript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/about" element={<About />} />
  <Route path="/guide" element={<Guide />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

## 9. LOCALSTORAGE KEYS

### Current Implementation

**Key**: `"user"`

**Value**: JSON stringified user object
```javascript
{
  name: "Officer Name",
  email: "officer@city.gov",
  role: "Field Officer",
  assignedAreas: ["Velachery"], // Array or "ALL" for District Head
  username: "officer1",
  password: "12345"
}
```

**Accessed By:**
- Login.js (write on successful login)
- Dashboard.js (read on mount)
- Profile.js (read on mount, write on password change)
- Register.js (write on account creation)

---

## 10. UI DESIGN PRINCIPLES

### Clean Government Style
- No glassmorphism or fancy gradients
- Proper spacing and alignment
- Simple cards with clear hierarchy
- Meaningful labels and naming
- Professional color scheme
- Accessible form controls

### Component Structure
- Top navigation bar (topbar)
- Left sidebar (navigation)
- Main content area (dashboard)
- KPI cards with icons
- Data visualizations (charts)
- Alert cards with severity colors

### Color Scheme for Severity
- **HIGH**: Red (#b42318)
- **MEDIUM**: Orange (#f79009)
- **LOW**: Green (#16a34a)

---

## 11. TESTING YOUR SYSTEM

### Quick Test Steps

**1. Test Login**
```
- Visit /login
- Enter: officer1 / 12345
- Should redirect to /dashboard
- User info should display in topbar
```

**2. Test Role-Based Display**
```
- Login as officer1 (Field Officer)
  → Velachery area fixed (no dropdown)
- Login as supervisor1 (Area Supervisor)
  → Dropdown shows [Velachery, Triplicane]
- Login as admin1 (District Head)
  → Dropdown shows all areas from DB
```

**3. Test Register**
```
- Visit /register
- Fill form as:
  Name: Test Officer
  Email: test@city.gov
  Role: Field Officer
  Area: Select any area
  Username: testuser123
  Password: test@123
- Should redirect to /dashboard
```

**4. Test Profile**
```
- Click Profile menu item
- Verify all user info displays
- Try Change Password
- Logout
- Should redirect to /login
```

**5. Test Logout**
```
- Click Logout button (anywhere)
- Should redirect to /login
- localStorage should be cleared
```

---

## 12. BACKEND INTEGRATION NOTES

### Current State: Frontend Only
- Login: Uses mock data (no backend call)
- Register: Fetches areas from backend, but stores to localStorage
- Dashboard: Fetches data from backend if API configured

### When Backend Ready

**1. Update Login.js**
Replace mock user validation with API call:
```javascript
const response = await fetch(`${API}/login`, {
  method: 'POST',
  body: JSON.stringify({ username: identifier, password })
});
const user = await response.json();
localStorage.setItem("user", JSON.stringify(user));
```

**2. Update Register.js**
Already fetches areas from backend, just needs API endpoint.

**3. Dashboard.js**
Already fetches data from `/drains` and `/alerts` endpoints.

---

## 13. TROUBLESHOOTING

### Issue: Logout redirects but localStorage remains
**Solution**: Ensure handleLogout calls `localStorage.removeItem("user")`

### Issue: Area dropdown shows no options
**Solution**: Check that backend `/drains` endpoint returns data with `area` or `area_name` field

### Issue: User redirects to login immediately
**Solution**: Ensure localStorage has valid "user" key with proper JSON

### Issue: Password change not working
**Solution**: Verify password matches current password exactly (case-sensitive)

---

## 14. FILE STRUCTURE

```
src/components/
  ├── Login.js ..................... (Demo mode with mock users)
  ├── Register.js .................. (Dynamic areas, localStorage storage)
  ├── Dashboard.js ................. (Role-based filtering, main interface)
  ├── DashboardSidebar.js ......... (Navigation menu)
  ├── Profile.js ................... (User info, password change)
  └── [other components]
```

---

## QUICK START

### To Login Immediately:
1. Go to http://localhost:3000/login
2. Use any of these credentials:
   - officer1 / 12345
   - supervisor1 / 12345
   - admin1 / 12345
3. Dashboard loads instantly!

### To Register New Account:
1. Click "Create Account" on login page
2. Fill in the form (areas load from database)
3. Click "Create Account"
4. Redirects to dashboard automatically

### To Change Environment:
Update `.env` or `src/config.js` with your API endpoint.

---

## Summary

Your system is now:
✅ **Authentication**: Working with mock users (demo mode ready)
✅ **Registration**: Dynamic areas from backend, localStorage storage
✅ **Dashboard**: Role-based filtering and display
✅ **Navigation**: Professional sidebar with smooth scrolling
✅ **Profile**: User info display, password change capability
✅ **Logout**: Clean localStorage cleanup and redirect
✅ **UI**: Clean government-style, no clutter
✅ **Ready for Backend Integration**: Easy to switch to real API

🎉 **Your UrbanDrainX authentication system is complete!**

