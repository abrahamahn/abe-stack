import { Database } from '../services/Database';

interface UserRow {
  id: string;
  username: string;
  email: string;
  email_confirmed: boolean;
  created_at: Date;
  updated_at: Date;
}

async function checkUsers() {
  console.log('Checking users in the database...');
  
  // Initialize database connection
  const db = new Database('./db');
  await db.initialize();
  
  try {
    const pool = db.getPool();
    if (!pool) {
      console.error('Database connection not available');
      return;
    }
    
    // Query all users
    const result = await pool.query<UserRow>(`
      SELECT id, username, email, email_confirmed, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('No users found in the database.');
      return;
    }
    
    console.log(`Found ${result.rows.length} users:`);
    console.log('-----------------------------------');
    
    // Display user information
    (result.rows as UserRow[]).forEach((user: UserRow, index: number) => {
      console.log(`User #${index + 1}:`);
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Email Confirmed: ${user.email_confirmed ? 'Yes' : 'No'}`);
      console.log(`Created At: ${user.created_at.toISOString()}`);
      console.log(`Updated At: ${user.updated_at.toISOString()}`);
      console.log('-----------------------------------');
    });
    
    // Check if in-memory mode
    if (db.isInMemoryMode && db.isInMemoryMode()) {
      console.log('NOTE: Running in in-memory database mode. Data will be lost when the server restarts.');
    }
    
  } catch (error) {
    console.error('Error querying users:', error);
  } finally {
    // Close the database connection
    if (db.isConnected()) {
      await db.close();
    }
  }
}

// Run the function
checkUsers().catch(console.error); 