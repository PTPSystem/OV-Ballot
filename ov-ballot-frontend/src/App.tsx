import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import JudgePage from './pages/JudgePage';
import AdminPage from './pages/AdminPage';
import MagicLinkPage from './pages/MagicLinkPage';
import ClosedPage from './pages/ClosedPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Judge Routes (default) */}
          <Route path="/" element={<JudgePage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={<AdminPage />} />
          
          {/* Magic Link Routes */}
          <Route path="/ballots/:token" element={<MagicLinkPage />} />
          
          {/* Closed Tournament Page */}
          <Route path="/closed" element={<ClosedPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
