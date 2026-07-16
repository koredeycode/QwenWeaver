import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useStore } from './store/index.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

const lazyNamed = <T extends React.ComponentType<any>>(
  imp: () => Promise<{ [key: string]: T }>,
  name: string,
) => lazy(() => imp().then((m) => ({ default: m[name] })));

const SignInScreen = lazyNamed(() => import('./components/SignInScreen.js'), 'SignInScreen');
const SignUpScreen = lazyNamed(() => import('./components/SignUpScreen.js'), 'SignUpScreen');
const WorkflowDashboard = lazyNamed(
  () => import('./components/WorkflowDashboard.js'),
  'WorkflowDashboard',
);
const CanvasWorkspace = lazyNamed(
  () => import('./components/CanvasWorkspace.js'),
  'CanvasWorkspace',
);
const TemplateGallery = lazyNamed(
  () => import('./components/TemplateGallery.js'),
  'TemplateGallery',
);
const TemplateDetailPage = lazyNamed(
  () => import('./components/TemplateDetail.js'),
  'TemplateDetailPage',
);
const SpotlightOverlay = lazyNamed(() => import('./tour/SpotlightOverlay.js'), 'SpotlightOverlay');

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useStore((s) => s.user);
  const authLoading = useStore((s) => s.authLoading);
  if (authLoading) return <div className="w-screen h-screen bg-white" />;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <ErrorBoundary>
        <Suspense fallback={<div className="w-screen h-screen bg-white" />}>
          <SpotlightOverlay />
          <BrowserRouter>
            <Routes>
              <Route path="/signin" element={<SignInScreen />} />
              <Route path="/signup" element={<SignUpScreen />} />
              <Route path="/login" element={<Navigate to="/signin" replace />} />
              <Route path="/register" element={<Navigate to="/signup" replace />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <WorkflowDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workflows/:id"
                element={
                  <ProtectedRoute>
                    <CanvasWorkspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/templates"
                element={
                  <ProtectedRoute>
                    <TemplateGallery />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/templates/:id"
                element={
                  <ProtectedRoute>
                    <TemplateDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
