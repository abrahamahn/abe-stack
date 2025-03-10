/**
 * This file documents the relationships between models.
 * 
 * Note: We're using raw SQL with PostgreSQL repositories instead of Sequelize ORM.
 * These relationships are documented here for reference only and are implemented
 * in the respective repository classes using SQL queries.
 */

// User relationships
// - User has many Posts
// - User has many Comments
// - User has many Likes
// - User has many Playlists
// - User has many Follows (as follower)
// - User has many Follows (as following)
// - User has one TwoFactorAuth

// Post relationships
// - Post belongs to User
// - Post has many Comments
// - Post has many Likes

// Comment relationships
// - Comment belongs to User
// - Comment belongs to Post
// - Comment has many CommentLikes

// Like relationships
// - Like belongs to User
// - Like belongs to Post

// CommentLike relationships
// - CommentLike belongs to User
// - CommentLike belongs to Comment

// Follow relationships
// - Follow belongs to User (as follower)
// - Follow belongs to User (as following)

// Track relationships
// - Track belongs to Artist
// - Track belongs to Album (optional)
// - Track belongs to many Playlists (through PlaylistTrack)

// Album relationships
// - Album belongs to Artist
// - Album has many Tracks

// Playlist relationships
// - Playlist belongs to User
// - Playlist has many Tracks (through PlaylistTrack)

// PlaylistTrack relationships
// - PlaylistTrack belongs to Playlist
// - PlaylistTrack belongs to Track

// Artist relationships
// - Artist has many Albums
// - Artist has many Tracks

// Media relationships
// - Media belongs to User

// TwoFactorAuth relationships
// - TwoFactorAuth belongs to User

// Export an empty object to satisfy the import
export default {}; 