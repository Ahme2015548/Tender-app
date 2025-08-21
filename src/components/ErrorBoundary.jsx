import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Special handling for reCAPTCHA errors - don't crash the app
    if (error && error.message && error.message.includes('_getRecaptchaConfig')) {
      console.log('🔧 [ErrorBoundary] Caught and ignored reCAPTCHA error:', error.message);
      // Reset the error boundary to prevent UI crash
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }, 100);
      return;
    }

    // You can log the error to an error reporting service here
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
          <div className="card shadow-lg" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-header bg-danger text-white text-center">
              <h4 className="mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                حدث خطأ في التطبيق
              </h4>
            </div>
            <div className="card-body text-center">
              <div className="mb-4">
                <i className="bi bi-bug fs-1 text-danger"></i>
              </div>
              <h5 className="text-danger mb-3">عذراً، حدث خطأ غير متوقع</h5>
              <p className="text-muted mb-4">
                يرجى إعادة تحميل الصفحة أو العودة إلى الصفحة الرئيسية
              </p>
              
              <div className="d-flex gap-3 justify-content-center mb-4">
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  إعادة تحميل الصفحة
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.location.href = '/'}
                >
                  <i className="bi bi-house me-2"></i>
                  العودة للرئيسية
                </button>
              </div>

              {/* Error details for debugging */}
              {this.state.error && (
                <details className="mt-4 text-start">
                  <summary className="cursor-pointer text-muted">
                    <small>تفاصيل الخطأ (للمطورين)</small>
                  </summary>
                  <div className="mt-2 p-3 bg-light rounded">
                    <pre className="text-danger small mb-2">
                      {this.state.error && this.state.error.toString()}
                    </pre>
                    <pre className="text-muted small">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;