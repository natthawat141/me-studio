"use client";
import { useEffect, useRef, useState } from 'react';

/** Opaque sandbox: project animation has neither Node access nor the desktop preload bridge. */
export function ScenePreview({ url }: { url: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(entries => setScale(entries[0].contentRect.width / 1080));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={box} className="desktop-scene-frame"><iframe key={url} src={url} title="พรีวิวฉากการ์ตูน" sandbox="allow-scripts" referrerPolicy="no-referrer" style={{ width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: 'top left' }} /></div>;
}
