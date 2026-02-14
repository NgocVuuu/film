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

  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastNotifiedEpisode: { type: String }, // Tránh spam thông báo cho cùng một tập

  updatedAt: { type: Date, default: Date.now },
});

// Text index for search
movieSchema.index({ name: 'text', origin_name: 'text', 'actor': 'text', 'director': 'text' });

// Compound indexes for performant queries
movieSchema.index({ 'category.slug': 1, updatedAt: -1 });
movieSchema.index({ 'country.slug': 1, updatedAt: -1 });
movieSchema.index({ type: 1, updatedAt: -1 });
movieSchema.index({ status: 1, updatedAt: -1 });
movieSchema.index({ chieurap: 1, updatedAt: -1 });
movieSchema.index({ view: -1 }); // Trending

module.exports = mongoose.model('Movie', movieSchema);
