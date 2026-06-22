import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { useStore } from './store/index.js';
import { AuthScreen } from './components/AuthScreen.js';
import { WorkflowDashboard } from './components/WorkflowDashboard.js';
import { CanvasWorkspace } from './components/CanvasWorkspace.js';

// Guard wrapper to direct unauthenticated traffic to full-screen Login routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useStore((s) => s.token);
  const mockMode = useStore((s) => s.mockMode);
  
  if (!token && !mockMode) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ReactFlowProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/register" element={<AuthScreen />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ReactFlowProvider>
  );
}

export default App;
