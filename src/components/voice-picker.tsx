"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, Search, Volume2 } from "lucide-react";
/** Based on documented elevenlabs/ui voice-picker interactions: controlled value, search, and optional audio previews.
 * Voice data must come from the user's authorized ElevenLabs account; the component makes no API calls. */
export type StudioVoice = {
  voiceId: string;
  name: string;
  previewUrl?: string;
  description?: string;
};
export function VoicePicker({
  voices,
  value,
  onValueChange,
}: {
  voices: StudioVoice[];
  value: string;
  onValueChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(
    () => () => {
      audio.current?.pause();
    },
    [],
  );
  const filtered = useMemo(
    () =>
      voices.filter((v) =>
        `${v.name} ${v.description ?? ""}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      ),
    [voices, query],
  );
  function toggle(v: StudioVoice) {
    if (!v.previewUrl) return;
    if (playing === v.voiceId) {
      audio.current?.pause();
      setPlaying("");
      return;
    }
    audio.current?.pause();
    const player = new Audio(v.previewUrl);
    audio.current = player;
    player.onended = () => setPlaying("");
    player.onerror = () => setPlaying("");
    void player
      .play()
      .then(() => setPlaying(v.voiceId))
      .catch(() => setPlaying(""));
  }
  return (
    <div className="voice-picker">
      <label className="voice-search">
        <Search size={16} />
        <input
          aria-label="ค้นหาเสียง"
          placeholder="ค้นหาเสียง"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {voices.length === 0 ? (
        <div className="voice-empty">
          <Volume2 size={20} />
          <strong>ยังไม่มีรายการเสียง</strong>
          <p>เมื่อเชื่อมต่อ ElevenLabs รายการเสียงในบัญชีจะแสดงที่นี่</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="voice-empty">ไม่พบเสียงที่ค้นหา</p>
      ) : (
        <div className="voice-list">
          {filtered.map((v) => (
            <div className="voice-row" key={v.voiceId}>
              <button
                className="voice-play"
                aria-label={`${playing === v.voiceId ? "หยุด" : "ฟังตัวอย่าง"} ${v.name}`}
                disabled={!v.previewUrl}
                onClick={() => toggle(v)}
              >
                {playing === v.voiceId ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
              </button>
              <button
                className="voice-choice"
                onClick={() => onValueChange(v.voiceId)}
              >
                <strong>{v.name}</strong>
                {v.description && <small>{v.description}</small>}
                {value === v.voiceId && <Check size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
