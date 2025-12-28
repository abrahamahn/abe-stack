#!/usr/bin/env node

/**
 * Emergency Database Pool Restart Script
 * Use this when the connection pool is exhausted
 */

import { Client, QueryResult } from 'pg';

interface DbConnection {
  pid: number;
  usename: string;
  application_name: string;
  client_addr: string | null;
  state: string;
  query_start: Date;
  state_change: Date;
}

interface TerminateResult {
  pg_terminate_backend: boolean;
}

async function restartDatabaseConnections(): Promise<void> {
  console.log('🚨 Emergency Database Pool Restart');
  console.log('This will terminate hanging connections and reset the pool');

  try {
    // Connect directly to PostgreSQL to check and kill connections
    const adminClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres', // Connect to postgres db to manage connections
      user: 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL as admin');

    // Check current connections to abe_stack database
    const connectionsQuery = `
      SELECT pid, usename, application_name, client_addr, state, query_start, state_change
      FROM pg_stat_activity
      WHERE datname = 'abe_stack' AND state != 'idle'
      ORDER BY query_start;
    `;

    const result: QueryResult<DbConnection> =
      await adminClient.query<DbConnection>(connectionsQuery);
    console.log(`\n📊 Found ${result.rows.length} active connections to abe_stack:`);

    result.rows.forEach((row: DbConnection, index: number) => {
      console.log(`${index + 1}. PID: ${row.pid}, User: ${row.usename}, State: ${row.state}`);
      console.log(`   Started: ${row.query_start}, Changed: ${row.state_change}`);
    });

    if (result.rows.length > 0) {
      console.log('\n🔄 Terminating hanging connections...');

      // Terminate connections that have been running for more than 30 seconds
      const terminateQuery = `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = 'abe_stack'
        AND state != 'idle'
        AND query_start < NOW() - INTERVAL '30 seconds';
      `;

      const terminateResult: QueryResult<TerminateResult> =
        await adminClient.query<TerminateResult>(terminateQuery);
      console.log(`✅ Terminated ${terminateResult.rowCount} hanging connections`);
    }

    await adminClient.end();
    console.log('\n🎉 Database connection cleanup completed!');
    console.log('💡 You can now try registration again');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error during database cleanup:', errorMessage);
    console.log(
      '\n🔧 Manual fix: Restart your PostgreSQL service or the entire development server',
    );
  }
}

restartDatabaseConnections();
