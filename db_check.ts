import postgres from 'postgres';

const passwords = ['development', 'postgres', 'admin', 'secret', 'password'];
const user = 'postgres';
const host = 'localhost';
const port = 5432;
const database = 'abe_stack_dev';

async function checkPassword(password: string): Promise<boolean> {
  const sql = postgres({
    host,
    port,
    database,
    username: user,
    password,
    connect_timeout: 2,
    idle_timeout: 1,
    max: 1,
  });

  try {
    await sql`SELECT 1`;
    console.log(`✅ SUCCESS: Password is "${password}"`);
    await sql.end();
    return true;
  } catch (err: any) {
    // console.log(`❌ Failed with "${password}": ${err.message}`);
    await sql.end();
    return false;
  }
}

async function main() {
  console.log('Checking database passwords...');

  for (const password of passwords) {
    if (await checkPassword(password)) {
      console.log('\n--> Please update your .env file with this password.');
      return;
    }
  }

  console.log('\n❌ No working password found in common list.');
  console.log('Create a new user/password or recreate the docker container volume.');
}

main().catch(console.error);
