import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import TargetDetail from './pages/TargetDetail.jsx';

function TopBar() {
  return (
    <header className="topbar">
      <Link to="/" className="topbar-wordmark">
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/targets/:id" element={<TargetDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
