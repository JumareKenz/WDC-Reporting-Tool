# KADUNA STATE WDC - Design System

A professional, government-style design system for the Ward Development Committee Digital Reporting System.

## Design Principles

1. **Professional** - Clean, trustworthy government aesthetic
2. **Accessible** - WCAG 2.1 AA compliant
3. **Mobile-First** - Responsive design for all devices
4. **Consistent** - Reusable components and patterns
5. **User-Friendly** - Intuitive for non-technical users

## Color Palette

### Primary Colors (Kaduna Green)

Represents Kaduna State and Nigerian government branding.

```css
primary-50:  #f0fdf4  /* Lightest tint */
primary-100: #dcfce7
primary-200: #bbf7d0
primary-300: #86efac
primary-400: #4ade80
primary-500: #22c55e
primary-600: #16a34a  /* Main brand color */
primary-700: #15803d
primary-800: #166534
primary-900: #14532d  /* Darkest shade */
```

**Usage:**
- Buttons, links, and interactive elements: `primary-600`
- Hover states: `primary-700`
- Active states: `primary-800`
- Backgrounds: `primary-50`, `primary-100`

### Neutral Grays

For text, backgrounds, and borders.

```css
neutral-50:  #fafafa  /* Page backgrounds */
neutral-100: #f5f5f5  /* Card backgrounds */
neutral-200: #e5e5e5  /* Borders */
neutral-300: #d4d4d4  /* Disabled states */
neutral-400: #a3a3a3  /* Placeholders */
neutral-500: #737373  /* Secondary text */
neutral-600: #525252  /* Body text */
neutral-700: #404040  /* Headings */
neutral-800: #262626
neutral-900: #171717  /* Darkest text */
```

### Status Colors

For alerts, badges, and feedback.

```css
Success: #22c55e (green-600)
Warning: #f59e0b (yellow-600)
Error:   #ef4444 (red-600)
Info:    #3b82f6 (blue-600)
```

## Typography

### Font Stack

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
```

### Scale

```
text-xs:   0.75rem   (12px)
text-sm:   0.875rem  (14px)
text-base: 1rem      (16px)
text-lg:   1.125rem  (18px)
text-xl:   1.25rem   (20px)
text-2xl:  1.5rem    (24px)
text-3xl:  1.875rem  (30px)
text-4xl:  2.25rem   (36px)
```

### Weights

```
font-normal:    400  /* Body text */
font-medium:    500  /* Labels, subtle emphasis */
font-semibold:  600  /* Headings */
font-bold:      700  /* Strong emphasis */
```

### Usage Examples

```jsx
// Page titles
<h1 className="text-3xl lg:text-4xl font-semibold text-neutral-900">

// Section headings
<h2 className="text-2xl font-semibold text-neutral-900">

// Card titles
<h3 className="text-lg font-semibold text-neutral-900">

// Body text
<p className="text-base text-neutral-700">

// Small text / captions
<p className="text-sm text-neutral-600">

// Labels
<label className="text-sm font-medium text-neutral-700">
```

## Spacing Scale

```
spacing-xs:  0.25rem  (4px)
spacing-sm:  0.5rem   (8px)
spacing-md:  1rem     (16px)
spacing-lg:  1.5rem   (24px)
spacing-xl:  2rem     (32px)
spacing-2xl: 3rem     (48px)
```

**Tailwind Equivalents:**
```
p-1:  0.25rem
p-2:  0.5rem
p-4:  1rem
p-6:  1.5rem
p-8:  2rem
p-12: 3rem
```

## Components

### Buttons

**Variants:**

```jsx
// Primary (default)
<Button variant="primary">Submit Report</Button>

// Secondary
<Button variant="secondary">Cancel</Button>

// Outline
<Button variant="outline">View Details</Button>

// Ghost (minimal)
<Button variant="ghost">Edit</Button>

// Danger
<Button variant="danger">Delete</Button>

// Success
<Button variant="success">Approve</Button>
```

**Sizes:**

```jsx
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

**States:**

```jsx
// Loading
<Button loading>Submitting...</Button>

// Disabled
<Button disabled>Disabled</Button>

// With icon
<Button icon={Plus}>Add Report</Button>

// Full width
<Button fullWidth>Continue</Button>
```

### Cards

**Basic Card:**

```jsx
<Card title="Ward Statistics" subtitle="January 2026">
  <p>Card content goes here</p>
</Card>
```

**Icon Card (for metrics):**

```jsx
<IconCard
  icon={Users}
  iconColor="primary"
  title="Total Reports"
  value="12"
  subtitle="This month"
/>
```

**Empty State Card:**

```jsx
<EmptyCard
  icon={FileText}
  title="No reports yet"
  description="Submit your first report to get started"
  action={<Button>Submit Report</Button>}
/>
```

### Form Inputs

**Text Input:**

```jsx
<div>
  <label className="label-base">Email Address</label>
  <input
    type="email"
    className="input-base"
    placeholder="your@email.com"
  />
</div>
```

**With Icon:**

```jsx
<div className="relative">
  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
  <input
    type="email"
    className="input-base pl-10"
    placeholder="your@email.com"
  />
</div>
```

