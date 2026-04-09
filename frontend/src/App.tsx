import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Journals from './pages/Journals';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="main-nav">
          <Link to="/" className="nav-logo">REWIND</Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/search" className="nav-link">Search</Link>
            <Link to="/journals" className="nav-link">My Journals</Link>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/journals" element={<Journals />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;