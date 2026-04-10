const mongoose = require('mongoose');

const songMemorySchema = new mongoose.Schema({
  songName: {
    type: String,
    required: true
  },
  artistName: {
    type: String,
    required: true
  },
  journal: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SongMemory', songMemorySchema);