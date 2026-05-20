/**
 * useAuth — Re-export from AuthContext
 * 
 * This file maintains backward compatibility for existing imports.
 * The actual implementation is now in contexts/AuthContext.jsx
 * 
 * DEPRECATED: Import from '../contexts/AuthContext' instead
 */

export { useAuth, AuthProvider, withAuth } from '../contexts/AuthContext';
