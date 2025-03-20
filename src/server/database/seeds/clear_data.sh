#!/bin/bash

# Configuration
DB_NAME="${DB_NAME:-abe_social}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Display configuration
echo "Database configuration:"
echo "  Name: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Password: Using provided password or default"

# Function to execute SQL
function execute_sql() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

echo "Clearing data from all tables in $DB_NAME database..."

# Disable foreign key constraints temporarily
execute_sql "SET session_replication_role = 'replica';"

# Get list of tables and truncate them
# This command gets all tables except for migrations table (if you want to preserve migration history)
tables=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations';")

for table in $tables; do
  echo "Truncating table: $table"
  execute_sql "TRUNCATE TABLE \"$table\" CASCADE;"
done

# Re-enable foreign key constraints
execute_sql "SET session_replication_role = 'origin';"

echo "All tables have been cleared while preserving the schema."
echo "The database is now empty and ready for development." 