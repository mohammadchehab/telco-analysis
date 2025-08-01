import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Capabilities from './pages/Capabilities';
import DomainManagement from './pages/DomainManagement';
import AttributeManagement from './pages/AttributeManagement';
import Workflow from './pages/Workflow';
import Analysis from './pages/Analysis';
import Reports from './pages/Reports';
import Database from './pages/Database';
import NotificationSystem from './components/UI/NotificationSystem';
import LoadingOverlay from './components/UI/LoadingOverlay';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const authStatus = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Provider store={store}>
        <LoadingOverlay />
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      <Router>
        {isAuthenticated ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/capabilities" element={<Capabilities />} />
              <Route path="/capabilities/:capabilityId" element={<Capabilities />} />
              <Route path="/capabilities/:capabilityId/domains" element={<DomainManagement />} />
              <Route path="/capabilities/:capabilityId/attributes" element={<AttributeManagement />} />
              <Route path="/workflow" element={<Workflow />} />
              <Route path="/workflow/:capabilityId" element={<Workflow />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/analysis/:capabilityName" element={<Analysis />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/database" element={<Database />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
        <NotificationSystem />
        <LoadingOverlay />
      </Router>
    </Provider>
  );
}

export default App;
