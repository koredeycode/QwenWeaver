import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ReactFlowProvider } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import { useStore } from './store/index.js';
import { AuthScreen } from './components/AuthScreen.js';
import { WorkflowDashboard } from './components/WorkflowDashboard.js';
import { CanvasWorkspace } from './components/CanvasWorkspace.js';
import { TemplateGallery } from './components/TemplateGallery.js';
import { TemplateDetailPage } from './components/TemplateDetail.js';
import { isSelfHosted, getSaaSUrl } from './lib/api-client.js';
import { SpotlightOverlay } from './tour/SpotlightOverlay.js';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function TourTrigger() {
  const startTour = useStore((s) => s.startTour);
  const isActive = useStore((s) => s.isTourActive);
  if (isActive) return null;
  return (
    <button
      onClick={startTour}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 border border-[#cbd5e1] bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-600 shadow-lg hover:bg-slate-50"
      data-tour="tour-trigger"
    >
      <HelpCircle className="h-3.5 w-3.5 text-[#ea580c]" />
      Help
    </button>
  );
}

function App() {
  if (isSelfHosted()) {
    const saasUrl = getSaaSUrl();
    return (
      <ReactFlowProvider>
        <Toaster position="top-right" />
        <SpotlightOverlay />
        <TourTrigger />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthScreen />} />
            <Route path="/register" element={<AuthScreen />} />
            <Route path="/" element={<ProtectedRoute><WorkflowDashboard /></ProtectedRoute>} />
            <Route path="/workflows/:id" element={<ProtectedRoute><CanvasWorkspace /></ProtectedRoute>} />
            <Route path="/templates" element={<Navigate to={saasUrl + '/templates'} replace />} />
            <Route path="/templates/:id" element={<Navigate to={saasUrl + '/templates/'} replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ReactFlowProvider>
    );
  }

  return (
    <ReactFlowProvider>
      <Toaster position="top-right" />
      <SpotlightOverlay />
      <TourTrigger />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/register" element={<AuthScreen />} />
          <Route path="/" element={<ProtectedRoute><WorkflowDashboard /></ProtectedRoute>} />
          <Route path="/workflows/:id" element={<ProtectedRoute><CanvasWorkspace /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><TemplateGallery /></ProtectedRoute>} />
          <Route path="/templates/:id" element={<ProtectedRoute><TemplateDetailPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ReactFlowProvider>
  );
}

export default App;
