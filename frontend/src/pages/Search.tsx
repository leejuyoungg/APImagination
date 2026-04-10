import { useState, useEffect } from 'react';
import axios from 'axios';

interface Artist {
  name: string;
  image: { '#text': string; size: string }[];
  stats: { listeners: string };
  bio?: { summary: string };
  tags?: { tag: { name: string }[] };
}

interface Track {
  name: string;
  duration?: string;
  playcount?: string;
  spotify_uri?: string;
  spotify_url?: string;
}

interface HistoryItem {
  artist: string;
  timestamp: string;
}

interface SongMemory {
  _id?: string;  // ADD THIS LINE
  songName: string;
  artistName: string;
  journal: string;
  addedAt: string;
}

export default function Search() {
  const [searchInput, setSearchInput] = useState('');
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [previousArtist, setPreviousArtist] = useState<string | null>(null);
  const [songMemories, setSongMemories] = useState<SongMemory[]>([]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ name: string; artist: string } | null>(null);
  const [journalText, setJournalText] = useState('');

  const BACKEND_URL = 'http://localhost:3001';

    // Load from database on mount
    useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    
    if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
    }

    // Load song memories from database
    const loadJournals = async () => {
        try {
        const response = await axios.get(`${BACKEND_URL}/api/journals`);
        setSongMemories(response.data);
        } catch (error) {
        console.error('Error loading journals:', error);
        }
    };

    loadJournals();
    }, []);

  // Search artist
  const searchArtist = async (artistName: string) => {
    if (!artistName.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Save previous artist for "Play it Again"
      if (artist) {
        setPreviousArtist(artist.name);
      }

      // Fetch artist info
      const artistResponse = await axios.get(`${BACKEND_URL}/api/artist/${artistName}`);
      const artistData = artistResponse.data.artist;

      // Fetch top tracks
      const tracksResponse = await axios.get(`${BACKEND_URL}/api/artist/${artistName}/tracks`);
      const tracksData = tracksResponse.data.toptracks?.track || [];

      setArtist(artistData);
      setTracks(tracksData.slice(0, 5));

      // Add to history
      addToHistory(artistName);

    } catch (err) {
      console.error('Error:', err);
      setError('Artist not found or API error. Try another artist!');
      setArtist(null);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  // Add to search history
  const addToHistory = (artistName: string) => {
    const newHistory: HistoryItem = {
      artist: artistName,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [newHistory, ...history.filter(h => h.artist !== artistName)].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  // Play it again (go back to previous artist)
  const playItAgain = () => {
    if (previousArtist) {
      searchArtist(previousArtist);
    }
  };

  // Format time ago
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

  // Open modal to save song memory
  const openJournalModal = (songName: string) => {
    if (!artist) return;
    setSelectedSong({ name: songName, artist: artist.name });
    setShowJournalModal(true);
    setJournalText('');
  };

// Save song memory with journal
const saveSongMemory = async () => {
  if (!selectedSong || !journalText.trim()) return;

  try {
    // Save to database
    const response = await axios.post(`${BACKEND_URL}/api/journals`, {
      songName: selectedSong.name,
      artistName: selectedSong.artist,
      journal: journalText.trim()
    });

    // Add to local state
    const updatedMemories = [response.data, ...songMemories];
    setSongMemories(updatedMemories);

    // Close modal
    setShowJournalModal(false);
    setJournalText('');
    setSelectedSong(null);
  } catch (error) {
    console.error('Error saving journal:', error);
    alert('Failed to save journal. Please try again.');
  }
};

    // Delete song memory
    const deleteSongMemory = async (id: string) => {
    try {
        await axios.delete(`${BACKEND_URL}/api/journals/${id}`);
        
        // Remove from local state
        const updatedMemories = songMemories.filter(memory => memory._id !== id);
        setSongMemories(updatedMemories);
    } catch (error) {
        console.error('Error deleting journal:', error);
        alert('Failed to delete journal. Please try again.');
    }
    };

  return (
    <div className="search-page">
      <div className="cloud cloud-1"></div>
      <div className="cloud cloud-2"></div>
      <div className="cloud cloud-3"></div>
      <div className="container">
        {/* Header */}
        <header className="header">
          <h1 className="title">REWIND</h1>
          <p className="subtitle">The soundtrack to your memories</p>
        </header>

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search artist"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchArtist(searchInput)}
          />
          <button 
            className="search-button"
            onClick={() => searchArtist(searchInput)}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Error Message */}
        {error && <div className="error">{error}</div>}

        {/* Main Content */}
        {artist && (
          <div className="content">
            {/* Left Side - Artist Info */}
            <div className="artist-section">
              <p className="section-label">NOW PLAYING</p>
              
              <div className="album-art">
                {(() => {
                  // Safely get image URL
                  let imageUrl = null;
                  
                  if (artist?.image && Array.isArray(artist.image) && artist.image.length > 0) {
                    // Try to get the largest image
                    const largeImage = artist.image.find(img => img.size === 'extralarge') || 
                                      artist.image.find(img => img.size === 'large') ||
                                      artist.image[artist.image.length - 1];
                    
                    imageUrl = largeImage?.['#text'];
                  }
                  
                  return imageUrl ? (
                    <img 
                      src={imageUrl}
                      alt={artist.name}
                    />
                  ) : (
                    <div className="no-image">
                      <span>{artist.name.charAt(0)}</span>
                    </div>
                  );
                })()}
              </div>

              <h2 className="artist-name">{artist.name}</h2>
              
              <p className="artist-stats">
                {artist.tags?.tag.slice(0, 2).map(t => t.name).join(' • ')} • {' '}
                {parseInt(artist.stats?.listeners || '0').toLocaleString()} listeners
              </p>

              {previousArtist && (
                <button 
                  className="button button-tertiary"
                  onClick={playItAgain}
                >
                  ⏮️ Play it Again: {previousArtist}
                </button>
              )}
            </div>

            {/* Right Side - Tracks, History, Favorites */}
            <div className="sidebar">
              {/* Top Tracks */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">GREATEST HITS</h3>
                <div className="tracks-list">
                  {tracks.map((track, index) => (
                    <div key={index} className="track-item">
                      <span className="track-number">{index + 1}.</span>
                      {track.spotify_url ? (
                        <a 
                          href={track.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="track-play-link"
                          title="Play in Spotify"
                        >
                          ▶
                        </a>
                      ) : (
                        <span className="track-play">▶</span>
                      )}
                      <span className="track-name">
                        {track.name}
                        <button 
                          className="save-song-btn"
                          onClick={() => openJournalModal(track.name)}
                          title="Save memory for this song"
                        >
                          💾
                        </button>
                      </span>
                      <span className="track-duration">
                        {track.duration ? Math.floor(parseInt(track.duration) / 60) + ':' + (parseInt(track.duration) % 60).toString().padStart(2, '0') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* History */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">HISTORY</h3>
                <div className="history-list">
                  {history.slice(0, 5).map((item, index) => (
                    <div 
                      key={index} 
                      className="history-item"
                      onClick={() => searchArtist(item.artist)}
                    >
                      🕐 {timeAgo(item.timestamp)}: {item.artist}
                    </div>
                  ))}
                </div>
              </div>

              {/* Song Memories */}
              {songMemories.length > 0 && (
                <div className="sidebar-section">
                  <h3 className="sidebar-title">📝 SONG JOURNALS</h3>
                  <div className="song-memories-list">
                    {songMemories.slice(0, 5).map((memory, index) => (
                      <div key={index} className="song-memory-item">
                        <div className="song-memory-header">
                          <span className="song-memory-name">"{memory.songName}"</span>
                          <button 
                        className="remove-button"
                        onClick={() => deleteSongMemory(memory._id!)}  // Changed from index
                        >
                        🗑️
                        </button>
                        </div>
                        <p className="song-memory-artist">{memory.artistName}</p>
                        <p className="song-memory-journal">{memory.journal}</p>
                        <p className="song-memory-date">{timeAgo(memory.addedAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}              
            </div>
          </div>
        )}

        {/* Empty State */}
        {!artist && !loading && !error && (
          <div className="empty-state">
            <p>🎵 Rewind to your musical past...</p>
          </div>
        )}
      </div>

      {/* Journal Modal */}
      {showJournalModal && (
        <div className="modal-overlay" onClick={() => setShowJournalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">💜 Save Memory</h2>
            <p className="modal-song-name">"{selectedSong?.name}"</p>
            <p className="modal-artist-name">by {selectedSong?.artist}</p>
            
            <textarea
              className="journal-textarea"
              placeholder="What does this song mean to you? Write your memory here..."
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              autoFocus
            />
            
            <div className="modal-buttons">
              <button 
                className="button button-primary"
                onClick={saveSongMemory}
                disabled={!journalText.trim()}
              >
                💾 Save Memory
              </button>
              <button 
                className="button button-secondary"
                onClick={() => setShowJournalModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}