import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Unable to start the application: #root element is missing.');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

