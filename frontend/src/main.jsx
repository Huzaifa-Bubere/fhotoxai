import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './styles.css'
import './index.css'
import './custom-overrides.css'
import './components/modelShowcase.css'
import './components/modelShowcaseImages.css'
import './components/modelGrid.css'
import './studio-system.css'
import App from './App.jsx'
import PhotoClusteringPage from './pages/PhotoClusteringPage.jsx'
import ClusterGrid from './components/photoClustering/ui/ClusterGrid'
import ClusterViewer from './components/photoClustering/ui/ClusterViewer'

import { ToastProvider } from './context/ToastContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/photo-clustering" element={<PhotoClusteringPage />} />
          <Route path="/clusters/:eventId" element={<ClusterGrid />} />
          <Route path="/cluster/:clusterId" element={<ClusterViewer />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </Router>
    </ToastProvider>
  </React.StrictMode>
)
