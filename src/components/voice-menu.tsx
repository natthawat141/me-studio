"use client";

import { Popover } from "@base-ui/react/popover";
import { AudioLines, ChevronDown, PlugZap } from "lucide-react";
import Link from "next/link";

export function VoiceMenu() {
  return (
    <Popover.Root>
      <Popover.Trigger className="composer-choice" aria-label="เลือกเสียงบรรยาย">
        <AudioLines size={16} /> <span>เสียงบรรยาย</span> <ChevronDown size={14} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} className="voice-popover-position">
          <Popover.Popup className="voice-popover">
            <Popover.Title>เสียงบรรยาย</Popover.Title>
            <Popover.Description>เลือกเสียงจากบัญชี ElevenLabs ของคุณ</Popover.Description>
            <div className="voice-connect-state">
              <PlugZap size={19} />
              <div><strong>ยังไม่ได้เชื่อมต่อ ElevenLabs</strong><p>เชื่อมต่อเพื่อเลือกและฟังตัวอย่างเสียง</p></div>
            </div>
            <Link href="/settings?section=connections">ไปที่การเชื่อมต่อ</Link>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
