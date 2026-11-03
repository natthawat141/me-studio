"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Play, X } from "lucide-react";
import type { Media, Settings } from "@/lib/studio-data";
export function VideoPreview({
  media,
  settings,
  onClose,
  onImport,
  hidden = false,
}: {
  media?: Media;
  settings: Settings;
  onClose: () => void;
  onImport: () => void;
  hidden?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!media) return;
    const next = media.blob
      ? URL.createObjectURL(media.blob)
      : (media.src ?? "");
    let active = true;
    queueMicrotask(() => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
      if (media.blob) URL.revokeObjectURL(next);
    };
  }, [media]);
  useEffect(() => { if (hidden) video.current?.pause(); }, [hidden]);
  return (
    <section hidden={hidden} className="video-pane" aria-label="วิดีโอ">
      <div className="video-stage">
        <div className="video-overlay-actions">
          {url && <a className="icon-btn" href={url} download={media?.name} aria-label="ดาวน์โหลดวิดีโอ" title="ดาวน์โหลดวิดีโอ"><Download size={18} /></a>}
          <button className="icon-btn" aria-label="ปิดพื้นที่วิดีโอ" title="ปิดวิดีโอ" onClick={onClose}><X size={18} /></button>
        </div>
        {url ? (
          <video
            key={url}
            ref={video}
            src={url}
            controls
            playsInline
            preload="metadata"
            autoPlay={settings.autoPlay && !hidden}
            muted={settings.muted}
            onError={() => setError(true)}
            aria-label={media?.name}
          />
        ) : (
          <div className="video-empty">
            <Play size={26} />
            <p>เลือกวิดีโอเพื่อดูที่นี่</p>
            <button onClick={onImport}>นำเข้าวิดีโอ</button>
          </div>
        )}
        {error && (
          <p className="video-error" role="alert">
            ไม่สามารถแสดงวิดีโอนี้ได้ ลองเปิดไฟล์ MP4 ที่เบราว์เซอร์รองรับ
          </p>
        )}
      </div>
    </section>
  );
}
