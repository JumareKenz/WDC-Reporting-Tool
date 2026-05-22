import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-accent-700" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-neutral-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
