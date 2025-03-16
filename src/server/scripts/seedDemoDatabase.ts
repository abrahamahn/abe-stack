import { randomUUID } from 'crypto';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';


// Configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'abe_stack',
  migrationsPath: join(__dirname, '../database/migrations')
};

console.log('Database connection configuration:');
console.log(`- Host: ${config.host}`);
console.log(`- Port: ${config.port}`);
console.log(`- User: ${config.user}`);
console.log(`- Password: ${config.password ? '********' : 'not set'}`);
console.log(`- Target database: ${config.database}`);
console.log('');
console.log('If these settings are incorrect, you can set them using environment variables:');
console.log('DB_HOST, DB_PORT, DB_USER, DB_PASSWORD');
console.log('');
console.log('For example:');
console.log('  Windows PowerShell: $env:DB_USER="your_username"; $env:DB_PASSWORD="your_password"; npm run seed:demo');
console.log('  Windows CMD: set DB_USER=your_username && set DB_PASSWORD=your_password && npm run seed:demo');
console.log('  Linux/macOS: DB_USER=your_username DB_PASSWORD=your_password npm run seed:demo');
console.log('');

// Demo users data
const demoUsers = [
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
    displayName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Software developer and tech enthusiast',
    profileImage: 'https://randomuser.me/api/portraits/men/1.jpg',
    role: 'user'
  },
  {
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'password123',
    displayName: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    bio: 'UX Designer | Coffee lover',
    profileImage: 'https://randomuser.me/api/portraits/women/1.jpg',
    role: 'user'
  },
  {
    username: 'alexsmith',
    email: 'alex@example.com',
    password: 'password123',
    displayName: 'Alex Smith',
    firstName: 'Alex',
    lastName: 'Smith',
    bio: 'Photographer and traveler',
    profileImage: 'https://randomuser.me/api/portraits/men/2.jpg',
    role: 'user'
  },
  {
    username: 'sarahwilson',
    email: 'sarah@example.com',
    password: 'password123',
    displayName: 'Sarah Wilson',
    firstName: 'Sarah',
    lastName: 'Wilson',
    bio: 'Digital marketer and content creator',
    profileImage: 'https://randomuser.me/api/portraits/women/2.jpg',
    role: 'user'
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    displayName: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    bio: 'System administrator',
    profileImage: 'https://randomuser.me/api/portraits/men/3.jpg',
    role: 'admin'
  }
];

// Sample posts data (will be populated with user IDs after user creation)
const demoPosts = [
  {
    content: 'Just finished working on a new project with React and TypeScript. Loving the type safety!',
    media: null
  },
  {
    content: 'Check out this amazing sunset I captured yesterday!',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1566045638022-8e4465a89acc',
      thumbnail: 'https://images.unsplash.com/photo-1566045638022-8e4465a89acc?w=300'
    }
  },
  {
    content: 'Learning about PostgreSQL and database optimization today. Any good resources to recommend?',
    media: null
  },
  {
    content: 'Just released my new portfolio website. Would love some feedback!',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300'
    }
  },
  {
    content: 'Excited to announce that I\'ll be speaking at the upcoming tech conference next month!',
    media: null
  }
];

