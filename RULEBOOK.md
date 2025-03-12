I'll update the rulebook with those important documentation guidelines:

# PERN Stack Boilerplate Development Rulebook

## Project Overview
This boilerplate provides a foundation for developing optimized full-stack applications with social media and multimedia streaming capabilities (similar to SoundCloud, YouTube, and Instagram). It aims to be minimal yet robust enough to kickstart development for streaming applications.

## Technology Stack
- **PostgreSQL**: Database
- **Express.js**: Backend framework
- **React with Vite**: Frontend library and build tool
- **Node.js**: JavaScript runtime
- **Docker**: Containerization for deployment
- **Electron.js**: Ready configuration for desktop application wrapping
- **Raw SQL**: Direct database queries instead of ORM

## Core Principles

### 1. Minimalism with Purpose
- Include only what's necessary for the core functionality
- Every file, function, and feature must have a clear purpose
- Prefer simpler solutions over complex ones
- Code should be well-documented and self-explanatory

### 2. Dependency Management
- **Minimize External Dependencies**
  - Use built-in Node.js/browser APIs whenever possible
  - Only add external packages when absolutely necessary
  - Justify each new dependency with specific requirements

- **Package Addition Process**
  - Before adding any new package, create a proposal that includes:
    - The specific problem being solved
    - Why native solutions are insufficient
    - At least 2-3 alternative packages that could solve the problem
    - Comparison of alternatives (size, maintenance status, security, features)
    - Justification for final selection

- **Package Review Checklist**
  - [ ] Is this functionality truly needed for a boilerplate?
  - [ ] Could we implement this ourselves with reasonable effort?
  - [ ] Is the package actively maintained?
  - [ ] Does it have a reasonable bundle size impact?
  - [ ] Has it been evaluated for security vulnerabilities?
  - [ ] Are we comfortable with its license?
  - [ ] Does it have TypeScript support?
  - [ ] Is it compatible with both web and Electron environments?

### 3. Architecture Design
- Maintain clear separation between client and server code
- Use a modular approach to allow easy addition/removal of features
- Design with scalability in mind, but don't over-engineer
- Consider both web and desktop (Electron) environments in your design

### 4. Database Management
- Use raw SQL instead of ORM for better performance and control
- Implement proper SQL migration strategy
- Create reusable database utility functions
- Include sample schemas for common social media entities (users, media, comments, etc.)
- Design database structure optimized for media streaming

### 5. Media Handling
- Implement efficient storage and streaming methods
- Support basic media operations (upload, transcode, stream)
- Create abstraction layers for media services that can be extended

### 6. Security First
- Implement proper authentication and authorization
- Include security best practices by default
- Prevent common vulnerabilities (CSRF, XSS, SQL injection)
- Handle sensitive data appropriately

### 7. Development Experience
- Ensure fast development feedback loop
- Provide clear documentation and examples
- Include useful development utilities without bloat
- Maintain consistency in code style and patterns

### 8. Code Documentation Standards
- **File Header Comments**
  - Every file must begin with a description comment explaining its purpose
  - Include the relative file path as a single-line comment at the top of each file
  - Example: `// src/client/components/MediaPlayer.tsx`

- **Documentation Format**
  - Follow industry standard JSDoc format for functions and classes
  - Document parameters, return values, and thrown exceptions
  - Include usage examples for complex functions
  - Document any non-obvious behavior or edge cases

- **Code Comments**
  - Add meaningful comments explaining "why" not just "what"
  - Keep comments up-to-date when code changes
  - Use clear and concise language
  - Comment complex algorithms or business logic thoroughly

- **Example File Header Template**:
```typescript
// src/server/services/MediaService.ts
/**
 * Media Service
 * 
 * Handles the processing, storage, and streaming of media files.
 * Supports audio and video formats and manages transcoding processes.
 * 
 * @module MediaService
 */
```

## Implementation Guidelines

### Frontend (React)
- Create a minimal, clean component structure
- Implement essential UI components only
- Set up efficient state management
- Provide basic routing without unnecessary complexity
- Include examples for media players and streaming interfaces

### Backend (Express/Node)
- Create a modular API structure
- Implement efficient streaming endpoints
- Set up proper error handling and logging
- Include authentication middleware
- Design with horizontal scaling in mind

### Database (PostgreSQL)
- Include migration scripts for basic schema
- Create utility functions for common SQL operations
- Design schemas optimized for media storage and retrieval
- Implement efficient query patterns for social features

### Electron Integration
- Provide configuration that works in both web and desktop contexts
- Include only essential Electron-specific code
- Document the differences in behavior between web and desktop

### Docker Setup
- Create optimized multi-stage build process
- Include separate development and production configurations
- Ensure proper volume mapping for development
- Document deployment process

## Example Package Addition Proposal Template

```
### Package Addition Proposal

**Functionality needed:** [Describe what you need]

**Why we can't use native solutions:** [Explain limitations]

**Options considered:**

1. **[Package Name 1]**
   - Size: [size in KB]
   - Last updated: [date]
   - Advantages: [list]
   - Disadvantages: [list]

2. **[Package Name 2]**
   - Size: [size in KB]
   - Last updated: [date]
   - Advantages: [list]
   - Disadvantages: [list]

3. **[Package Name 3]**
   - Size: [size in KB]
   - Last updated: [date]
   - Advantages: [list]
   - Disadvantages: [list]

**Recommendation:** [Your choice with justification]
```

## Remember
This is a boilerplate, not a fully-featured application. The goal is to provide a solid foundation that developers can build upon, not a complete solution that tries to do everything. Focus on creating clean, well-structured code that can be easily understood and extended.