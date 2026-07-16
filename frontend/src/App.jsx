import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TargetDetail from './pages/TargetDetail.jsx';
import { navigateWithTransition } from './lib/pageTransition.js';

function TopBar() {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <Link
        to="/"
        className="topbar-wordmark"
        onClick={(e) => {
          e.preventDefault();
          navigateWithTransition(navigate, '/');
        }}
      >
        <span>Sandstone</span>
        <span className="accent">Target Screener</span>
      </Link>
      <nav className="topbar-nav">
        <span>Acquisition Sourcing</span>
        <span>Internal Use Only</span>
      </nav>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/targets/:id" element={<TargetDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
