# UrbanDrainX - Quick Reference Card

## 🔐 Demo Credentials (Use Immediately!)

```
FIELD OFFICER        | AREA SUPERVISOR      | DISTRICT HEAD
─────────────────────┼──────────────────────┼──────────────────
Username: officer1   | Username: supervisor1 | Username: admin1
Password: 12345      | Password: 12345      | Password: 12345
─────────────────────┼──────────────────────┼──────────────────
Sees: Velachery only | Sees: 2+ areas       | Sees: All areas
```

---

## 🗺️ What Each Role Sees

### Field Officer (officer1)
- ✓ Only assigned area (Velachery)
- ✓ No dropdown - locked to area
- ✓ All data filtered to that area
- ✓ Limited to field operations

### Area Supervisor (supervisor1)
- ✓ Multiple areas (Velachery, Triplicane)
- ✓ Dropdown to switch areas
- ✓ Comprehensive area oversight
- ✓ Can manage multiple zones

### District Head (admin1)
- ✓ All areas in system
- ✓ Dropdown to view any area
- ✓ System-wide overview
- ✓ Full administrative access

---

## 📊 Dashboard Sections

| Section | What It Shows |
|---------|---------------|
| **KPI Cards** | Total drains, risk alerts, system health, today's alerts |
| **Drain Health** | Bar chart showing drain condition (DHI scores) |
| **Alert Distribution** | Pie chart showing severity breakdown |
| **Recent Alerts** | List of alerts, filterable by severity |
| **Map View** | Visual placement of drains by health status |

---

## 🎯 Data Flow

```
LOGIN
  ↓ (store user to localStorage)
DASHBOARD
  ↓ (read user, get role)
CHECK ROLE & AREAS
  ↓ (determine what to show)
FILTER DATA
  ↓ (all data for assigned areas only)
DISPLAY UI
```

---

## 🖱️ Navigation Buttons

| Button | Action |
|--------|--------|
| **Area Dropdown** (topbar) | Switch to different area (if supervisor/admin) |
| **User Chip** (topbar) | Shows logged-in user name |
| **Logout** (topbar) | Clears session, redirect to login |
| **Dashboard** (sidebar) | Back to main dashboard |
| **Alerts** (sidebar) | Jump to alerts section |
| **Analytics** (sidebar) | Jump to charts section |
| **Map View** (sidebar) | Jump to map preview |
| **Profile** (sidebar) | View user info, change password |

---

## 🔧 Key Features

✅ **No Backend Required** - Demo mode works offline  
✅ **Instant Login** - No network delays  
✅ **Role-Based Display** - Different UI per role  
✅ **Area Filtering** - Data shown only for assigned areas  
✅ **Professional UI** - Clean government style  
✅ **Responsive Charts** - Visual data representation  
✅ **Password Management** - Change password on profile page  
✅ **Smart Area Selection** - Dropdown auto-generated from database  

---

## ⚠️ Alert Severity Colors

| Severity | Color | Meaning |
|----------|-------|---------|
| **HIGH** | 🔴 Red | Immediate action required |
| **MEDIUM** | 🟠 Orange | Monitoring recommended |
| **LOW** | 🟢 Green | Stable condition |

---

## 💾 Data Storage

**Storage Method**: Browser localStorage  
**Key**: `"user"`  
**Persists**: Until logout or cache clear  

**Stored Data**:
```json
{
  "name": "Officer Name",
  "email": "officer@city.gov",
  "role": "Field Officer",
  "assignedAreas": ["Velachery"],
  "username": "officer1",
  "password": "12345"
}
```

---

## 📝 Health Score Interpretation

| Range | Status | Meaning |
|-------|--------|---------|
| 70-100 | ✅ **Good** | Most drains stable, low risk |
| 40-69 | ⚠️ **Moderate** | Some monitoring needed |
| 0-39 | 🚨 **Critical** | Multiple drains need attention |

---

## 🚀 Quick Actions

| Want To... | Click... | Then... |
|-----------|----------|---------|
| See different area | Area dropdown | Select from list |
| Check alerts | Alerts (sidebar) | Filter by severity |
| View user info | Profile (sidebar) | See all details |
| Change password | Profile > Change Password | Enter old & new pwd |
| Exit system | Logout (topbar) | Confirm redirect |
| Create account | Register link | Fill form with areas |

---

## 🔄 Area Selection Rules

**Field Officer**: 
```
Single area locked in
No dropdown selection
```

**Area Supervisor**:
```
Multiple areas available
Dropdown shows: [Velachery, Triplicane, ...]
Can switch freely
```

**District Head**:
```
All areas available
Dropdown shows: [All areas from database]
Can view system-wide
```

---

## 🛡️ Security Notes

- Passwords stored in localStorage (demo mode only)
- No encryption in demo mode
- For production: Use secure backend authentication
- Logout clears all user data immediately
- Session ends if browser cache cleared

---

## 📱 Responsive Design

✓ Works on desktop  
✓ Tablet friendly  
✓ Mobile optimized  
✓ Touch-friendly buttons  
✓ Readable charts on small screens  

---

## 🔗 Routes

| URL | Page | Requires Login |
|-----|------|----------------|
| `/` | Homepage | No |
| `/login` | Login | No |
| `/register` | Register | No |
| `/dashboard` | Main Dashboard | **Yes** ✓ |
| `/profile` | User Profile | **Yes** ✓ |

---

## ❌ Common Issues & Fixes

**Issue**: Redirects to login instead of dashboard  
**Fix**: Try logging in again - localStorage might be cleared

**Issue**: Can't see all areas in dropdown  
**Fix**: Check if backend is reachable - areas fetched dynamically

**Issue**: Password change not working  
**Fix**: Confirm current password is exactly right (case-sensitive)

**Issue**: Charts not showing  
**Fix**: Check that API is returning data for selected area

---

## 🎓 Try This Workflow

1. **Login**: officer1 / 12345
2. **Check Dashboard**: View Velachery data
3. **Check Alerts**: See all HIGH alerts
4. **View Profile**: See assigned areas
5. **Change Password**: Try new password
6. **Logout**: Return to login

---

## 📞 System Status

- ✅ Authentication: Ready
- ✅ Registration: Ready
- ✅ Dashboard: Ready
- ✅ Role-Based Access: Ready
- ✅ Data Filtering: Ready
- ✅ Profile Management: Ready
- ✅ Professional UI: Ready

**Ready to deploy!** 🚀

---

*For detailed documentation, see AUTH_DASHBOARD_GUIDE.md*
