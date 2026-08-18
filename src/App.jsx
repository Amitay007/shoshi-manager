import React from 'react'
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// TEMP DIAGNOSTIC ONLY - added to surface a silent blank-screen crash on /Programs.
// Does not touch any business logic, data, or schema. Safe to remove any time.
class DiagnosticErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('DiagnosticErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ direction: 'ltr', textAlign: 'left', padding: 24, fontFamily: 'monospace', background: '#fff0f0', color: '#7a0000', minHeight: '100vh', whiteSpace: 'pre-wrap' }}>
          <h2 style={{ marginTop: 0 }}>Diagnostic: caught a render error</h2>
          <div><strong>Message:</strong> {String(this.state.error && this.state.error.message)}</div>
          <div style={{ marginTop: 12 }}><strong>Stack:</strong></div>
          <div>{this.state.error && this.state.error.stack}</div>
          {this.state.info && (
            <>
              <div style={{ marginTop: 12 }}><strong>Component stack:</strong></div>
              <div>{this.state.info.componentStack}</div>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <DiagnosticErrorBoundary>
            <AuthenticatedApp />
          </DiagnosticErrorBoundary>
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
