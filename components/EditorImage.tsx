
import React, { useEffect, useState } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';

// We extend the default Image extension to use a React Component for rendering
const ResizableImageComponent = ({ node, updateAttributes, selected }: any) => {
  const [width, setWidth] = useState(node.attrs.width || '100%');
  const [border, setBorder] = useState(node.attrs.border || false);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  // Sync internal state if node attributes change externally
  useEffect(() => {
    if (node.attrs.width) setWidth(node.attrs.width);
    if (node.attrs.border !== undefined) setBorder(node.attrs.border);
  }, [node.attrs]);

  const handleResize = (direction: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = parseInt(width.toString().replace('px', ''), 10) || 300; // Default fallback

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Simple resize logic: mostly horizontal drag affects width
      const newWidth = Math.max(50, startWidth + (direction === 'right' ? deltaX : -deltaX));
      setWidth(`${newWidth}px`);
    };

    const onMouseUp = () => {
      updateAttributes({ width: `${width}` }); // Commit change
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const toggleBorder = () => {
    const newBorder = !border;
    setBorder(newBorder);
    updateAttributes({ border: newBorder });
  };

  return (
    <NodeViewWrapper className="relative inline-block leading-none select-none group transition-all">
      <div className={`relative ${selected ? 'ring-2 ring-indigo-500' : ''}`} style={{ width: width, display: 'inline-block' }}>
        <img
          src={node.attrs.src}
          alt={node.attrs.alt}
          style={{
            width: '100%',
            height: 'auto',
            border: border ? '2px solid #000' : 'none',
            display: 'block',
          }}
          className="rounded-sm"
          draggable="true"
          data-drag-handle
        />
        
        {/* Resize Handles (Only show when selected) */}
        {selected && (
          <>
            {/* Right Handle */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-8 bg-indigo-500 rounded-full cursor-ew-resize z-10 shadow-md border-2 border-white"
              onMouseDown={(e) => handleResize('right', e as any)}
            />
            {/* Left Handle */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-8 bg-indigo-500 rounded-full cursor-ew-resize z-10 shadow-md border-2 border-white"
              onMouseDown={(e) => handleResize('left', e as any)}
            />
            
            {/* Toolbar */}
            <div className="absolute top-0 right-0 -translate-y-full px-2 py-1 bg-slate-800 text-white text-xs rounded-t-md flex gap-2 shadow-xl z-20">
               <button onClick={toggleBorder} className="hover:text-indigo-300">
                 {border ? 'Remove Border' : 'Add Border'}
               </button>
               <div className="w-px h-3 bg-slate-600 my-auto"/>
               {/* Simple Crop simulation by forcing object-fit logic would be here, but simpler is better for now */}
               {/* <button onClick={() => alert('Cropping requires saving state. Drag corner to resize instead.')} className="hover:text-indigo-300">Crop</button> */}
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Custom Extension that uses the React Component
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '50%',
        renderHTML: (attributes) => ({
          width: attributes.width,
        }),
      },
      border: {
        default: false,
        renderHTML: (attributes) => {
            if(attributes.border) return { style: 'border: 2px solid black' };
            return {};
        }
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },
});

export default function EditorImage({ editor }: { editor: Editor }) {
    // This component purely registers the extension if needed, 
    // but typically extensions are registered in useEditor.
    // We export CustomImage for use in Editor.tsx
    return null; 
}

// Export the customized extension for the main Editor to use
export { CustomImage };
