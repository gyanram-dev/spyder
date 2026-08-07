import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ReminderWindow from './ReminderWindow';
import './index.css';

const isReminderWindow = window.location.search.includes('window=reminder') || window.location.hash.includes('reminder');

if (isReminderWindow) {
  document.documentElement.style.backgroundColor = 'transparent';
  document.body.style.backgroundColor = 'transparent';
} else {
  document.documentElement.style.backgroundColor = '#120305';
  document.body.style.backgroundColor = '#120305';
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isReminderWindow ? <ReminderWindow /> : <App />}
  </React.StrictMode>,
);
