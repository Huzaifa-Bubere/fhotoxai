import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiModels } from '../data/aiModels';

const ModelGrid = () => {
  console.log("ModelGrid rendering, models:", aiModels.length);

  const [models, setModels] = useState(aiModels);
  const [filteredModels, setFilteredModels] = useState(aiModels);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  
  // Extract all unique categories
  const categories = ['All', ...new Set(aiModels.map(model => model.category))];
  
  // Filter models based on category and search query
  useEffect(() => {
    let result = aiModels;
    
    // Filter by category
    if (activeCategory !== 'All') {
      result = result.filter(model => model.category === activeCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      result = result.filter(model => 
        model.name.toLowerCase().includes(lowercaseQuery) || 
        model.description.toLowerCase().includes(lowercaseQuery) ||
        model.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    setFilteredModels(result);
  }, [activeCategory, searchQuery]);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.03
      } 
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <section className="model-grid-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <h2 className="section-title">AI Vision Model Library</h2>
          <p className="section-subtitle">
            Explore our comprehensive collection of state-of-the-art computer vision models
          </p>
        </motion.div>
        
        {/* Filter and Search */}
        <div className="model-controls">
          <div className="model-filters">
            {categories.map((category, index) => (
              <button 
                key={index}
                className={`filter-button ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          
          <div className="model-search">
            <input
              type="text"
              placeholder="Search models by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-search" 
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Results info */}
        <div className="results-info">
          Showing {filteredModels.length} of {aiModels.length} models
          {activeCategory !== 'All' && ` in ${activeCategory}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
        
        {/* Model Grid */}
        {filteredModels.length === 0 ? (
          <div className="no-results">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <p>No models found matching your criteria.</p>
            <button className="hero-button secondary" onClick={() => {setActiveCategory('All'); setSearchQuery('')}}>
              Reset Filters
            </button>
          </div>
        ) : (
          <motion.div 
            className="models-grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredModels.map((model) => (
                <motion.div
                  key={model.id}
                  className="model-card"
                  variants={itemVariants}
                  onClick={() => setSelectedModel(model.id === selectedModel ? null : model.id)}
                  layoutId={`model-card-${model.id}`}
                >
                  <div className="model-header">
                    <h3>{model.name}</h3>
                    <span className="model-category-badge">{model.category}</span>
                  </div>
                  
                  <div className="model-metrics">
                    <div className="model-metric">
                      <span className="metric-label">Accuracy</span>
                      <span className="metric-value">{model.accuracy}</span>
                    </div>
                    <div className="model-metric">
                      <span className="metric-label">Parameters</span>
                      <span className="metric-value">{model.params}</span>
                    </div>
                  </div>
                  
                  <div className="model-description">{model.description}</div>
                  
                  <div className="model-tags">
                    {model.tags.map((tag, index) => (
                      <span key={index} className="model-tag">{tag}</span>
                    ))}
                  </div>
                  
                  <div className="model-frameworks">
                    {model.frameworks.map((framework, index) => (
                      <span key={index} className="model-framework">{framework}</span>
                    ))}
                  </div>
                  
                  <div className="model-card-actions">
                    <button className="model-detail-button">
                      {model.id === selectedModel ? "Less Details" : "More Details"}
                    </button>
                  </div>
                  
                  {model.id === selectedModel && (
                    <motion.div 
                      className="model-details-expanded"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <h4>Technical Specifications</h4>
                      <ul>
                        <li><strong>Architecture:</strong> {model.name}</li>
                        <li><strong>Category:</strong> {model.category}</li>
                        <li><strong>Accuracy:</strong> {model.accuracy}</li>
                        <li><strong>Parameters:</strong> {model.params}</li>
                        <li><strong>Frameworks:</strong> {model.frameworks.join(', ')}</li>
                      </ul>
                      
                      <div className="model-detail-actions">
                        <button className="hero-button primary">
                          Documentation
                        </button>
                        <button className="hero-button secondary">
                          Try Demo
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ModelGrid;