// Main function to seed the database
async function seedDatabase() {
  console.log('Starting database seeding process...');
  
  // Connect to PostgreSQL server (without specifying a database)
  const serverPool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres' // Connect to default postgres database first
  });
  
  try {
    console.log('Connecting to PostgreSQL server...');
    
    // Test connection
    await serverPool.query('SELECT 1');
    console.log('Successfully connected to PostgreSQL server.');
    
    // Check if demo database exists
    const dbCheckResult = await serverPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [config.database]
    );
    
    // Create database if it doesn't exist
    if (dbCheckResult.rows.length === 0) {
      console.log(`Creating database: ${config.database}`);
      await serverPool.query(`CREATE DATABASE ${config.database}`);
    } else {
      console.log(`Database ${config.database} already exists`);
    }
  } catch (error: unknown) {
    console.error('Error connecting to PostgreSQL server:');
    const pgError = error as { code?: string };
    if (pgError.code === '28P01') {
      console.error('Authentication failed. Please check your PostgreSQL username and password.');
      console.error('You can set them using environment variables DB_USER and DB_PASSWORD.');
      console.error('\nFor example:');
      console.error('  Windows PowerShell: $env:DB_USER="your_username"; $env:DB_PASSWORD="your_password"; npm run seed:demo');
      console.error('  Windows CMD: set DB_USER=your_username && set DB_PASSWORD=your_password && npm run seed:demo');
      console.error('  Linux/macOS: DB_USER=your_username DB_PASSWORD=your_password npm run seed:demo');
    } else if (pgError.code === 'ECONNREFUSED') {
      console.error('Connection refused. Please check if PostgreSQL is running and accessible.');
      console.error('You can set the host and port using environment variables DB_HOST and DB_PORT.');
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  } finally {
    // Close server connection
    await serverPool.end();
  }
  
  // Connect to the demo database
  const dbPool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
  });
  
  try {
    // Create migrations table if it doesn't exist
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of executed migrations
    const migrationsResult = await dbPool.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY id ASC'
    );
    const executedMigrations = migrationsResult.rows.map(row => row.name);
    
    // Get list of migration files
    const files = await readdir(config.migrationsPath);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
    
    // Run pending migrations
    for (const file of sqlFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`Running migration: ${file}`);
        const filePath = join(config.migrationsPath, file);
        const sql = await readFile(filePath, 'utf8');
        
        const client = await dbPool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`Migration completed: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error executing migration ${file}:`, error);
          throw error;
        } finally {
          client.release();
        }
      } else {
        console.log(`Migration already executed: ${file}`);
      }
    }
    
    // Check if users already exist
    const usersResult = await dbPool.query<{ count: string }>('SELECT COUNT(*) FROM users');
    const userCount = parseInt(usersResult.rows[0].count);
    
    if (userCount > 0) {
      console.log(`Database already has ${userCount} users. Skipping demo data insertion.`);
      console.log('If you want to reset the demo data, drop the database and run this script again.');
      return;
    }
    
    // Insert demo users
    console.log('Inserting demo users...');
    const userIds = [];
    
    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const userId = randomUUID();
      
      await dbPool.query(
        `INSERT INTO users (
          id, username, email, password, display_name, first_name, last_name, bio, profile_image, role
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          user.username,
          user.email,
          hashedPassword,
          user.displayName,
          user.firstName,
          user.lastName,
          user.bio,
          user.profileImage,
          user.role
        ]
      );
      
      userIds.push(userId);
      console.log(`Created user: ${user.username} (${userId})`);
    }
    
    // Check if follows table exists
    try {
      await dbPool.query('SELECT 1 FROM follows LIMIT 1');
      
      // Create follow relationships
      console.log('Creating follow relationships...');
      
      // Each user follows some other users
      for (let i = 0; i < userIds.length; i++) {
        for (let j = 0; j < userIds.length; j++) {
          // Don't follow self and don't have everyone follow everyone
          if (i !== j && Math.random() > 0.3) {
            await dbPool.query(
              'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
              [userIds[i], userIds[j]]
            );
          }
        }
      }
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '42P01') { // relation does not exist
        console.log('Follows table does not exist. Skipping follow relationships.');
        console.log('Please run the migration to create social tables first.');
      } else {
        throw error;
      }
    }
    
    // Check if posts table exists
    try {
      await dbPool.query('SELECT 1 FROM posts LIMIT 1');
      
      // Insert demo posts
      console.log('Inserting demo posts...');
      const postIds = [];
      
      for (let i = 0; i < demoPosts.length; i++) {
        // Assign posts to random users
        const userIndex = Math.floor(Math.random() * userIds.length);
        const userId = userIds[userIndex];
        const post = demoPosts[i];
        const postId = randomUUID();
        
        await dbPool.query(
          `INSERT INTO posts (
            id, user_id, content, media_type, media_url, media_thumbnail
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            postId,
            userId,
            post.content,
            post.media?.type || null,
            post.media?.url || null,
            post.media?.thumbnail || null
          ]
        );
        
        postIds.push(postId);
        console.log(`Created post by user ${userIds[userIndex]}`);
      }
      
      // Check if likes table exists
      try {
        await dbPool.query('SELECT 1 FROM likes LIMIT 1');
        
        // Create likes on posts
        console.log('Creating likes on posts...');
        
        for (const userId of userIds) {
          for (const postId of postIds) {
            // Not everyone likes every post
            if (Math.random() > 0.4) {
              await dbPool.query(
                'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
                [userId, postId]
              );
            }
          }
        }
      } catch (error: unknown) {
        const pgError = error as { code?: string };
        if (pgError.code === '42P01') { // relation does not exist
          console.log('Likes table does not exist. Skipping likes creation.');
          console.log('Please run the migration to create social tables first.');
        } else {
          throw error;
        }
      }
      
      // Check if comments table exists
      try {
        await dbPool.query('SELECT 1 FROM comments LIMIT 1');
        
        // Create comments on posts
        console.log('Creating comments on posts...');
        const comments = [
          'Great post!',
          'Thanks for sharing this.',
          'I completely agree with you.',
          'Interesting perspective!',
          'This is really helpful.',
          'Looking forward to more content like this.',
          'I had a similar experience recently.',
          'What tools did you use for this?',
          'Awesome work!',
          'This is exactly what I needed to see today.'
        ];
        
        for (const postId of postIds) {
          // Add 1-3 comments per post
          const commentCount = Math.floor(Math.random() * 3) + 1;
          
          for (let i = 0; i < commentCount; i++) {
            const userIndex = Math.floor(Math.random() * userIds.length);
            const userId = userIds[userIndex];
            const commentIndex = Math.floor(Math.random() * comments.length);
            const content = comments[commentIndex];
            const commentId = randomUUID();
            
            await dbPool.query(
              `INSERT INTO comments (
                id, post_id, user_id, content
              ) VALUES ($1, $2, $3, $4)`,
              [commentId, postId, userId, content]
            );
          }
        }
      } catch (error: unknown) {
        const pgError = error as { code?: string };
        if (pgError.code === '42P01') { // relation does not exist
          console.log('Comments table does not exist. Skipping comments creation.');
          console.log('Please run the migration to create social tables first.');
        } else {
          throw error;
        }
      }
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '42P01') { // relation does not exist
        console.log('Posts table does not exist. Skipping posts, likes, and comments creation.');
        console.log('Please run the migration to create social tables first.');
      } else {
        throw error;
      }
    }
    
    console.log('Database seeding completed successfully!');
    console.log('\nDemo accounts:');
    demoUsers.forEach(user => {
      console.log(`- Username: ${user.username}, Password: ${user.password}, Role: ${user.role}`);
    });
    
  } catch (error: unknown) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await dbPool.end();
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('Seed script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  }); 