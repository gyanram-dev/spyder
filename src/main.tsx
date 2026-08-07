import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ReminderWindow from './ReminderWindow';
import './index.css';

const isReminderWindow = window.location.search.includes('window=reminder') || window.location.hash.includes('reminder');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isReminderWindow ? <ReminderWindow /> : <App />}
  </React.StrictMode>,
);
