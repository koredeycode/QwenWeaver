import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Home } from './pages/Home.js';
import { Pricing } from './pages/Pricing.js';
import { DocsLayout } from './docs/DocsLayout.js';
import { Overview } from './docs/pages/Overview.js';
import { GettingStarted } from './docs/pages/GettingStarted.js';
import { WorkflowGuide } from './docs/pages/WorkflowGuide.js';
import { NodeTypes } from './docs/pages/NodeTypes.js';
import { MCPIntegration } from './docs/pages/MCPIntegration.js';
import { APIReference } from './docs/pages/APIReference.js';
import { Architecture } from './docs/pages/Architecture.js';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />

          <Route
            path="/docs"
            element={
              <DocsLayout>
                <Overview />
              </DocsLayout>
            }
          />
          <Route
            path="/docs/getting-started"
            element={
              <DocsLayout>
                <GettingStarted />
              </DocsLayout>
            }
          />
          <Route
            path="/docs/workflow-guide"
            element={
              <DocsLayout>
                <WorkflowGuide />
              </DocsLayout>
            }
          />
          <Route
            path="/docs/node-types"
            element={
              <DocsLayout>
                <NodeTypes />
              </DocsLayout>
            }
          />
          <Route
            path="/docs/mcp"
            element={
              <DocsLayout>
                <MCPIntegration />
              </DocsLayout>
            }
          />
          <Route
            path="/docs/api"
            element={
              <DocsLayout>
                <APIReference />
              </DocsLayout>
            }
          />
          <Route
            path="/docs/architecture"
            element={
              <DocsLayout>
                <Architecture />
              </DocsLayout>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
