import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CampusMap from './pages/CampusMap';
import Extinguishers from './pages/Extinguishers';
import Alerts from './pages/Alerts';
import Maintenance from './pages/Maintenance';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="map" element={<CampusMap />} />
            <Route path="extinguishers" element={<Extinguishers />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
