import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ModelShowcase = () => {
  useEffect(() => {
    console.log("ModelShowcase component mounted");
  }, []);
  
  const [activeModel, setActiveModel] = useState(null);

  const models = [];

  const activeModelData = models.find(model => model.id === activeModel);

  // Animation variants for the model cards
  const cardVariants = {
    active: { 
      scale: 1.05,
      boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2), 0 0 30px rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(99, 102, 241, 0.5)',
      transition: { duration: 0.3 }
    },
    inactive: { 
      scale: 1,
      boxShadow: '0 5px 15px rgba(99, 102, 241, 0.1)',
      borderColor: 'rgba(99, 102, 241, 0.15)',
      transition: { duration: 0.3 }
    }
  };

  // Animation for the detail section
  const detailVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="model-showcase-section">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="section-header"
        >
          <h2 className="section-title">Our AI Vision Models</h2>
          <p className="section-subtitle">
            Explore our state-of-the-art computer vision models powering next-generation applications
          </p>
        </motion.div>

        {/* Model Selection Cards */}
        <div className="model-cards-container">
          {models.map((model, index) => (
            <motion.div
              key={model.id}
              className={`model-card ${activeModel === model.id ? 'active' : ''}`}
              variants={cardVariants}
              initial="inactive"
              animate={activeModel === model.id ? "active" : "inactive"}
              whileHover={{ scale: activeModel === model.id ? 1.05 : 1.02 }}
              onClick={() => setActiveModel(model.id)}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="model-card-header">
                <h3>{model.name}</h3>
                <span className="model-category">{model.category}</span>
              </div>
              
              <div className="model-metrics">
                <div className="metric">
                  <span className="metric-label">Accuracy</span>
                  <span className="metric-value">{model.accuracy}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Latency</span>
                  <span className="metric-value">{model.latency}</span>
                </div>
              </div>
              
              <div className="model-tech-badge">
                {model.tech}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Active Model Details */}
        <motion.div
          key={activeModel}
          className="model-details"
          initial="hidden"
          animate="visible"
          variants={detailVariants}
        >
          <div className="model-info-container">
            <div className="model-info">
              <h3>{activeModelData.name} Model</h3>
              <p className="model-description">{activeModelData.description}</p>
              
              <h4>Key Features</h4>
              <ul className="model-features">
                {activeModelData.features.map((feature, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" className="feature-icon">
                      <path 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </div>
            
            <div className="model-visual">
              <div className="model-demo">
                <div className="demo-image-container" data-model={activeModel}>
                  <div className="demo-overlay">
                    <div className="processing-indicator">
                      {/* Animated processing boxes */}
                      <div className="processing-box box1"></div>
                      <div className="processing-box box2"></div>
                      <div className="processing-box box3"></div>
                      <div className="processing-box box4"></div>
                    </div>
                    
                    {/* Detection visualization elements */}
                    {activeModel === 'safety' && (
                      <>
                        <div className="detection-box helmet">Hard Hat <span className="confidence">99.8%</span></div>
                        <div className="detection-box vest">Safety Vest <span className="confidence">98.5%</span></div>
                        <div className="detection-box goggles">Safety Glasses <span className="confidence">97.2%</span></div>
                      </>
                    )}
                    
                    {activeModel === 'face-clustering' && (
                      <>
                        <div className="cluster-group group1">Group A <span className="confidence">7 photos</span></div>
                        <div className="cluster-group group2">Group B <span className="confidence">12 photos</span></div>
                        <div className="cluster-group group3">Group C <span className="confidence">5 photos</span></div>
                      </>
                    )}
                    
                    {activeModel === 'face-recognition' && (
                      <>
                        <div className="recognition-box person1">John Smith <span className="confidence">99.9%</span></div>
                        <div className="recognition-indicator">
                          <span className="liveness">Liveness Check Passed</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="demo-caption">
                    <span className="caption-text">{activeModelData.demoCaption}</span>
                    <div className="ai-badge">AI Enhanced Visualization</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Technical Specifications Accordion */}
          <div className="tech-specs">
            <h4>Technical Specifications</h4>
            <div className="specs-grid">
              <div className="spec-item">
                <div className="spec-name">Architecture</div>
                <div className="spec-value">{activeModelData.tech}</div>
              </div>
              <div className="spec-item">
                <div className="spec-name">Accuracy</div>
                <div className="spec-value">{activeModelData.accuracy} (mAP@0.5:0.95)</div>
              </div>
              <div className="spec-item">
                <div className="spec-name">Inference Time</div>
                <div className="spec-value">{activeModelData.latency} on NVIDIA T4</div>
              </div>
              <div className="spec-item">
                <div className="spec-name">Model Size</div>
                <div className="spec-value">82MB (quantized)</div>
              </div>
              <div className="spec-item">
                <div className="spec-name">Training Data</div>
                <div className="spec-value">2.3M annotated images</div>
              </div>
              <div className="spec-item">
                <div className="spec-name">Deployment</div>
                <div className="spec-value">Cloud, Edge, and Mobile</div>
              </div>
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="model-cta">
            <button className="hero-button primary model-explore-btn">
              <span>Explore {activeModelData.name}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="hero-button secondary model-demo-btn">
              <span>Try Live Demo</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M10 8l6 4-6 4V8z"></path>
              </svg>
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ModelShowcase;