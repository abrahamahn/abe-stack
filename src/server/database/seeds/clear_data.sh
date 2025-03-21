#!/bin/bash
# clear_data.sh - Script to clear all data from the database while preserving schema

# Set the current directory to the script's directory
cd "$(dirname "${BASH_SOURCE[0]}")"

# Default values
NODE_ENV=${NODE_ENV:-development}
DB_NAME=${DB_NAME:-abe_stack}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# Choose environment file based on NODE_ENV
if [[ "$NODE_ENV" == "production" ]]; then
    ENV_FILE=../../../../.env.production
else
    ENV_FILE=../../../../.env.development
fi

# Source environment variables if the file exists
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from $ENV_FILE"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Override default values if set in the environment file
    if [ -n "$DB_NAME" ]; then
        DB_NAME=$DB_NAME
    fi
    if [ -n "$DB_USER" ]; then
        DB_USER=$DB_USER
    fi
    if [ -n "$DB_PASSWORD" ]; then
        DB_PASSWORD=$DB_PASSWORD
    fi
    if [ -n "$DB_HOST" ]; then
        DB_HOST=$DB_HOST
    fi
    if [ -n "$DB_PORT" ]; then
        DB_PORT=$DB_PORT
    fi
else
    echo "Warning: Environment file $ENV_FILE not found. Using default values."
fi

# Display configuration
echo "Database configuration:"
echo "  Environment: $NODE_ENV"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"

# Check if database exists
echo "Checking if database $DB_NAME exists..."
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" postgres)

if [ -z "$DB_EXISTS" ]; then
    echo "Database $DB_NAME does not exist. Nothing to clear."
    exit 0
fi

echo "Clearing data from all tables in $DB_NAME database..."

# Function to execute SQL
function execute_sql() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

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