import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import Login from './pages/Login';
import AutoLogin from './pages/AutoLogin';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import GenerateInvoicePage from './pages/GenerateInvoicePage';
import EditInvoicePage from './pages/EditInvoicePage';
import LetterHeadPage from './pages/LetterHeadPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/auto-login" element={<AutoLogin />} />

        {/* ── Protected Dashboard ── */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Default redirect: /dashboard → /dashboard/invoice */}
          <Route index element={<Navigate to="invoice" replace />} />
          <Route path="invoice"      element={<GenerateInvoicePage />} />
          <Route path="edit-invoice" element={<EditInvoicePage />} />
          <Route path="letterhead"   element={<LetterHeadPage />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
