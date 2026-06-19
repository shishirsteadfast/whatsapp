import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8" style={{ fontFamily: 'system-ui, sans-serif', color: '#374151' }}>
          <AlertCircle size={48} className="mb-4 text-red-600" />
          <h1 className="mb-2 text-2xl font-bold">{i18n.t('errorBoundary.title')}</h1>
          <p className="mb-6 text-center text-gray-500">
            {i18n.t('errorBoundary.description')}
          </p>
          <button
            onClick={this.handleReload}
            className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-blue-600 px-6 py-3 text-base text-white hover:bg-blue-700"
          >
            <RefreshCw size={18} />
            {i18n.t('errorBoundary.reload')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
