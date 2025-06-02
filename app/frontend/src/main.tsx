import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App';
import { NodeProvider } from './contexts/node-context';
import { ThemeProvider } from './providers/theme-provider';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <NodeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </NodeProvider>
    </ThemeProvider>
  </React.StrictMode>
);
