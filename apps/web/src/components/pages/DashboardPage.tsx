import { PageContent } from '../../layouts/PageContent';

// Dashboard page styles
const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  card: {
    backgroundColor: 'var(--card-bg)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'var(--shadow)',
    border: '1px solid var(--border-color)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  statLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
  },
  activityItem: {
    padding: '10px',
    backgroundColor: 'var(--surface)',
    borderRadius: '4px',
  },
  activityTitle: {
    fontWeight: 'bold',
    color: 'var(--text-primary)',
  },
  activityTime: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '5px',
  },
  actionButton: {
    padding: '10px',
    backgroundColor: 'var(--blue)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  actionButtonOutline: {
    padding: '10px',
    backgroundColor: 'var(--card-bg)',
    color: 'var(--blue)',
    border: '1px solid var(--blue)',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  eventItem: {
    padding: '10px',
    borderLeft: '3px solid',
    backgroundColor: 'var(--surface)',
  },
  eventTitle: {
    fontWeight: 'bold',
    color: 'var(--text-primary)',
  },
  eventTime: {
    fontSize: '14px',
    marginTop: '5px',
    color: 'var(--text-primary)',
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  sectionTitle: {
    margin: '0 0 15px 0',
  },
};

export function DashboardPage() {
  return (
    <PageContent title="Dashboard" description="Welcome to your personalized dashboard.">
      <div style={styles.grid}>
        {/* Stats Card */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Statistics</h3>
          <div style={styles.statsGrid}>
            <div>
              <div style={styles.statLabel}>Views</div>
              <div style={styles.statValue}>1,254</div>
            </div>
            <div>
              <div style={styles.statLabel}>Likes</div>
              <div style={styles.statValue}>423</div>
            </div>
            <div>
              <div style={styles.statLabel}>Comments</div>
              <div style={styles.statValue}>97</div>
            </div>
            <div>
              <div style={styles.statLabel}>Shares</div>
              <div style={styles.statValue}>56</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Recent Activity</h3>
          <div style={styles.flexColumn}>
            <div style={styles.activityItem}>
              <div style={styles.activityTitle}>New comment on your post</div>
              <div style={styles.activityTime}>2 minutes ago</div>
            </div>
            <div style={styles.activityItem}>
              <div style={styles.activityTitle}>Your post was featured</div>
              <div style={styles.activityTime}>1 hour ago</div>
            </div>
            <div style={styles.activityItem}>
              <div style={styles.activityTitle}>New follower: JaneDoe</div>
              <div style={styles.activityTime}>3 hours ago</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.flexColumn}>
            <button style={styles.actionButton}>Create New Post</button>
            <button style={styles.actionButtonOutline}>Upload Media</button>
            <button style={styles.actionButtonOutline}>Edit Profile</button>
          </div>
        </div>

        {/* Upcoming Events Card */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Upcoming Events</h3>
          <div style={styles.flexColumn}>
            <div style={{ ...styles.eventItem, borderLeftColor: 'var(--blue)' }}>
              <div style={styles.eventTitle}>Team Meeting</div>
              <div style={styles.eventTime}>Tomorrow, 10:00 AM</div>
            </div>
            <div style={{ ...styles.eventItem, borderLeftColor: 'var(--green)' }}>
              <div style={styles.eventTitle}>Project Deadline</div>
              <div style={styles.eventTime}>Friday, 5:00 PM</div>
            </div>
            <div style={{ ...styles.eventItem, borderLeftColor: 'var(--purple)' }}>
              <div style={styles.eventTitle}>Webinar: New Features</div>
              <div style={styles.eventTime}>Next Monday, 2:00 PM</div>
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
}
