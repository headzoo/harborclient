import type { JSX } from 'react';
import { ResizeHandle, useResizable } from '#/renderer/src/components/Resizable';

/**
 * Right-side AI panel shell. Content is added in future work; this component
 * only provides layout, resize, and visibility wiring from the parent.
 */
export function AiSidebar(): JSX.Element {
  const {
    size: width,
    minSize: sidebarMinSize,
    maxSize: sidebarMaxSize,
    onResizeStart,
    onKeyboardResize
  } = useResizable({
    axis: 'x',
    direction: -1,
    defaultSize: 320,
    minSize: 240,
    getMaxSize: () => 640,
    storageKey: 'hc.aiSidebarWidth'
  });

  return (
    <>
      <ResizeHandle
        orientation="vertical"
        value={width}
        min={sidebarMinSize}
        max={sidebarMaxSize}
        onResizeStart={onResizeStart}
        onKeyboardResize={onKeyboardResize}
        ariaLabel="Resize AI sidebar"
        className="border-r-0 border-l border-separator"
      />
      <aside className="flex shrink-0 flex-col bg-sidebar" style={{ width }} aria-label="AI" />
    </>
  );
}
