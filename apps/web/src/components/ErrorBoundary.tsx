import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function reportError(error: Error, info: ErrorInfo) {
  console.error("[ErrorBoundary]", error, info.componentStack);
  
  if (typeof window !== "undefined" && window.navigator.sendBeacon) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };
      window.navigator.sendBeacon("/api/errors", JSON.stringify(errorData));
    } catch {
      console.error("Failed to report error to server");
    }
  }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertTriangle size={40} className="error-boundary-icon" />
            <h2>页面出现异常</h2>
            <p className="error-boundary-message">
              {this.state.error?.message ?? "未知错误"}
            </p>
            <button
              className="btn btn-primary"
              onClick={this.handleReset}
              type="button"
            >
              <RotateCcw size={14} />
              刷新重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}