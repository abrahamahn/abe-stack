import { PageContent } from "../../layouts/PageContent";
import { useTheme } from "../theme";

export function SettingsPage() {
  const {
    theme,
    toggleTheme,
    useSystemTheme: enableSystemTheme,
    isUsingSystemTheme,
    setTheme,
  } = useTheme();

  // Function to disable system theme
  const disableSystemTheme = () => {
    // Keep current theme but disable system theme
    setTheme(theme);
  };

  // Handler for system theme toggle
  const handleSystemThemeToggle = () => {
    if (isUsingSystemTheme) {
      disableSystemTheme();
    } else {
      enableSystemTheme();
    }
  };

  // Define styles as a TypeScript object
  const styles = {
    container: {
      maxWidth: "800px",
      margin: "0 auto",
    },
    section: {
      backgroundColor: "var(--card-bg)",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "24px",
      boxShadow: "var(--shadow)",
      border: "1px solid var(--border-color)",
    },
    sectionTitle: {
      marginTop: 0,
      marginBottom: "16px",
      color: "var(--text-primary)",
      fontSize: "1.2rem",
      fontWeight: 600,
      borderBottom: "1px solid var(--border-color)",
      paddingBottom: "8px",
    },
    option: {
      marginBottom: "16px",
    },
    optionLast: {
      marginBottom: 0,
    },
    optionLabel: {
      display: "block",
      marginBottom: "8px",
      fontWeight: 500,
      color: "var(--text-primary)",
    },
    toggleContainer: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    themeLabel: {
      color: "var(--text-secondary)",
      fontSize: "0.9rem",
    },
    systemNote: {
      color: "var(--text-secondary)",
      fontSize: "0.8rem",
      fontStyle: "italic",
      marginLeft: "4px",
    },
    // Toggle Switch styles
    switch: {
      position: "relative" as const,
      display: "inline-block",
      width: "60px",
      height: "34px",
    },
    switchInput: {
      opacity: 0,
      width: 0,
      height: 0,
    },
    slider: {
      position: "absolute" as const,
      cursor: "pointer",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "var(--surface-variant)",
      transition: ".4s",
      borderRadius: "34px",
    },
    sliderBefore: {
      position: "absolute" as const,
      content: '""',
      height: "26px",
      width: "26px",
      left: "4px",
      bottom: "4px",
      backgroundColor: "white",
      transition: ".4s",
      borderRadius: "50%",
    },
    sliderChecked: {
      backgroundColor: "var(--accent)",
    },
    sliderBeforeChecked: {
      transform: "translateX(26px)",
    },
    sliderDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    sliderBeforeDisabled: {
      backgroundColor: "#f0f0f0",
    },
  };

  return (
    <PageContent
      title="Settings"
      description="Customize your application preferences"
    >
      <div style={styles.container}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Appearance</h2>
          <div style={styles.option}>
            <label htmlFor="system-theme" style={styles.optionLabel}>
              Use System Theme
            </label>
            <div style={styles.toggleContainer}>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  id="system-theme"
                  checked={isUsingSystemTheme}
                  onChange={handleSystemThemeToggle}
                  style={styles.switchInput}
                />
                <span
                  style={{
                    ...styles.slider,
                    ...(isUsingSystemTheme ? styles.sliderChecked : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.sliderBefore,
                      ...(isUsingSystemTheme ? styles.sliderBeforeChecked : {}),
                    }}
                  ></span>
                </span>
              </label>
              <span style={styles.themeLabel}>
                Follow system light/dark preference
              </span>
            </div>
          </div>

          <div style={styles.option}>
            <label htmlFor="theme-toggle" style={styles.optionLabel}>
              Theme
            </label>
            <div style={styles.toggleContainer}>
              <span style={styles.themeLabel}>Light</span>
              <label style={styles.switch}>
                <input
                  type="checkbox"
                  id="theme-toggle"
                  checked={theme === "dark"}
                  onChange={toggleTheme}
                  disabled={isUsingSystemTheme}
                  style={styles.switchInput}
                />
                <span
                  style={{
                    ...styles.slider,
                    ...(theme === "dark" ? styles.sliderChecked : {}),
                    ...(isUsingSystemTheme ? styles.sliderDisabled : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.sliderBefore,
                      ...(theme === "dark" ? styles.sliderBeforeChecked : {}),
                      ...(isUsingSystemTheme
                        ? styles.sliderBeforeDisabled
                        : {}),
                    }}
                  ></span>
                </span>
              </label>
              <span style={styles.themeLabel}>Dark</span>
              {isUsingSystemTheme && (
                <span style={styles.systemNote}>(Controlled by system)</span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Account</h2>
          <div style={{ ...styles.option, ...styles.optionLast }}>
            <p>Account settings will be available soon.</p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Notifications</h2>
          <div style={{ ...styles.option, ...styles.optionLast }}>
            <p>Notification settings will be available soon.</p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Privacy</h2>
          <div style={{ ...styles.option, ...styles.optionLast }}>
            <p>Privacy settings will be available soon.</p>
          </div>
        </div>
      </div>
    </PageContent>
  );
}
