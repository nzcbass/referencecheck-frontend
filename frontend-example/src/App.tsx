/**
 * Main App Entry Point
 * Handles routing between admin interface and referee page
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReferenceRequestApp } from './ReferenceRequestApp';
import RefereePage from './RefereePage';
import AuthorizationPage from './AuthorizationPage';
import ProfessionalReportPage from './ProfessionalReportPage';
import './styles.css';

// These would typically come from your authentication system
const USER_ID = '10242198-4ee0-4540-8cfd-25343df1f41d'; // From test data
const TEMPLATE_ID = '17f28d64-e746-4d06-8949-9335bb4c1740'; // From test data

// Switch between local development and production
const API_URL = process.env.NODE_ENV === 'production' ? 'https://referencecheck-backend-e485f62r5-brindle-c06e9d97.vercel.app/api' : 'http://localhost:5001/api';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin/Manager Interface */}
        <Route 
          path="/" 
          element={
            <div className="App">
              <ReferenceRequestApp
                userId={USER_ID}
                templateId={TEMPLATE_ID}
                apiUrl={API_URL}
              />
            </div>
          } 
        />
        
              {/* Public Referee Page */}
              <Route path="/referee/:token" element={<RefereePage apiUrl={API_URL} />} />

              {/* Public Authorization Page */}
              <Route path="/authorize" element={<AuthorizationPage />} />

              {/* Professional Report Page */}
              <Route path="/report/:requestId/referee/:refereeId" element={<ProfessionalReportPage apiUrl={API_URL} />} />

              {/* 404 - Not Found */}
        <Route 
          path="*" 
          element={
            <div style={{ 
              maxWidth: '600px', 
              margin: '50px auto', 
              padding: '30px',
              textAlign: 'center' 
            }}>
              <h2>Page Not Found</h2>
              <p>The page you're looking for doesn't exist.</p>
              <a href="/">Go to Home</a>
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

