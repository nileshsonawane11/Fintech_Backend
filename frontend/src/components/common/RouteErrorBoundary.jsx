import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui.jsx';

export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Only capture internally, avoid noisy uncaught console crashes
    if (typeof window !== 'undefined' && window.__REPORT_ROUTE_ERROR) {
      window.__REPORT_ROUTE_ERROR(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
          <div className="rounded-full bg-danger-50 p-4 border border-danger-200 mb-5">
            <AlertTriangle className="h-8 w-8 text-danger-600" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-midnight-950 sm:text-3xl">
            Unable to load page
          </h1>
          <p className="mt-2.5 max-w-md text-sm text-ink-600 leading-relaxed">
            A temporary connection issue or updated version prevented this section from opening.
            Reloading the page will fetch the latest application state.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Reload page
            </Button>
            <Button variant="outline" onClick={this.handleHome}>
              <Home className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Return to home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RouteSuspenseFallback() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-porcelain-100" aria-busy="true" aria-label="Loading page content">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-midnight-900 border-t-transparent" />
        <span className="text-xs font-medium text-ink-500">Loading...</span>
      </div>
    </div>
  );
}

export default RouteErrorBoundary;
