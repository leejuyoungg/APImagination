const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Keys from .env
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Spotify token cache
let spotifyToken = null;
let tokenExpiry = null;

// Get Spotify Access Token
async function getSpotifyToken() {
  // Return cached token if still valid
  if (spotifyToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('✅ Using cached Spotify token');
    return spotifyToken;
  }

  console.log('');
  console.log('🔑 Getting new Spotify token...');
  console.log('Client ID:', SPOTIFY_CLIENT_ID);
  console.log('Client Secret:', SPOTIFY_CLIENT_SECRET);
  console.log('Client ID length:', SPOTIFY_CLIENT_ID?.length);
  console.log('Client Secret length:', SPOTIFY_CLIENT_SECRET?.length);

  try {
    const authString = SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    console.log('Auth string (first 20 chars):', authString.substring(0, 20) + '...');
    console.log('Base64 auth (first 20 chars):', base64Auth.substring(0, 20) + '...');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': 'Basic ' + base64Auth,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    spotifyToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    
    console.log('✅ Spotify token obtained successfully!');
    console.log('');
    return spotifyToken;
  } catch (error) {
    console.log('');
    console.error('❌ SPOTIFY AUTH FAILED!');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data);
    console.error('Full error:', error.message);
    console.log('');
    return null;
  }
}

// Get artist image from Spotify
async function getSpotifyArtistImage(artistName) {
  try {
    const token = await getSpotifyToken();
    if (!token) return null;

    // Search for artist
    const searchResponse = await axios.get(
      `https://api.spotify.com/v1/search`,
      {
        params: {
          q: artistName,
          type: 'artist',
          limit: 1
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const artists = searchResponse.data.artists.items;
    if (artists.length === 0) return null;

    const artist = artists[0];
    
    // Return images array in Last.fm format for compatibility
    if (artist.images && artist.images.length > 0) {
      return artist.images.map(img => ({
        '#text': img.url,
        size: img.height >= 300 ? 'extralarge' : img.height >= 174 ? 'large' : 'medium'
      }));
    }

    return null;
  } catch (error) {
    console.error('Spotify image fetch error:', error.message);
    return null;
  }
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// 1. Get Artist Info (Last.fm + Spotify image)
app.get('/api/artist/:name', async (req, res) => {
  try {
    const { name } = req.params;
    console.log('');
    console.log('🔍 Searching for artist:', name);
    console.log('Last.fm API Key:', LASTFM_API_KEY);
    // Get artist info from Last.fm
    const lastfmResponse = await axios.get(
      `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(name)}&api_key=${LASTFM_API_KEY}&format=json`
    );
    
    const artistData = lastfmResponse.data.artist;

    // Try to get better image from Spotify
    const spotifyImages = await getSpotifyArtistImage(name);
    
    if (spotifyImages && spotifyImages.length > 0) {
      // Replace Last.fm images with Spotify images
      artistData.image = spotifyImages;
      console.log(`✅ Using Spotify image for ${name}`);
    } else {
      console.log(`⚠️ No Spotify image found for ${name}, using Last.fm image`);
    }

    res.json({ artist: artistData });
} catch (error) {
    console.error('');
    console.error('❌ ERROR IN /api/artist/:name');
    console.error('Error message:', error.message);
    console.error('Error response status:', error.response?.status);
    console.error('Error response data:', error.response?.data);
    console.error('Error config URL:', error.config?.url);
    console.error('');
  }
});

// 2. Get Top Tracks (with Spotify URIs for playback)
app.get('/api/artist/:name/tracks', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Get tracks from Last.fm
    const lastfmResponse = await axios.get(
      `http://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(name)}&api_key=${LASTFM_API_KEY}&format=json&limit=5`
    );
    
    const tracks = lastfmResponse.data.toptracks?.track || [];
    
    // Get Spotify token
    const token = await getSpotifyToken();
    
    if (token) {
      // Add Spotify URIs to each track
      const tracksWithUris = await Promise.all(
        tracks.map(async (track) => {
          try {
            // Search for track on Spotify
            const searchResponse = await axios.get(
              `https://api.spotify.com/v1/search`,
              {
                params: {
                  q: `track:${track.name} artist:${name}`,
                  type: 'track',
                  limit: 1
                },
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            
            const spotifyTrack = searchResponse.data.tracks.items[0];
            
            return {
              ...track,
              spotify_uri: spotifyTrack?.uri || null,
              spotify_url: spotifyTrack?.external_urls?.spotify || null
            };
          } catch (error) {
            console.error(`Failed to get Spotify URI for ${track.name}`);
            return track;
          }
        })
      );
      
      res.json({ toptracks: { track: tracksWithUris } });
    } else {
      res.json(lastfmResponse.data);
    }
    
  } catch (error) {
    console.error('Error fetching tracks:', error.message);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

// 3. Get Similar Artists
app.get('/api/artist/:name/similar', async (req, res) => {
  try {
    const { name } = req.params;
    const response = await axios.get(
      `http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(name)}&api_key=${LASTFM_API_KEY}&format=json&limit=6`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching similar artists:', error.message);
    res.status(500).json({ error: 'Failed to fetch similar artists' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🎵 REWIND Backend running on http://localhost:${PORT}`);
  console.log(`✅ Last.fm API: ${LASTFM_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`✅ Spotify API: ${SPOTIFY_CLIENT_ID ? 'Configured' : 'Missing'}`);
});