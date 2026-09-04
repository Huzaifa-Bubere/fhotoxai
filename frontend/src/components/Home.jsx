import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Hero from './Hero';
import { aiModels } from '../data/aiModels';
import { featuredModels } from '../data/featuredModels';

const Home = () => {
  useEffect(() => {
    console.log("Home component mounted");
    console.log("AI Models data loaded:", aiModels);
    console.log("Total AI Models:", aiModels ? aiModels.length : 0);
  }, []);

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      ),
      title: 'Privacy-First Architecture',
      description: 'Built with privacy at the core. Only detection metadata is stored, no raw images retained. GDPR and compliance-ready from day one.',
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
        </svg>
      ),
      title: 'Real-Time Processing',
      description: 'High-performance inference pipelines process video streams in real-time with minimal latency. Optimized for edge and cloud deployment.',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
      ),
      title: 'Modular AI Components',
      description: 'Flexible, composable AI modules powered by state-of-the-art models. Easy to customize, extend, and integrate into existing workflows.',
      gradient: 'from-pink-500 to-red-600'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      ),
      title: 'Enterprise-Grade Scalability',
      description: 'Scales from single camera installations to thousands of concurrent streams. Cloud-native architecture with horizontal scaling.',
      gradient: 'from-green-500 to-teal-600'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
        </svg>
      ),
      title: 'Hybrid Deployment',
      description: 'Deploy on-premise for data sovereignty, in the cloud for scalability, or hybrid for the best of both worlds. Full flexibility.',
      gradient: 'from-teal-500 to-cyan-600'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      ),
      title: 'Developer-Friendly APIs',
      description: 'RESTful APIs and SDKs for seamless integration. Comprehensive documentation, webhooks, and real-time event streaming.',
      gradient: 'from-cyan-500 to-blue-600'
    }
  ];

  const systems = [];

  return (
    <>
      <Hero />

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title">Platform Features</h2>
            <p className="section-subtitle">
              Built on cutting-edge AI technology with enterprise-grade reliability and security
            </p>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Models Showcase Section */}
      <section className="models-section" data-testid="ai-models-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title">AI Vision Models</h2>
            <p className="section-subtitle">
              Powered by 50+ state-of-the-art computer vision models
            </p>
          </motion.div>

          <div className="models-card-grid">
            {console.log("Rendering AI Models cards, count:", aiModels?.length)}
            {aiModels && aiModels.length > 0 ? (
              aiModels.map((model, index) => (
                <motion.div
                  key={model.id}
                  className="model-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.02 }}
                >
                  <div className="model-card-header">
                    <h3 className="model-card-title">{model.name}</h3>
                    <span className="model-card-category">{model.category}</span>
                  </div>
                  <div className="model-card-body">
                    <p className="model-card-description">{model.description}</p>
                    <div className="model-card-stats">
                      <div className="model-stat">
                        <span className="stat-label">Accuracy</span>
                        <span className="stat-value">{model.accuracy}</span>
                      </div>
                      <div className="model-stat">
                        <span className="stat-label">Parameters</span>
                        <span className="stat-value">{model.params}</span>
                      </div>
                    </div>
                    <div className="model-card-tags">
                      {model.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="model-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', width: '100%' }}>
                <p style={{ color: 'red', fontSize: '1.5rem' }}>⚠️ No AI Models data found!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Models Section */}
      <section className="featured-models-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-title">Explore Our AI Models</h2>
            <p className="section-subtitle">
              Discover our comprehensive suite of AI-powered computer vision models
            </p>
          </motion.div>

          <div className="featured-models-grid">
            {featuredModels.map((model, index) => (
              <motion.div
                key={model.id}
                className="featured-model-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.03 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <div className={`featured-model-gradient bg-gradient-to-br ${model.gradient}`}></div>
                <div className="featured-model-content">
                  <div className="featured-model-icon">{model.icon}</div>
                  <h3 className="featured-model-name">{model.name}</h3>
                  <span className="featured-model-category">{model.category}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <motion.div
            className="cta-content"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="cta-title">Ready to Transform Your Operations?</h2>
            <p className="cta-description">
              Discover how our AI vision systems can enhance safety, efficiency, and insights in your organization.
            </p>
            <div className="cta-buttons">

            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Home;
