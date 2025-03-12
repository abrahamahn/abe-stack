import React, { useState } from 'react';
import { useClientEnvironment } from '../../services/ClientEnvironment';
import { PageContent } from '../layouts/PageContent';

export function ExplorePage() {
  const environment = useClientEnvironment();
  const [activeCategory, setActiveCategory] = useState('all');
  
  const categories = [
    { id: 'all', name: 'All' },
    { id: 'trending', name: 'Trending' },
    { id: 'new', name: 'New' },
    { id: 'popular', name: 'Popular' },
    { id: 'following', name: 'Following' }
  ];
  
  // Mock content items
  const contentItems = [
    { id: 1, title: 'Getting Started with React', author: 'Jane Smith', views: '1.2K', likes: 245, category: 'popular' },
    { id: 2, title: 'Advanced TypeScript Patterns', author: 'John Doe', views: '856', likes: 178, category: 'trending' },
    { id: 3, title: 'Building Responsive UIs', author: 'Alice Johnson', views: '3.4K', likes: 412, category: 'popular' },
    { id: 4, title: 'State Management in 2023', author: 'Bob Wilson', views: '921', likes: 156, category: 'new' },
    { id: 5, title: 'API Design Best Practices', author: 'Carol Taylor', views: '1.8K', likes: 267, category: 'trending' },
    { id: 6, title: 'Performance Optimization Tips', author: 'Dave Martin', views: '2.3K', likes: 389, category: 'popular' },
    { id: 7, title: 'Intro to Web Components', author: 'Eve Anderson', views: '745', likes: 132, category: 'new' },
    { id: 8, title: 'Accessibility for Developers', author: 'Frank Thomas', views: '1.5K', likes: 203, category: 'trending' }
  ];
  
  const filteredItems = activeCategory === 'all' 
    ? contentItems 
    : contentItems.filter(item => item.category === activeCategory);
  
  return (
    <PageContent
      title="Explore Content"
      description="Discover trending and popular content from creators."
    >
      {/* Categories */}
      <div style={{ marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              style={{
                padding: '8px 16px',
                backgroundColor: activeCategory === category.id ? 'var(--blue)' : 'transparent',
                color: activeCategory === category.id ? 'white' : 'var(--blue)',
                border: activeCategory === category.id ? 'none' : '1px solid var(--blue)',
                borderRadius: '20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Search Bar */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search content..."
            style={{
              flex: 1,
              padding: '10px 15px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
          <button
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--blue)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </div>
      </div>
      
      {/* Content Grid */}
      <div style={{ marginTop: '30px' }}>
        <h2>{activeCategory === 'all' ? 'All Content' : categories.find(c => c.id === activeCategory)?.name}</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px',
          marginTop: '15px'
        }}>
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              style={{ 
                border: '1px solid #eee', 
                borderRadius: '8px', 
                overflow: 'hidden',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
            >
              <div style={{ height: '160px', backgroundColor: 'var(--blue)', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  bottom: '10px', 
                  right: '10px',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {item.views} views
                </div>
              </div>
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{item.title}</h3>
                <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>by {item.author}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666', fontSize: '14px' }}>
                    <span>❤️ {item.likes}</span>
                  </div>
                  <div style={{ 
                    backgroundColor: item.category === 'trending' ? '#ffecb3' : 
                                    item.category === 'new' ? '#e3f2fd' : 
                                    item.category === 'popular' ? '#e8f5e9' : '#f5f5f5',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: item.category === 'trending' ? '#ff6f00' : 
                           item.category === 'new' ? '#0277bd' : 
                           item.category === 'popular' ? '#2e7d32' : '#616161'
                  }}>
                    {item.category}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Pagination */}
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
        <button style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}>
          &lt;
        </button>
        {[1, 2, 3, 4, 5].map(page => (
          <button 
            key={page}
            style={{ 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: page === 1 ? 'none' : '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: page === 1 ? 'var(--blue)' : 'white',
              color: page === 1 ? 'white' : 'inherit',
              cursor: 'pointer'
            }}
          >
            {page}
          </button>
        ))}
        <button style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}>
          &gt;
        </button>
      </div>
    </PageContent>
  );
} 