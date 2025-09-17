import { Client } from "pg";

async function testPostgresConnection() {
  // Ensure password is always a string
  const password = process.env.DB_PASSWORD || "postgres"; // Default postgres password

  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "abe_stack",
    user: "postgres",
    password: password,
  });

  try {
    console.log("Attempting to connect to PostgreSQL...");
    await client.connect();
    console.log("✅ Connected to PostgreSQL successfully!");

    // Run a simple query to test the connection further
    const result = await client.query("SELECT NOW() as current_time");
    console.log("Current database time:", result.rows[0].current_time);

    // Test if the database has the necessary tables
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      console.log("\nDatabase tables:");
      if (tablesResult.rows.length === 0) {
        console.log("- No tables found in the public schema");
      } else {
        tablesResult.rows.forEach((row) => {
          console.log(`- ${row.table_name}`);
        });
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  } catch (error) {
    console.error("❌ Failed to connect to PostgreSQL:", error);
  } finally {
    await client.end();
    console.log("Connection closed");
  }
}

// Run the test
testPostgresConnection().catch(console.error);
