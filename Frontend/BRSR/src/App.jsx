import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ModuleView from './pages/ModuleView';
import PlantsPage from './pages/PlantsPage';
import PlantDetails from '../Environment/components/PlantDetails';
import DynamicPageRenderer from './dynamic-pages';
import Plants from '../Environment/Pages/Plants';
import EnvironmentContent from '../Environment/components/EnvironmentContent';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports/:reportId" 
            element={
              <ProtectedRoute>
                <ModuleView />
              </ProtectedRoute>
            } 
          />




          <Route 
            path="/plants/:moduleId/:plantId" 
            element={
              <ProtectedRoute>
                <PlantDetails />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/reports/:reportId/modules/:moduleId" 
            element={
              <ProtectedRoute>
                <DynamicPageRenderer />
              </ProtectedRoute>
            } 
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

          <Route 
            path="/plants" 
            element={
              <ProtectedRoute>
                <Plants />
              </ProtectedRoute>
            } 
          />

          {/* New route for environment content with plant ID */}
          <Route 
            path="/environment/:plantId" 
            element={
              <ProtectedRoute>
                <EnvironmentContent />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;