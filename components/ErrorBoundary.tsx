import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Something went wrong</h2>
              <p className="text-sm text-slate-500">
                An unexpected error occurred. Please try again or go back to the home page.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Home size={16} />
                <span>Go Home</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RotateCcw size={16} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
