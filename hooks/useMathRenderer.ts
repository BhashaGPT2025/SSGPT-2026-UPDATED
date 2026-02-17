
import React, { useEffect } from 'react';

declare global {
  interface Window {
    renderMathInElement: (element: HTMLElement, options: any) => void;
  }
}

export const useMathRenderer = (
  contentRef: React.RefObject<HTMLElement>,
  dependencies: any[] = []
) => {
  useEffect(() => {
    const renderMath = () => {
      if (contentRef.current && window.renderMathInElement) {
        window.renderMathInElement(contentRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
          output: 'html',
          strict: false,
        });
      }
    };

    // Use a small timeout to ensure DOM is fully painted after pagination/updates
    const timeoutId = setTimeout(renderMath, 100);

    return () => clearTimeout(timeoutId);
  }, [contentRef, ...dependencies]);
};
