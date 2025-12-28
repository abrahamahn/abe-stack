import { PageContent } from "../../layouts/PageContent";
import { useClientEnvironment } from "../../services/ClientEnvironment";

export function HomePage() {
  const environment = useClientEnvironment();

  // Function to handle navigation using the custom router
  const handleNavigate = (path: string) => {
    environment.router.navigate(path);
  };

  return (
    <PageContent
      title="Welcome to ABE Stack"
      description="A modern, full-stack TypeScript boilerplate for building web applications"
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Credit Banner */}
        <div
          style={{
            backgroundColor: "var(--accent)",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            marginBottom: "30px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 10px 0", fontSize: "1.4rem" }}>
            Built on Chet Stack
          </h2>
          <p
            style={{
              margin: "0 0 10px 0",
              fontSize: "1.1rem",
              lineHeight: "1.5",
            }}
          >
            ABE Stack is proudly built upon the excellent foundation provided by
            <a
              href="https://github.com/ccorcos/chet-stack"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "white",
                textDecoration: "underline",
                fontWeight: "bold",
                marginLeft: "5px",
              }}
            >
              Chet Stack
            </a>{" "}
            by Chet Corcos.
          </p>
          <a
            href="https://github.com/ccorcos/chet-stack"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: "white",
              color: "var(--accent)",
              padding: "8px 16px",
              borderRadius: "4px",
              textDecoration: "none",
              fontWeight: "bold",
              marginTop: "5px",
            }}
          >
            Visit Chet Stack Repository
          </a>
        </div>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            What is ABE Stack?
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              lineHeight: "1.6",
              marginBottom: "20px",
            }}
          >
            <strong>ABE Stack</strong> (Authentication, Backend, and Everything)
            is a comprehensive boilerplate designed to accelerate web
            application development. It extends the powerful foundation of Chet
            Stack with additional features, UI components, and ready-to-use
            patterns.
          </p>
          <p
            style={{
              fontSize: "1.1rem",
              lineHeight: "1.6",
              marginBottom: "20px",
            }}
          >
            Whether you&apos;re building a social platform, content management
            system, or any modern web application, ABE Stack provides the
            essential building blocks so you can focus on your unique business
            logic rather than reinventing the wheel.
          </p>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            Core Architecture
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            <FeatureCard
              title="Full-Stack TypeScript"
              description="End-to-end type safety with TypeScript on both client and server. The shared type definitions between frontend and backend eliminate type mismatches and provide excellent developer experience."
            />
            <FeatureCard
              title="Vite + React"
              description="Lightning-fast development with Vite and modern React patterns. Enjoy hot module replacement, optimized builds, and a component-based architecture using React hooks and context."
            />
            <FeatureCard
              title="PostgreSQL + Migrations"
              description="Robust database integration with PostgreSQL, including a migration system, query builders, and type-safe database access patterns inherited from Chet Stack."
            />
            <FeatureCard
              title="WebSocket Integration"
              description="Real-time communication between client and server using WebSockets. This enables live updates, notifications, and collaborative features without complex setup."
            />
          </div>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            Extended Features
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              lineHeight: "1.6",
              marginBottom: "20px",
            }}
          >
            While Chet Stack provides an excellent foundation, ABE Stack extends
            it with additional features and components:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <FeatureCard
              title="Authentication System"
              description="Complete user authentication flow with registration, login, profile management, and secure session handling."
            />
            <FeatureCard
              title="Responsive UI Components"
              description="A library of pre-built, responsive UI components that work across all device sizes, from mobile to desktop."
            />
            <FeatureCard
              title="Theme System"
              description="Built-in theme support with light/dark modes, system preference detection, and user customization options."
            />
            <FeatureCard
              title="Notifications Framework"
              description="Real-time notification system with different notification types, read status tracking, and user preferences."
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            <FeatureCard
              title="Media Management"
              description="Infrastructure for handling images, videos, and other media types with upload, storage, and delivery capabilities."
            />
            <FeatureCard
              title="Social Components"
              description="Building blocks for social features like profiles, connections, activity feeds, and interactions."
            />
            <FeatureCard
              title="Layout System"
              description="Flexible layout components with responsive behavior, including sidebar, content areas, and navigation elements."
            />
            <FeatureCard
              title="Form Handling"
              description="Comprehensive form components with validation, error handling, and submission management."
            />
          </div>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            Technical Details
          </h2>
          <div
            style={{
              backgroundColor: "var(--card-bg)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0", color: "var(--accent)" }}>
              Chet Stack Foundation
            </h3>
            <p
              style={{
                fontSize: "1.05rem",
                lineHeight: "1.6",
                marginBottom: "15px",
              }}
            >
              The core architecture of ABE Stack is built on Chet Stack, which
              provides:
            </p>
            <ul
              style={{
                paddingLeft: "20px",
                fontSize: "1.05rem",
                lineHeight: "1.6",
                marginBottom: "20px",
              }}
            >
              <li style={{ marginBottom: "8px" }}>
                Type-safe database access patterns
              </li>
              <li style={{ marginBottom: "8px" }}>
                Migration system for database schema evolution
              </li>
              <li style={{ marginBottom: "8px" }}>
                WebSocket infrastructure for real-time communication
              </li>
              <li style={{ marginBottom: "8px" }}>
                Client-side routing with code splitting
              </li>
              <li style={{ marginBottom: "8px" }}>
                Development tooling and production optimization
              </li>
            </ul>

            <h3 style={{ margin: "0 0 15px 0", color: "var(--accent)" }}>
              ABE Stack Extensions
            </h3>
            <p
              style={{
                fontSize: "1.05rem",
                lineHeight: "1.6",
                marginBottom: "15px",
              }}
            >
              ABE Stack extends this foundation with:
            </p>
            <ul
              style={{
                paddingLeft: "20px",
                fontSize: "1.05rem",
                lineHeight: "1.6",
              }}
            >
              <li style={{ marginBottom: "8px" }}>
                Comprehensive UI component library
              </li>
              <li style={{ marginBottom: "8px" }}>
                Authentication and user management
              </li>
              <li style={{ marginBottom: "8px" }}>
                Theme system with light/dark mode support
              </li>
              <li style={{ marginBottom: "8px" }}>
                Responsive design patterns for all device sizes
              </li>
              <li style={{ marginBottom: "8px" }}>
                Media handling capabilities
              </li>
              <li style={{ marginBottom: "8px" }}>
                Social features and interaction patterns
              </li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            Explore the Stack
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              lineHeight: "1.6",
              marginBottom: "20px",
            }}
          >
            The best way to understand ABE Stack is to explore its features. Use
            the navigation menu to check out different sections:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "15px",
            }}
          >
            <ExploreCard
              title="Dashboard"
              _path="/dashboard"
              description="Overview of application capabilities"
              onClick={() => handleNavigate("/dashboard")}
            />
            <ExploreCard
              title="Profile"
              _path="/profile"
              description="User profile management"
              onClick={() => handleNavigate("/profile")}
            />
            <ExploreCard
              title="Explore"
              _path="/explore"
              description="Content discovery interface"
              onClick={() => handleNavigate("/explore")}
            />
            <ExploreCard
              title="Notifications"
              _path="/notifications"
              description="Notification system demo"
              onClick={() => handleNavigate("/notifications")}
            />
            <ExploreCard
              title="Settings"
              _path="/settings"
              description="Application preferences"
              onClick={() => handleNavigate("/settings")}
            />
          </div>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            Getting Started
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              lineHeight: "1.6",
              marginBottom: "20px",
            }}
          >
            To use ABE Stack for your own project:
          </p>
          <ol
            style={{
              paddingLeft: "25px",
              fontSize: "1.05rem",
              lineHeight: "1.6",
            }}
          >
            <li style={{ marginBottom: "10px" }}>Clone the repository</li>
            <li style={{ marginBottom: "10px" }}>
              Install dependencies with{" "}
              <code
                style={{
                  backgroundColor: "var(--code-bg)",
                  padding: "2px 5px",
                  borderRadius: "3px",
                }}
              >
                npm install
              </code>
            </li>
            <li style={{ marginBottom: "10px" }}>
              Set up your PostgreSQL database
            </li>
            <li style={{ marginBottom: "10px" }}>
              Configure environment variables
            </li>
            <li style={{ marginBottom: "10px" }}>
              Run migrations with{" "}
              <code
                style={{
                  backgroundColor: "var(--code-bg)",
                  padding: "2px 5px",
                  borderRadius: "3px",
                }}
              >
                npm run migrate
              </code>
            </li>
            <li style={{ marginBottom: "10px" }}>
              Start development server with{" "}
              <code
                style={{
                  backgroundColor: "var(--code-bg)",
                  padding: "2px 5px",
                  borderRadius: "3px",
                }}
              >
                npm run dev
              </code>
            </li>
          </ol>
        </section>

        <footer
          style={{
            borderTop: "1px solid var(--border-color)",
            paddingTop: "20px",
            marginTop: "40px",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
          }}
        >
          <p style={{ marginBottom: "10px" }}>
            ABE Stack is built upon{" "}
            <a
              href="https://github.com/ccorcos/chet-stack"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Chet Stack
            </a>{" "}
            by Chet Corcos.
          </p>
          <p>
            We are grateful for the excellent foundation provided by Chet Stack,
            which made this extended boilerplate possible.
          </p>
        </footer>
      </div>
    </PageContent>
  );
}

// Feature card component for displaying features in a grid
function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--card-bg)",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "var(--shadow)",
        border: "1px solid var(--border-color)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        height: "100%",
      }}
    >
      <h3
        style={{ marginTop: 0, marginBottom: "10px", color: "var(--accent)" }}
      >
        {title}
      </h3>
      <p
        style={{ margin: 0, color: "var(--text-secondary)", lineHeight: "1.5" }}
      >
        {description}
      </p>
    </div>
  );
}

// Explore card component for navigation links
function ExploreCard({
  title,
  _path: _path,
  description,
  onClick,
}: {
  title: string;
  _path: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "var(--card-bg)",
        borderRadius: "8px",
        padding: "15px",
        boxShadow: "var(--shadow)",
        border: "1px solid var(--border-color)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        height: "100%",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "8px", color: "var(--accent)" }}>
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          color: "var(--text-secondary)",
          fontSize: "0.9rem",
        }}
      >
        {description}
      </p>
    </div>
  );
}
