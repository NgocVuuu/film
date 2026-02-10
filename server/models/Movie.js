const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  name: { type: String, required: true },
  origin_name: { type: String },
  slug: { type: String, required: true, unique: true, index: true },
  content: { type: String },
  type: { type: String }, // 'series', 'single', 'hoathinh', 'tvshows'
  status: { type: String }, // 'completed', 'ongoing'
  thumb_url: { type: String },
  poster_url: { type: String },
  is_copyright: { type: Boolean, default: false },
  sub_docquyen: { type: Boolean, default: false },
  chieurap: { type: Boolean, default: false },
  trailer_url: { type: String },
  time: { type: String },
  episode_current: { type: String },
  episode_total: { type: String },
  quality: { type: String },
  lang: { type: String },
  notify: { type: String },
  showtimes: { type: String },
  year: { type: Number },
  view: { type: Number, default: 0 },
  rating_average: { type: Number, default: 0 }, // 0-10 scale
  rating_count: { type: Number, default: 0 },

  // Array types
  actor: [{ type: String }],
  director: [{ type: String }],
  category: [{
    id: String,
    name: String,
    slug: String
  }],
  country: [{
    id: String,
    name: String,
    slug: String
  }],

  // Episodes
  episodes: [
    {
      server_name: String,
      server_data: [
        {
          name: String,
          slug: String,
          filename: String,
          link_embed: String,
          link_m3u8: String,
        },
      ],
    },
  ],

  updatedAt: { type: Date, default: Date.now },
});

// Text index for search
movieSchema.index({ name: 'text', origin_name: 'text', 'actor': 'text', 'director': 'text' });

module.exports = mongoose.model('Movie', movieSchema);
