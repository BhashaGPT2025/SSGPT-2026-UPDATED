import React from 'react';

export const AnimatedLoaderIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <style>{`
      .loader-circle {
        fill: none;
        stroke-width: 4;
        stroke-linecap: round;
        transform-origin: 50% 50%;
      }
      .c1 {
        stroke: #a5b4fc; /* indigo-300 */
        stroke-dasharray: 5 15;
        animation: rotate 10s linear infinite;
      }
      .c2 {
        stroke: #818cf8; /* indigo-400 */
        stroke-dasharray: 20 10;
        animation: rotate-rev 15s linear infinite;
      }
      .c3 {
        stroke: #6366f1; /* indigo-500 */
        stroke-dasharray: 1 3;
        animation: rotate 20s linear infinite;
      }
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes rotate-rev {
        from { transform: rotate(0deg); }
        to { transform: rotate(-360deg); }
      }
      .dark .c1 { stroke: #6366f1; }
      .dark .c2 { stroke: #4f46e5; }
      .dark .c3 { stroke: #312e81; }
    `}</style>
    <circle cx="50" cy="50" r="20" className="loader-circle c1" />
    <circle cx="50" cy="50" r="30" className="loader-circle c2" />
    <circle cx="50" cy="50" r="40" className="loader-circle c3" />
  </svg>
);