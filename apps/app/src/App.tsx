import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ReactFlowProvider } from '@xyflow/react';
import { useStore } from './store/index.js';
import { SignInScreen } from './components/SignInScreen.js';
import { SignUpScreen } from './components/SignUpScreen.js';
import { WorkflowDashboard } from './components/WorkflowDashboard.js';
import { CanvasWorkspace } from './components/CanvasWorkspace.js';
import { TemplateGallery } from './components/TemplateGallery.js';
import { TemplateDetailPage } from './components/TemplateDetail.js';
import { SpotlightOverlay } from './tour/SpotlightOverlay.js';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useStore((s) => s.user);
  const authLoading = useStore((s) => s.authLoading);
  if (authLoading) return <div className="w-screen h-screen bg-white" />;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ReactFlowProvider>
      <Toaster position="top-right" />
      <SpotlightOverlay />
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignInScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          {/* Legacy redirects */}
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
    </ReactFlowProvider>
  );
}

export default App;