**Error State:**

```jsx
<input className="input-base input-error" />
<p className="text-sm text-red-600 mt-1">Invalid email</p>
```

### Badges

```jsx
// Status badges
<span className="badge-base badge-success">Submitted</span>
<span className="badge-base badge-warning">Pending</span>
<span className="badge-base badge-error">Flagged</span>
<span className="badge-base badge-info">Reviewed</span>
<span className="badge-base badge-neutral">Draft</span>
```

### Alerts

```jsx
// Success
<Alert type="success" message="Report submitted successfully" />

// Error
<Alert type="error" title="Error" message="Failed to submit report" />

// Warning
<Alert type="warning" message="Deadline approaching" />

// Info
<Alert type="info" message="New notification received" />

// Dismissible
<Alert
  type="success"
  message="Action completed"
  onClose={() => {}}
/>
```

### Modals

```jsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Submit Report"
  footer={
    <div className="flex gap-3">
      <Button variant="ghost">Cancel</Button>
      <Button variant="primary">Submit</Button>
    </div>
  }
>
  <p>Modal content goes here</p>
</Modal>
```

**Confirm Modal:**

```jsx
<ConfirmModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Report"
  message="Are you sure you want to delete this report?"
  confirmText="Delete"
  variant="danger"
/>
```

### Loading States

```jsx
// Spinner
<LoadingSpinner size="md" text="Loading..." />

// Full screen
<LoadingSpinner fullScreen text="Please wait..." />

// Skeleton loader
<Skeleton width="full" height="lg" />
<CardSkeleton count={3} />
```

## Layout Patterns

### Dashboard Layout

```jsx
<Layout>
  <div className="space-y-6">
    {/* Header */}
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-neutral-600">Welcome back!</p>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <IconCard {...} />
      <IconCard {...} />
      <IconCard {...} />
      <IconCard {...} />
    </div>

    {/* Main Content */}
    <Card>
      <p>Content here</p>
    </Card>
  </div>
</Layout>
```

### Form Layout

```jsx
<Card title="Submit Report">
  <form className="space-y-5">
    <div>
      <label className="label-base">Field Name</label>
      <input className="input-base" />
    </div>

    <div className="flex gap-3 justify-end">
      <Button variant="ghost">Cancel</Button>
      <Button variant="primary">Submit</Button>
    </div>
  </form>
</Card>
```

### List Layout

```jsx
<Card title="Recent Reports">
  <div className="divide-y divide-neutral-200">
    {items.map(item => (
      <div key={item.id} className="py-4">
        {/* List item content */}
      </div>
    ))}
  </div>
</Card>
```

## Responsive Design

### Breakpoints

```
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large desktops */
```

### Grid Patterns

```jsx
// 1 col mobile, 2 col tablet, 3 col desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 1 col mobile, 2 col tablet, 4 col desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Auto-fit responsive grid
<div className="grid grid-cols-auto-fit gap-6">
```

### Typography Responsive

```jsx
// Responsive heading
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

// Responsive padding
<div className="px-4 md:px-6 lg:px-8">
```

## Accessibility

### Focus States

All interactive elements have visible focus states:

```css
focus:outline-none
focus:ring-2
focus:ring-primary-500
focus:ring-offset-2
```

### ARIA Labels

```jsx
<button aria-label="Close modal">
  <X className="w-5 h-5" />
</button>
```

### Semantic HTML

Use proper semantic elements:
- `<nav>` for navigation
- `<main>` for main content
- `<article>` for independent content
- `<section>` for grouped content
- `<button>` for actions (not `<div>`)

## Animation

### Transitions

```jsx
// Hover transitions
className="transition-colors duration-200"
className="transition-all duration-200"

// Fade in
className="animate-fade-in"

// Slide in
className="animate-slide-in"

// Spin (loading)
className="animate-spin"
```

### Timing

- Quick interactions: 200ms
- Moderate transitions: 300ms
- Slow transitions: 500ms

## Icons

Using **Lucide React** for all icons:

```jsx
import { Icon } from 'lucide-react';

<Icon className="w-5 h-5 text-neutral-600" />
```

**Common Icons:**
- LayoutDashboard - Dashboard
- FileText - Reports
- Users - People/Wards
- Bell - Notifications
- Settings - Settings
- LogOut - Logout
- Plus - Add
- Edit - Edit
- Trash - Delete
- Check - Success
- X - Close/Error

## Best Practices

1. **Use semantic colors** - Don't use `green-600` directly, use `primary-600`
2. **Consistent spacing** - Use the spacing scale
3. **Mobile-first** - Start with mobile, enhance for desktop
4. **Accessibility** - Always include labels and ARIA attributes
5. **Loading states** - Show feedback for async operations
6. **Error handling** - Display clear, actionable error messages
7. **Empty states** - Provide guidance when no data exists

## Examples in Context

See `frontend/src/pages/Login.jsx` for a complete example of the design system in action.

---

**Design System Version:** 1.0
**Last Updated:** 2026-01-22
**Maintained by:** Kaduna State Government IT Department
