# Kaduna State WDC Digital Reporting System - Frontend

Modern, responsive React frontend for the KADUNA STATE Ward Development Committee Digital Reporting System.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **TanStack Query (React Query)** - Server state management
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Recharts** - Charting library

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.js              # Axios instance with interceptors
│   ├── components/
│   │   └── common/
│   │       ├── Alert.jsx          # Alert/notification components
│   │       ├── Button.jsx         # Reusable button component
│   │       ├── Card.jsx           # Card components
│   │       ├── Layout.jsx         # Main layout with sidebar
│   │       ├── LoadingSpinner.jsx # Loading indicators
│   │       ├── Modal.jsx          # Modal dialog components
│   │       └── Navbar.jsx         # Top navigation bar
│   ├── hooks/
│   │   └── useAuth.js             # Authentication hook & context
│   ├── pages/
│   │   └── Login.jsx              # Login page
│   ├── utils/
│   │   ├── constants.js           # App constants
│   │   └── formatters.js          # Formatting utilities
│   ├── App.jsx                    # Main app component with routes
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Global styles & Tailwind
├── public/                        # Static assets
├── index.html                     # HTML template
├── package.json                   # Dependencies
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
└── postcss.config.js              # PostCSS configuration
```

## Design System

### Color Palette

The application uses a professional green color scheme representing Kaduna State and Nigeria:

**Primary Colors (Green)**
- primary-50 to primary-900
- Main brand color: `primary-600` (#16a34a)

**Status Colors**
- Success: Green
- Warning: Yellow
- Error: Red
- Info: Blue

**Neutral Grays**
- neutral-50 to neutral-900
- Used for text, backgrounds, and borders

### Typography

- Font Family: System font stack (sans-serif)
- Headings: Semibold weight
- Body: Regular weight
- All text is properly sized for mobile and desktop

### Components

All components follow a consistent design pattern:

1. **Buttons** - Multiple variants (primary, secondary, outline, ghost, danger, success)
2. **Cards** - Clean, shadowed containers with optional headers/footers
3. **Modals** - Centered dialogs with backdrop
4. **Alerts** - Color-coded notifications (success, error, warning, info)
5. **Forms** - Styled inputs with focus states and validation

### Spacing & Layout

- Mobile-first responsive design
- Consistent padding/margin scale
- Grid and flexbox layouts
- Max-width containers for readability

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the frontend directory (optional):

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

If not provided, defaults to `http://localhost:8000/api`

## Features Implemented

### Authentication

- Login page with email/password
- Demo credentials for quick access
- JWT token management
- Protected routes based on user roles
- Auto-redirect based on user role

### User Roles

Three user types with role-based access:

1. **WDC Secretary** - Submit and manage ward reports
2. **LGA Coordinator** - Monitor wards and review reports
3. **State Official** - State-wide analytics and oversight

### Navigation

- Responsive sidebar navigation
- Role-based menu items
- Mobile-friendly with hamburger menu
- Active route highlighting

### Common Components

All reusable UI components are built with:
- Consistent styling
- Accessibility features
- Loading states
- Error handling
- Mobile responsiveness

## Demo Credentials

### WDC Secretary
- Email: `wdc.chikun.barnawa@kaduna.gov.ng`
- Password: `demo123`

### LGA Coordinator
- Email: `coord.chikun@kaduna.gov.ng`
- Password: `demo123`

### State Official
- Email: `state.official@kaduna.gov.ng`
- Password: `demo123`

## API Integration

The frontend is configured to work with the FastAPI backend:

- Base URL: `http://localhost:8000/api`
- Authentication: JWT Bearer token
- Error handling: Global interceptors
- Request/Response format: Standardized

### API Client Features

- Automatic token injection
- Global error handling
- Request/response interceptors
- File upload support
- Download file helper
- Query string builder

## Development

### Running the App

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Code Standards

### Component Structure

```jsx
import { useState } from 'react';
import { ComponentIcon } from 'lucide-react';

const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);

  return (
    <div className="...">
      {/* Component content */}
    </div>
  );
};

export default MyComponent;
```

### Styling Conventions

- Use Tailwind utility classes
- Custom styles in index.css using @layer
- Responsive modifiers (sm:, md:, lg:, xl:)
- Semantic color usage (primary, success, error, etc.)

### File Naming

- Components: PascalCase (e.g., `Button.jsx`)
- Utilities: camelCase (e.g., `formatters.js`)
- Constants: camelCase (e.g., `constants.js`)

## Next Steps

The infrastructure is complete. Next phase:

1. **WDC Secretary Dashboard** - Report submission and management
2. **LGA Coordinator Dashboard** - Ward monitoring and report review
3. **State Official Dashboard** - Analytics and state-wide oversight

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus states
- Screen reader friendly

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Port already in use

If port 5173 is already in use:

```bash
# Kill the process or change the port in vite.config.js
```

### API connection errors

Ensure the backend is running on `http://localhost:8000`

### Build errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## License

Kaduna State Government - Official Use Only

## Support

For technical support, contact: support@kaduna.gov.ng
