import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CampusMap from './pages/CampusMap';
import Extinguishers from './pages/Extinguishers';
import Alerts from './pages/Alerts';
import Maintenance from './pages/Maintenance';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import { ROUTE_ACCESS } from './rbac';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="map" element={<CampusMap />} />
            <Route path="extinguishers" element={<Extinguishers />} />
            <Route
              path="alerts"
              element={
                <ProtectedRoute allowedRoles={ROUTE_ACCESS['/alerts']}>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="maintenance"
              element={
                <ProtectedRoute allowedRoles={ROUTE_ACCESS['/maintenance']}>
                  <Maintenance />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
