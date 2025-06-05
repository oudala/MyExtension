import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Imports your App component
import './index.css'; // Assuming you have a global CSS file (optional)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
