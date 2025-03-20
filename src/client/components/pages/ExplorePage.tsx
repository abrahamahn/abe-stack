import { useState } from "react";

import { PageContent } from "../../layouts/PageContent";

// Explore page styles
const styles = {
  categories: {
    marginTop: "20px",
    borderBottom: "1px solid var(--border-color)",
    paddingBottom: "10px",
  },
  categoryButtons: {
    display: "flex",
    gap: "10px",
    overflowX: "auto" as const,
    paddingBottom: "5px",
  },
  categoryButton: {
    padding: "8px 16px",
    borderRadius: "20px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  categoryButtonActive: {
    backgroundColor: "var(--blue)",
    color: "white",
    border: "none",
  },
  categoryButtonInactive: {
    backgroundColor: "transparent",
    color: "var(--blue)",
    border: "1px solid var(--blue)",
  },
  searchContainer: {
    marginTop: "20px",
    display: "flex",
    gap: "10px",
  },
  searchInput: {
    flex: 1,
    padding: "10px 15px",
    borderRadius: "4px",
    border: "1px solid var(--border-color)",
    fontSize: "16px",
    backgroundColor: "var(--surface)",
    color: "var(--text-primary)",
  },
  searchButton: {
    padding: "10px 20px",
    backgroundColor: "var(--blue)",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  contentSection: {
    marginTop: "30px",
  },
  contentTitle: {
    color: "var(--text-primary)",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    marginTop: "15px",
  },
  contentCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    overflow: "hidden",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "pointer",
    backgroundColor: "var(--card-bg)",
    boxShadow: "var(--shadow)",
  },
  contentCardHover: {
    transform: "translateY(-5px)",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.2)",
  },
  contentImage: {
    height: "160px",
    backgroundColor: "var(--blue)",
    position: "relative" as const,
  },
  contentViews: {
    position: "absolute" as const,
    bottom: "10px",
    right: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "white",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "12px",
  },
  contentDetails: {
    padding: "15px",
  },
  contentItemTitle: {
    margin: "0 0 5px 0",
    fontSize: "18px",
    color: "var(--text-primary)",
  },
  contentAuthor: {
    color: "var(--text-secondary)",
    fontSize: "14px",
    marginBottom: "10px",
  },
  contentFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contentLikes: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    color: "var(--text-secondary)",
    fontSize: "14px",
  },
  pagination: {
    marginTop: "30px",
    display: "flex",
    justifyContent: "center",
    gap: "5px",
  },
  paginationButton: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--border-color)",
    borderRadius: "4px",
    backgroundColor: "var(--card-bg)",
    cursor: "pointer",
    color: "var(--text-primary)",
  },
  paginationButtonActive: {
    border: "none",
    backgroundColor: "var(--blue)",
    color: "white",
  },
};

export function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const categories = [
    { id: "all", name: "All" },
    { id: "trending", name: "Trending" },
    { id: "new", name: "New" },
    { id: "popular", name: "Popular" },
    { id: "following", name: "Following" },
  ];

  // Mock content items
  const contentItems = [
    {
      id: 1,
      title: "Getting Started with React",
      author: "Jane Smith",
      views: "1.2K",
      likes: 245,
      category: "popular",
    },
    {
      id: 2,
      title: "Advanced TypeScript Patterns",
      author: "John Doe",
      views: "856",
      likes: 178,
      category: "trending",
    },
    {
      id: 3,
      title: "Building Responsive UIs",
      author: "Alice Johnson",
      views: "3.4K",
      likes: 412,
      category: "popular",
    },
    {
      id: 4,
      title: "State Management in 2023",
      author: "Bob Wilson",
      views: "921",
      likes: 156,
      category: "new",
    },
    {
      id: 5,
      title: "API Design Best Practices",
      author: "Carol Taylor",
      views: "1.8K",
      likes: 267,
      category: "trending",
    },
    {
      id: 6,
      title: "Performance Optimization Tips",
      author: "Dave Martin",
      views: "2.3K",
      likes: 389,
      category: "popular",
    },
    {
      id: 7,
      title: "Intro to Web Components",
      author: "Eve Anderson",
      views: "745",
      likes: 132,
      category: "new",
    },
    {
      id: 8,
      title: "Accessibility for Developers",
      author: "Frank Thomas",
      views: "1.5K",
      likes: 203,
      category: "trending",
    },
  ];

  const filteredItems =
    activeCategory === "all"
      ? contentItems
      : contentItems.filter((item) => item.category === activeCategory);

  return (
    <PageContent
      title="Explore Content"
      description="Discover trending and popular content from creators."
    >
      {/* Categories */}
      <div style={styles.categories}>
        <div style={styles.categoryButtons}>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              style={{
                ...styles.categoryButton,
                ...(activeCategory === category.id
                  ? styles.categoryButtonActive
                  : styles.categoryButtonInactive),
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search content..."
          style={styles.searchInput}
        />
        <button style={styles.searchButton}>Search</button>
      </div>

      {/* Content Grid */}
      <div style={styles.contentSection}>
        <h2 style={styles.contentTitle}>
          {activeCategory === "all"
            ? "All Content"
            : categories.find((c) => c.id === activeCategory)?.name}
        </h2>
        <div style={styles.contentGrid}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.contentCard,
                ...(hoveredCard === item.id ? styles.contentCardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.contentImage}>
                <div style={styles.contentViews}>{item.views} views</div>
              </div>
              <div style={styles.contentDetails}>
                <h3 style={styles.contentItemTitle}>{item.title}</h3>
                <div style={styles.contentAuthor}>by {item.author}</div>
                <div style={styles.contentFooter}>
                  <div style={styles.contentLikes}>
                    <span>❤️ {item.likes}</span>
                  </div>
                  <div
                    style={{
                      backgroundColor:
                        item.category === "trending"
                          ? "#ffecb3"
                          : item.category === "new"
                            ? "#e3f2fd"
                            : item.category === "popular"
                              ? "#e8f5e9"
                              : "#f5f5f5",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color:
                        item.category === "trending"
                          ? "#ff6f00"
                          : item.category === "new"
                            ? "#0277bd"
                            : item.category === "popular"
                              ? "#2e7d32"
                              : "#616161",
                    }}
                  >
                    {item.category}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        <button style={styles.paginationButton}>&lt;</button>
        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            style={{
              ...styles.paginationButton,
              ...(page === 1 ? styles.paginationButtonActive : {}),
            }}
          >
            {page}
          </button>
        ))}
        <button style={styles.paginationButton}>&gt;</button>
      </div>
    </PageContent>
  );
}
