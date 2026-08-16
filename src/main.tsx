import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ReminderWindow from './ReminderWindow';
import './index.css';

const isReminderWindow = window.location.search.includes('window=reminder') || window.location.hash.includes('reminder');

document.documentElement.style.backgroundColor = '#0b071e';
document.body.style.backgroundColor = '#0b071e';
const rootEl = document.getElementById('root');
if (rootEl) {
  rootEl.style.backgroundColor = '#0b071e';
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isReminderWindow ? <ReminderWindow /> : <App />}
  </React.StrictMode>,
);
