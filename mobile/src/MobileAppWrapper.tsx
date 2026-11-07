import React from 'react';
import MobileApp from './App';
import './index.css';

export function MobileAppWrapper() {
  return (
    <div data-surface="mobile" className="w-full min-h-screen">
      <MobileApp />
    </div>
  );
}

export default MobileAppWrapper;
