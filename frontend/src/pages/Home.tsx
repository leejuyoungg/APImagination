export default function Home() {
  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-title">REWIND</h1>
        <p className="home-subtitle">Rediscover the soundtrack of your life</p>
        <p className="home-description">
          Travel back through time with the music that shaped you. 
          Search for artists, discover their greatest hits, and save 
          your personal memories with each song.
        </p>
        <a href="/search" className="home-cta-button">
          Start Your Journey
        </a>
      </div>
      
      <div className="home-features">
        <div className="feature-card">
          <h3>Discover Music</h3>
          <p>Search any artist and explore their top tracks</p>
        </div>
        
        <div className="feature-card">
          <h3>Write Memories</h3>
          <p>Save personal journal entries for your favorite songs</p>
        </div>
        
        <div className="feature-card">
          <h3>Rewind History</h3>
          <p>Track your musical journey through time</p>
        </div>
      </div>
    </div>
  );
}