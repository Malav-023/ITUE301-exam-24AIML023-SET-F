import { Component } from 'react';
import { logger } from '../utils/logger';

/** Catches render-time crashes so the whole app doesn't go blank, and logs them. */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logger.error('React render error', { message: error.message, stack: error.stack, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="container">
        <div className="alert alert--error" role="alert">
          <div>
            <strong>Something went wrong on this page.</strong>
            <div className="alert__ref">Details were written to the browser console.</div>
          </div>
          <button type="button" className="btn btn--sm" onClick={() => window.location.assign('/events')}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
