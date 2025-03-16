import { DatabaseConnectionManager } from '../config/database';
import { User } from '../database/models/auth/User';

async function checkUsers() {
  console.log('Checking users in the database...');
  
  try {
    // Initialize database connection
    await DatabaseConnectionManager.initialize();
    
    // Get all users
    const users = await User.findAll();
    console.log(`Found ${users.length} users`);
    
    // Check each user
    for (const user of users) {
      console.log(`Checking user ${user.email}`);
      // Add your user validation logic here
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    // Close the database connection
    await DatabaseConnectionManager.closePool();
  }
}

// Run the function
checkUsers().catch(console.error); 