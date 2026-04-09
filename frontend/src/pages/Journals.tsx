import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface SongMemory {
  songName: string;
  artistName: string;
  journal: string;
  addedAt: string;
}

export default function Journals() {
  const [songMemories, setSongMemories] = useState<SongMemory[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('songMemories');
    if (saved) {
      setSongMemories(JSON.parse(saved));
    }
  }, []);

  const deleteSongMemory = (index: number) => {
    const updated = songMemories.filter((_, i) => i !== index);
    setSongMemories(updated);
    localStorage.setItem('songMemories', JSON.stringify(updated));
  };

  const timeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="journals-page">
      <div className="cloud cloud-1"></div>
      <div className="cloud cloud-2"></div>
      <div className="cloud cloud-3"></div>
      
      <div className="container">
        <header className="header">
          <h1 className="title">MY JOURNALS</h1>
          <p className="subtitle">All your musical memories in one place</p>
        </header>

        <Link to="/search" className="back-button">
          ← Back to Search
        </Link>

        {songMemories.length === 0 ? (
          <div className="empty-journals">
            <p>📝 No journal entries yet!</p>
            <p>Search for artists and save memories for your favorite songs.</p>
            <Link to="/search" className="button button-primary">
              Start Searching
            </Link>
          </div>
        ) : (
          <div className="journals-grid">
            {songMemories.map((memory, index) => (
              <div key={index} className="journal-card">
                <div className="journal-header">
                  <h3 className="journal-song-name">"{memory.songName}"</h3>
                  <button 
                    className="delete-journal-btn"
                    onClick={() => deleteSongMemory(index)}
                  >
                    🗑️
                  </button>
                </div>
                <p className="journal-artist">{memory.artistName}</p>
                <p className="journal-text">{memory.journal}</p>
                <p className="journal-date">{timeAgo(memory.addedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}