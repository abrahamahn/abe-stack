# ABE Stack Architecture

Below is an architecture diagram that illustrates the key components and data flow in the ABE Stack application.

```mermaid
graph TD
    subgraph Client
        React[React Frontend]
        Router[React Router]
        Components[UI Components]
        Hooks[Custom Hooks]
        State[State Management]
    end
    
    subgraph Server
        Express[Express Server]
        Routes[API Routes]
        Controllers[Controllers]
        Services[Business Logic/Services]
        Repositories[Data Repositories]
    end
    
    subgraph Database
        PostgreSQL[PostgreSQL Database]
        Models[Data Models]
        Migrations[Migrations]
        Seeds[Seed Data]
    end
    
    subgraph Infrastructure
        Docker[Docker]
        ENV[Environment Config]
        Cache[Caching]
        Media[Media Storage]
        Auth[Authentication]
    end
    
    Client -- HTTP/WS --> Server
    React --> Router
    Router --> Components
    Components --> Hooks
    Hooks --> State
    
    Express --> Routes
    Routes --> Controllers
    Controllers --> Services
    Services --> Repositories
    Repositories --> PostgreSQL
    
    Services --> Auth
    Services --> Media
    Services --> Cache

    classDef frontend fill:#a8d5ff,stroke:#004182,color:#000;
    classDef backend fill:#c3e6cb,stroke:#5a9776,color:#000;
    classDef database fill:#f5c6cb,stroke:#7c4346,color:#000;
    classDef infra fill:#ffeeba,stroke:#856404,color:#000;
    
    class React,Router,Components,Hooks,State frontend;
    class Express,Routes,Controllers,Services,Repositories backend;
    class PostgreSQL,Models,Migrations,Seeds database;
    class Docker,ENV,Cache,Media,Auth infra;
```

## Component Descriptions

### Client
- **React Frontend**: Main client application
- **React Router**: Handles frontend routing and navigation
- **UI Components**: Reusable interface elements
- **Custom Hooks**: Shared logic for components
- **State Management**: Manages application state

### Server
- **Express Server**: Web server handling HTTP requests
- **API Routes**: Endpoint definitions and request routing
- **Controllers**: Request handling and response formatting
- **Business Logic/Services**: Core application functionality
- **Data Repositories**: Data access abstraction layer

### Database
- **PostgreSQL**: Relational database for data storage
- **Data Models**: Schema definitions for entities
- **Migrations**: Database schema version control
- **Seed Data**: Test/demo data population

### Infrastructure
- **Docker**: Containerization for consistent environment
- **Environment Config**: Configuration for different environments
- **Caching**: Performance optimization layer
- **Media Storage**: For handling uploaded files and media
- **Authentication**: User identity and access control

## Data Flow

1. Client components make requests to the server via API calls
2. Server routes direct the requests to appropriate controllers
3. Controllers coordinate with services to execute business logic
4. Services use repositories to access/modify data in the database
5. Results flow back up the stack to the client

This architecture follows a clean, multi-layered approach that separates concerns and promotes maintainability and scalability. 