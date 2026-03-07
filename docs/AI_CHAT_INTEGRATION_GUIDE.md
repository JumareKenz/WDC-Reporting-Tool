# AI Chat Interface - Integration Guide

## Overview

This guide provides step-by-step instructions for integrating and deploying the AI Chat Interface feature in the Kaduna State WDC Digital Reporting System.

## Table of Contents

1. [Quick Start](#quick-start)
2. [File Structure](#file-structure)
3. [Dependencies](#dependencies)
4. [Integration Steps](#integration-steps)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Existing WDC frontend project

### One-Command Setup

```bash
# Install dependencies
npm install dompurify react-markdown

# Copy new files (already done)
# Files are in:
# - frontend/src/api/chat.js
# - frontend/src/hooks/useChat.jsx
# - frontend/src/components/chat/
# - frontend/src/components/state/AIChatInterface.jsx (updated)
```

---

## File Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── chat.js                 # NEW: Chat API client
│   │   └── ...
│   ├── components/
│   │   ├── chat/                   # NEW: Chat message components
│   │   │   ├── index.js
│   │   │   ├── TextMessage.jsx
│   │   │   ├── DataTableMessage.jsx
│   │   │   ├── ChartMessage.jsx
│   │   │   ├── ErrorMessage.jsx
│   │   │   └── TypingIndicator.jsx
│   │   └── state/
│   │       ├── AIChatInterface.jsx # UPDATED: Enhanced chat interface
│   │       └── ...
│   ├── hooks/
│   │   ├── useChat.jsx             # NEW: Chat context hook
│   │   └── ...
│   ├── utils/
│   │   ├── constants.js            # UPDATED: Added chat endpoints
│   │   └── ...
│   └── pages/
│       └── StateDashboard.jsx      # UPDATED: Added AI chat button
```

---

## Dependencies

### Required Packages

```bash
npm install dompurify react-markdown
```

### Optional Packages (for enhanced features)

```bash
# For better markdown rendering
npm install remark-gfm remark-breaks

# For syntax highlighting in code blocks
npm install react-syntax-highlighter
```

### Peer Dependencies (Already Installed)

- react ^18.2.0
- react-dom ^18.2.0
- @tanstack/react-query ^5.17.0
- recharts ^2.10.3
- framer-motion ^12.34.3
- lucide-react ^0.303.0

---

## Integration Steps

### Step 1: Install Dependencies

```bash
cd frontend
npm install dompurify react-markdown
```

### Step 2: Verify File Placement

Ensure all new files are in their correct locations:

```bash
# Check API client
ls -la src/api/chat.js

# Check components
ls -la src/components/chat/

# Check hooks
ls -la src/hooks/useChat.jsx

# Check updated files
ls -la src/components/state/AIChatInterface.jsx
ls -la src/pages/StateDashboard.jsx
ls -la src/utils/constants.js
```

### Step 3: Update Imports (if needed)

The files have been pre-configured with correct imports. If you encounter import errors, check:

```javascript
// In AIChatInterface.jsx
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import {
  TextMessage,
  DataTableMessage,
  ChartMessage,
  ErrorMessage,
  TypingIndicator,
} from '../chat';
```

### Step 4: Test the Integration

```bash
# Start development server
npm run dev

# Navigate to State Dashboard
# http://localhost:5173/state

# Look for "AI Assistant" button in top-right corner
```

---

## Configuration

### Feature Flags

Edit `frontend/src/api/chat.js`:

```javascript
// Enable/disable mock mode
const USE_MOCK_MODE = true;  // Set to false when backend is ready
```

### API Endpoints

Update `frontend/src/utils/constants.js`:

```javascript
export const API_ENDPOINTS = {
  // ... existing endpoints
  
  // Chat (AI Assistant)
  CHAT_SESSIONS: '/chat/sessions',
  CHAT_HISTORY: (sessionId) => `/chat/sessions/${sessionId}/messages`,
  CHAT_SEND: '/chat/message',
  CHAT_CLEAR: '/chat/history',
};
```

### Role-Based Access

The chat interface is restricted to State Officials only. To modify:

```jsx
// In AIChatInterface.jsx
const isAuthorized = hasRole(USER_ROLES.STATE_OFFICIAL);

// Add other roles if needed:
const isAuthorized = hasRole(USER_ROLES.STATE_OFFICIAL) || 
                     hasRole(USER_ROLES.LGA_COORDINATOR);
```

---

## Testing

### Unit Tests

Create `frontend/src/components/chat/__tests__/TextMessage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import TextMessage from '../TextMessage';

describe('TextMessage', () => {
  test('renders text content', () => {
    render(<TextMessage content="Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  test('sanitizes malicious content', () => {
    const malicious = '<script>alert("xss")</script>';
    render(<TextMessage content={malicious} />);
    expect(screen.queryByText('alert')).not.toBeInTheDocument();
  });
});
```

### Integration Tests

Create `frontend/src/api/__tests__/chat.test.js`:

```javascript
import { describe, test, expect, vi } from 'vitest';
import { sendMessage, getChatSessions } from '../chat';

describe('Chat API', () => {
  test('sendMessage returns formatted response', async () => {
    const response = await sendMessage('Show overview');
    expect(response.success).toBe(true);
    expect(response.data.message).toBeDefined();
  });

  test('getChatSessions returns array', async () => {
    const sessions = await getChatSessions();
    expect(Array.isArray(sessions.data?.sessions || sessions.sessions)).toBe(true);
  });
});
```

### E2E Tests

Create `frontend/e2e/chat.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Login as State Official
    await page.fill('[name="email"]', 'state.official@kaduna.gov.ng');
    await page.fill('[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/state');
  });

  test('opens AI chat interface', async ({ page }) => {
    await page.click('text=AI Assistant');
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    await expect(page.locator('text=Hello! 👋')).toBeVisible();
  });

  test('sends message and receives response', async ({ page }) => {
    await page.click('text=AI Assistant');
    await page.fill('[placeholder*="Ask me anything"]', 'Show overview');
    await page.click('text=Send');
    await expect(page.locator('text=Overview')).toBeVisible();
  });

  test('prevents access for non-state users', async ({ page, context }) => {
    // Clear auth and login as WDC Secretary
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('[name="email"]', 'wdc.chikun.barnawa@kaduna.gov.ng');
    await page.fill('[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/wdc');
    
    // Navigate to state dashboard
    await page.goto('/state');
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });
});
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Specific test
npm run test -- chat.test.jsx
```

---

## Deployment

### Build Process

```bash
# Build for production
npm run build

# Verify build output
ls -la dist/
```

### Environment Variables

Create `.env.production`:

```env
VITE_API_BASE_URL=https://kadwdc.equily.ng/api
VITE_ENABLE_AI_CHAT=true
```

### Pre-Deployment Checklist

- [ ] All dependencies installed
- [ ] All tests passing
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Accessibility checks passed
- [ ] Security audit completed

### Deployment Steps

1. **Merge Changes**
   ```bash
   git add .
   git commit -m "feat: Add AI Chat Interface for State Officials"
   git push origin main
   ```

2. **Build and Deploy**
   ```bash
   npm run build
   # Deploy dist/ folder to hosting platform
   ```

3. **Verify Deployment**
   - Login as State Official
   - Navigate to State Dashboard
   - Click "AI Assistant" button
   - Test basic queries

---

## Troubleshooting

### Common Issues

#### 1. Import Errors

**Error**: `Cannot find module '../chat'`

**Solution**:
```bash
# Verify file exists
ls -la frontend/src/components/chat/index.js

# Check case sensitivity (Linux servers)
# Ensure file is index.js not Index.js
```

#### 2. Dependencies Not Found

**Error**: `Module not found: dompurify`

**Solution**:
```bash
cd frontend
npm install dompurify react-markdown
# Restart dev server
```

#### 3. Chat Not Opening

**Error**: Clicking AI Assistant button does nothing

**Solution**:
```javascript
// Check if StateDashboard has the state
const [showAIChat, setShowAIChat] = useState(false);

// Check if button onClick is set
<Button onClick={() => setShowAIChat(true)}>AI Assistant</Button>

// Check if modal is rendered
<AIChatInterface isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
```

#### 4. Access Denied for State Officials

**Error**: State Official sees "Access Denied"

**Solution**:
```javascript
// Check role constant
console.log(USER_ROLES.STATE_OFFICIAL); // Should be 'STATE_OFFICIAL'

// Check user role
console.log(user?.role); // Should match above

// Check hasRole function
console.log(hasRole(USER_ROLES.STATE_OFFICIAL));
```

#### 5. Messages Not Sending

**Error**: Send button doesn't work

**Solution**:
```javascript
// Check input state
const [input, setInput] = useState('');

// Check send function
const handleSendMessage = async () => {
  if (!input.trim() || isTyping) return;
  // ...
};

// Check button disabled state
<button disabled={!input.trim() || isTyping}>
```

### Debug Mode

Enable verbose logging:

```javascript
// In api/chat.js
const DEBUG = true;

if (DEBUG) {
  console.log('[Chat API] Request:', message);
  console.log('[Chat API] Response:', response);
}
```

### Browser Console

Check for:
- CORS errors
- 401/403 authentication errors
- Missing chunk errors
- React key warnings

---

## Performance Optimization

### Lazy Loading

```javascript
// In StateDashboard.jsx
import { lazy, Suspense } from 'react';

const AIChatInterface = lazy(() => import('../components/state/AIChatInterface'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  {showAIChat && <AIChatInterface ... />}
</Suspense>
```

### Virtualization for Long Chat History

```bash
npm install react-window
```

```javascript
import { FixedSizeList } from 'react-window';

// In AIChatInterface render
<FixedSizeList
  height={500}
  itemCount={messages.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      {renderMessage(messages[index])}
    </div>
  )}
</FixedSizeList>
```

---

## Migration Guide

### From Old AIChatInterface

The old AIChatInterface was a simple mock chat. Migration:

1. **Backup old file**
   ```bash
   mv AIChatInterface.jsx AIChatInterface.old.jsx
   ```

2. **Copy new file**
   ```bash
   cp /path/to/new/AIChatInterface.jsx .
   ```

3. **Update imports in StateDashboard**
   ```javascript
   // Already done - AIChatInterface is imported
   ```

4. **Test thoroughly**

### Backend Integration (Future)

When backend endpoints are ready:

1. Update `frontend/src/api/chat.js`:
   ```javascript
   const USE_MOCK_MODE = false;
   ```

2. Remove localStorage usage

3. Update API calls to use real endpoints

---

## Support

For issues or questions:

1. Check this guide first
2. Review security audit document
3. Check architecture documentation
4. Contact development team

---

## Changelog

### v1.0.0 (2026-03-07)

- Initial release
- Frontend-only implementation
- Mock data mode
- Role-based access control
- XSS protection
- Data table and chart rendering

### Roadmap

- [ ] Backend API integration
- [ ] Real-time WebSocket support
- [ ] Voice input support
- [ ] Advanced analytics queries
- [ ] Multi-language support

---

*Last Updated: 2026-03-07*
