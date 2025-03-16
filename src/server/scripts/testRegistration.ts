import { DatabaseConnectionManager } from '../database/config';
import { AuthService } from '../services/AuthService';
import { Database } from '../services/Database';

interface RegistrationResult {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  email_confirmed: boolean;
}

async function testRegistration() {
  console.log('Testing user registration...');
  
  try {
    // Initialize DatabaseConnectionManager
    await DatabaseConnectionManager.initialize();
    console.log('DatabaseConnectionManager initialized successfully');
    
    // Initialize database connection
    const db = new Database('./db');
    await db.initialize();
    
    // Create AuthService instance
    const authService = AuthService.getInstance();
    
    // Test user data
    const testUser = {
      username: 'testuser' + Date.now(),
      email: `testuser${Date.now()}@example.com`,
      password: 'password123',
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User'
    };
    
    console.log('Registering test user:', testUser.username, testUser.email);
    
    // Register the user
    const result = await authService.register(testUser) as RegistrationResult;
    
    console.log('Registration successful!');
    console.log('User ID:', result.user.id);
    console.log('Username:', result.user.username);
    console.log('Email:', result.user.email);
    
    // Check if the user exists in the database
    console.log('\nVerifying user in database...');
    
    // Query the database directly
    const pool = db.getPool();
    if (pool) {
      const queryResult = await pool.query<UserRow>(
        'SELECT id, username, email, email_confirmed FROM users WHERE email = $1',
        [testUser.email]
      );
      
      if (queryResult.rows.length > 0) {
        console.log('User found in database:');
        console.log('ID:', queryResult.rows[0].id);
        console.log('Username:', queryResult.rows[0].username);
        console.log('Email:', queryResult.rows[0].email);
        console.log('Email Confirmed:', queryResult.rows[0].email_confirmed);
      } else {
        console.log('User NOT found in database!');
      }
    }
    
    // Close database connection
    await db.close();
    await DatabaseConnectionManager.closePool();
    
  } catch (error) {
    console.error('Error testing registration:', error);
  }
}

// Run the test
testRegistration().catch(console.error); 