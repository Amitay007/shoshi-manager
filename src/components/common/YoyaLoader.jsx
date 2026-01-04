import React from 'react';

const YoyaLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
    <style>
      {`
      .loader-container { position: relative; width: 100px; height: 100px; }
      .spinner { animation: rotate 2s linear infinite; width: 100%; height: 100%; position: absolute; }
      .path { stroke: #6a5acd; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite; fill: none; stroke-width: 4; }
      .logo-text { font-size: 24px; font-weight: 800; color: #ffffff; display: flex; direction: rtl; margin-top: 20px; font-family: sans-serif; }
      .logo-text span { animation: pulse 1.5s ease-in-out infinite; margin: 0 2px; }
      @keyframes rotate { 100% { transform: rotate(360deg); } }
      @keyframes dash { 0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; stroke: #00d2ff; } 100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; } }
      @keyframes pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); color: #00d2ff; } }
      `}
    </style>
    <div className="loader-container">
      <svg className="spinner" viewBox="0 0 50 50"><circle className="path" cx="25" cy="25" r="20"></circle></svg>
    </div>
    <div className="logo-text">
       <span style={{animationDelay: '0.1s'}}>י</span>
       <span style={{animationDelay: '0.2s'}}>ו</span>
       <span style={{animationDelay: '0.3s'}}>י</span>
       <span style={{animationDelay: '0.4s'}}>ה</span>
    </div>
  </div>
);

export default YoyaLoader;