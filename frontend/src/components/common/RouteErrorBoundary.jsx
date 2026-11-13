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
    console.error('[RouteErrorBoundary caught error]:', error, errorInfo);
    if (typeof window !== 'undefined') {
      window.__lastRouteError = { error, errorInfo, message: error?.message, stack: error?.stack };
      if (window.__REPORT_ROUTE_ERROR) {
        window.__REPORT_ROUTE_ERROR(error, errorInfo);
      }
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

export class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[SectionErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center my-4" role="alert">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-3">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-ink-900">
            {this.props.title || 'Unable to load section'}
          </h3>
          <p className="mt-1 text-sm text-ink-600 max-w-md mx-auto">
            This section encountered an issue while rendering. Other sections remain available.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Try again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export class ModalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[ModalErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center" role="alert">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-4">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-ink-900">Unable to load form</h3>
          <p className="mt-2 text-sm text-ink-600 max-w-sm mx-auto">
            An unexpected error occurred while loading this dialog. Please close and try again.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={this.props.onClose}>
              Close
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
