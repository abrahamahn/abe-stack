#!/bin/bash
# Script to run all seed files in the correct order

# Database connection details
# Replace these with your actual database connection details
DB_NAME="your_database_name"
DB_USER="your_database_user"
DB_PASSWORD="your_database_password"
DB_HOST="localhost"
DB_PORT="5432"

# Function to run SQL file
run_sql_file() {
  echo "Running $1..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $1
  if [ $? -eq 0 ]; then
    echo "Successfully executed $1"
  else
    echo "Error executing $1"
    exit 1
  fi
}

# Create directory for logs
mkdir -p logs

# Run schema first
run_sql_file "01_schema.sql" > logs/01_schema.log 2>&1

# Run seed files in order
run_sql_file "02_users_seed.sql" > logs/02_users_seed.log 2>&1
run_sql_file "03_auth_roles_seed.sql" > logs/03_auth_roles_seed.log 2>&1
run_sql_file "04_social_seed.sql" > logs/04_social_seed.log 2>&1
run_sql_file "05_media_seed.sql" > logs/05_media_seed.log 2>&1
run_sql_file "06_conversations_seed.sql" > logs/06_conversations_seed.log 2>&1
run_sql_file "07_groups_seed.sql" > logs/07_groups_seed.log 2>&1
run_sql_file "08_moderation_seed.sql" > logs/08_moderation_seed.log 2>&1
run_sql_file "09_notifications_bookmarks_seed.sql" > logs/09_notifications_bookmarks_seed.log 2>&1
run_sql_file "10_search_indices_seed.sql" > logs/10_search_indices_seed.log 2>&1

echo "All seed files have been executed."
echo "Check logs directory for detailed output."