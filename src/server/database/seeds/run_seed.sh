#!/bin/bash
# seed_data.sh - Script to seed the database with sample data

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

# Check if database exists, create if it doesn't
echo "Checking if database $DB_NAME exists..."
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" postgres)

if [ -z "$DB_EXISTS" ]; then
    echo "Database $DB_NAME does not exist. Creating it..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" postgres
    if [ $? -ne 0 ]; then
        echo "Failed to create database. Exiting."
        exit 1
    fi
    echo "Database $DB_NAME created successfully."
else
    echo "Database $DB_NAME already exists."
fi

# Temporarily update run_seed.sh with the correct database details
TMP_FILE=$(mktemp)
cat run_seed.sh > $TMP_FILE
sed -i "s/DB_NAME=\"your_database_name\"/DB_NAME=\"$DB_NAME\"/" run_seed.sh
sed -i "s/DB_USER=\"your_database_user\"/DB_USER=\"$DB_USER\"/" run_seed.sh
sed -i "s/DB_PASSWORD=\"your_database_password\"/DB_PASSWORD=\"$DB_PASSWORD\"/" run_seed.sh
sed -i "s/DB_HOST=\"localhost\"/DB_HOST=\"$DB_HOST\"/" run_seed.sh
sed -i "s/DB_PORT=\"5432\"/DB_PORT=\"$DB_PORT\"/" run_seed.sh

# Make the script executable
chmod +x run_seed.sh

# Run the seed script
echo "Starting database seeding process..."
./run_seed.sh

# Restore original run_seed.sh
cat $TMP_FILE > run_seed.sh
rm $TMP_FILE

echo "Database seeding completed!" 