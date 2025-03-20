# Troubleshooting Guide

## Database Connection Issues

### Symptom: "ECONNREFUSED connecting to PostgreSQL"

**Solution**: 
1. Check if PostgreSQL is running with `pg_isready` (or `docker-compose ps` if using Docker)
2. Verify connection settings in `.env.development`
3. Try the fallback mode: `DB_FALLBACK=true npm run dev`

### Symptom: "role 'postgres' does not exist"

**Solution**:
1. Make sure you've created the PostgreSQL user specified in your `.env` file
2. For Docker users: ensure the PostgreSQL container is properly initialized
3. Try running `npm run seed:demo` again to recreate the database schema

## Build Errors

### Symptom: "Cannot find module..."

**Solution**:
1. Delete `node_modules` and reinstall with `npm install`
2. Check for TypeScript errors with `npm run type-check`
3. Verify that all dependencies are correctly listed in package.json

### Symptom: TypeScript compilation errors

**Solution**:
1. Run `npm run type-check` to see detailed errors
2. Fix the errors in your code or run `npm run fix:types` for automatic fixes
3. Make sure you're using the correct TypeScript version (see package.json)

## Docker Issues

### Symptom: "Couldn't connect to Docker daemon"

**Solution**:
1. Make sure Docker is installed and running
2. On Linux, check if your user is in the docker group
3. Try restarting the Docker service

### Symptom: Docker containers not accessible

**Solution**:
1. Check container status with `docker-compose ps`
2. View logs with `docker-compose logs -f`
3. Ensure the ports aren't being used by other services

## Server Issues

### Symptom: "Address already in use" error

**Solution**:
1. Find the process using the port: 
   - Windows: `netstat -ano | findstr PORT_NUMBER`
   - macOS/Linux: `lsof -i :PORT_NUMBER`
2. Kill the process and restart the server
3. Alternatively, change the port in `.env.development`

### Symptom: Auth token issues / "Invalid signature"

**Solution**:
1. Check that JWT_SECRET is properly set in your environment file
2. Try clearing your browser's local storage
3. Verify the token expiration duration in the auth configuration

## Frontend Issues

### Symptom: CSS or styling problems

**Solution**:
1. Clear your browser cache
2. Check browser console for errors
3. Verify that all required stylesheets are imported

### Symptom: "Unexpected token" in JavaScript

**Solution**:
1. Check for syntax errors in your code
2. Verify that your browser supports the JavaScript features you're using
3. Check that babel/transpilation is configured correctly

## General Troubleshooting Steps

1. **Check Logs**: Server and client logs often provide valuable information about errors
2. **Restart Development Server**: Sometimes a simple restart with `npm run dev` resolves issues
3. **Clean Installation**: In case of persistent issues, try:
   ```
   rm -rf node_modules
   npm cache clean --force
   npm install
   ```
4. **Update Dependencies**: If you're experiencing compatibility issues, update dependencies:
   ```
   npm update
   ```
5. **Check Environment Variables**: Make sure all required variables are defined in your `.env` files

If you're still experiencing issues after trying these solutions, please open an issue on the project repository with detailed steps to reproduce the problem.