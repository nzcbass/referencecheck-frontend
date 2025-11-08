/**
 * Main App Entry Point
 * Example integration of the Reference Check system
 */

import React from 'react';
import { ReferenceRequestApp } from './ReferenceRequestApp';
import './styles.css';

// These would typically come from your authentication system
const USER_ID = '10242198-4ee0-4540-8cfd-25343df1f41d'; // From test data
const TEMPLATE_ID = '17f28d64-e746-4d06-8949-9335bb4c1740'; // From test data
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function App() {
  return (
    <div className="App">
      <ReferenceRequestApp
        userId={USER_ID}
        templateId={TEMPLATE_ID}
        apiUrl={API_URL}
      />
    </div>
  );
}

export default App;

