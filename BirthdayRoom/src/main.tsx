import React from 'react';
import ReactDOM from 'react-dom/client';
import { birthday } from './config/birthday';
import App from './App';
import './style.css';

document.title = birthday.pageTitle;
const root = document.documentElement;
for (const [name, value] of Object.entries(birthday.theme)) root.style.setProperty(`--${name}`, value);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
