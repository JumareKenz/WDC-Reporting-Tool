# Quick Start Guide - KADUNA STATE WDC Frontend

Get up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:8000`

## Installation

```bash
# Navigate to frontend directory
cd C:\Users\INEWTON\KADWDC\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at: `http://localhost:5173`

## First Login

1. **Open** `http://localhost:5173` in your browser
2. **Click** one of the demo login buttons, or
3. **Enter** credentials manually:

### Try as WDC Secretary
```
Email:    wdc.chikun.barnawa@kaduna.gov.ng
Password: demo123
```

### Try as LGA Coordinator
```
Email:    coord.chikun@kaduna.gov.ng
Password: demo123
```

### Try as State Official
```
Email:    state.official@kaduna.gov.ng
Password: demo123
```

## What You'll See

After login, you'll be redirected to a role-specific dashboard:
- **WDC Secretary** → `/wdc` dashboard
- **LGA Coordinator** → `/lga` dashboard
- **State Official** → `/state` dashboard

Currently, dashboards show placeholder content. You'll build the actual dashboard pages next.

## Using Components

All components are in `src/components/common/`. Here's how to use them:

### Example: Create a New Page

```jsx
// src/pages/MyPage.jsx
import Card, { IconCard } from '../components/common/Card';
import Button from '../components/common/Button';
import { Users } from 'lucide-react';

const MyPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Page</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <IconCard
          icon={Users}
          title="Total Users"
          value="150"
          iconColor="primary"
        />
      </div>

      {/* Content Card */}
      <Card title="Details" subtitle="More information">
        <p>Your content here</p>
        <Button variant="primary">Take Action</Button>
      </Card>
    </div>
  );
};

export default MyPage;
```

### Example: Use Authentication

```jsx
import { useAuth } from '../hooks/useAuth';

const MyComponent = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Welcome, {user.full_name}</p>
      <Button onClick={logout}>Logout</Button>
    </div>
  );
};
```

### Example: API Call

```jsx
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../utils/constants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';

const MyComponent = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports'],
    queryFn: () => apiClient.get(API_ENDPOINTS.REPORTS),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <Alert type="error" message={error.message} />;

  return (
    <div>
      {data.data.reports.map(report => (
        <div key={report.id}>{report.title}</div>
      ))}
    </div>
  );
};
```

## Project Structure

```
frontend/src/
├── main.jsx              # Entry point
├── App.jsx               # Routes & providers
├── index.css             # Global styles
│
├── api/
│   └── client.js         # API client
│
├── hooks/
│   └── useAuth.js        # Authentication
│
├── components/common/    # Reusable components
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Modal.jsx
│   ├── Alert.jsx
│   ├── LoadingSpinner.jsx
│   ├── Layout.jsx
│   └── Navbar.jsx
│
├── pages/                # Page components
│   └── Login.jsx
│
└── utils/                # Utilities
    ├── constants.js      # Constants
    └── formatters.js     # Helpers
```

## Common Tasks

### Add a New Route

1. Create page component in `src/pages/`
2. Add route in `App.jsx`:

```jsx
<Route
  path="/new-page"
  element={
    <ProtectedRoute allowedRoles={[USER_ROLES.WDC_SECRETARY]}>
      <NewPage />
    </ProtectedRoute>
  }
/>
```

### Add to Navigation

Edit `Layout.jsx` and add to role-specific navItems:

```jsx
const navItems = {
  [USER_ROLES.WDC_SECRETARY]: [
    { path: '/wdc', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/new-page', label: 'New Page', icon: NewIcon },
  ],
};
```

### Create a Form

```jsx
import { useState } from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const MyForm = () => {
  const [formData, setFormData] = useState({ name: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic
  };

  return (
    <Card title="Submit Form">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-base">Name</label>
          <input
            className="input-base"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <Button type="submit" variant="primary">
          Submit
        </Button>
      </form>
    </Card>
  );
};
```

### Show Loading State

```jsx
const [loading, setLoading] = useState(false);

return (
  <Button loading={loading} onClick={handleClick}>
    Click Me
  </Button>
);
```

### Show Success/Error

```jsx
const [error, setError] = useState(null);
const [success, setSuccess] = useState(false);

return (
  <>
    {error && <Alert type="error" message={error} />}
    {success && <Alert type="success" message="Success!" />}
  </>
);
```

## Available Components

### Buttons
```jsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>
```

### Cards
```jsx
<Card title="Title" subtitle="Subtitle">Content</Card>
<IconCard icon={Icon} title="Label" value="123" />
<EmptyCard icon={Icon} title="Empty" description="Text" />
```

### Modals
```jsx
<Modal isOpen={isOpen} onClose={handleClose} title="Title">
  Content
</Modal>

<ConfirmModal
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  message="Are you sure?"
/>
```

### Alerts
```jsx
<Alert type="success" message="Success!" />
<Alert type="error" message="Error occurred" />
<Alert type="warning" message="Warning" />
<Alert type="info" message="Info message" />
```

### Loading
```jsx
<LoadingSpinner size="md" text="Loading..." />
<LoadingSpinner fullScreen />
<Skeleton width="full" height="lg" />
```

## Styling with Tailwind

Use Tailwind utility classes:

```jsx
// Spacing
<div className="p-4 m-2 space-y-6">

// Layout
<div className="flex items-center justify-between">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Colors
<p className="text-primary-600 bg-neutral-50">

// Typography
<h1 className="text-3xl font-bold text-neutral-900">
<p className="text-sm text-neutral-600">

// Responsive
<div className="hidden md:block">
<div className="text-sm md:text-base lg:text-lg">
```

## Helpful Utilities

```jsx
import {
  formatDate,
  formatMonth,
  formatNumber,
  formatPercentage,
  getCurrentMonth,
} from '../utils/formatters';

// Use in components
<p>{formatDate(report.submitted_at, true)}</p>
<p>{formatMonth('2026-01')}</p>
<p>{formatNumber(1234567)}</p>
<p>{formatPercentage(83.5)}</p>
```

## Debugging

### Check Authentication
```jsx
import { useAuth } from '../hooks/useAuth';

const { user, isAuthenticated } = useAuth();
console.log('User:', user);
console.log('Authenticated:', isAuthenticated);
```

### Check API Responses
Open browser DevTools → Network tab → See API requests

### Common Issues

**Issue:** Components not showing
- **Fix:** Check if wrapped in `<Layout>` or route is protected

**Issue:** API calls failing
- **Fix:** Ensure backend is running on `http://localhost:8000`

**Issue:** Styles not applying
- **Fix:** Check Tailwind class names, ensure `index.css` is imported

## Next Steps

1. **Run the app** - Test login with demo credentials
2. **Explore components** - Check `src/components/common/`
3. **Read docs** - See `DESIGN_SYSTEM.md` for component usage
4. **Build dashboards** - Start with WDC Secretary dashboard

## Resources

- **Design System:** `frontend/DESIGN_SYSTEM.md`
- **API Spec:** `docs/API_SPEC.md`
- **Complete Guide:** `frontend/README.md`
- **Tailwind Docs:** https://tailwindcss.com/docs
- **React Query:** https://tanstack.com/query/latest/docs/react

## Support

Questions? Check the documentation files or contact the development team.

---

**Happy Coding!** 🚀
