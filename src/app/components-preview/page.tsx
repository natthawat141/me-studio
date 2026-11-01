"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Blocks } from "lucide-react";
import { Brand } from "@/components/brand";
import { ChatComponentView } from "@/components/chat-components";
import type { ChatComponent } from "@/lib/chat-components";
const storyboard: ChatComponent = {
  type: "storyboard",
  id: "demo-board",
  title: "สตอรี่บอร์ด: กล่องปริศนา",
  scenes: [
    {
      id: "1",
      title: "เริ่มการผจญภัย",
      thumbnailUrl: "/demos/storyboard/scene-1.jpg",
      description: "แมวตัวน้อยออกเดินทาง",
      durationSeconds: 8,
    },
    {
      id: "2",
      title: "พบกล่องปริศนา",
      thumbnailUrl: "/demos/storyboard/scene-2.jpg",
      description: "เจอกล่องแปลกตาและเข้าไปสำรวจ",
      durationSeconds: 12,
    },
    {
      id: "3",
      title: "ช่วงเวลาสนุก",
      thumbnailUrl: "/demos/storyboard/scene-3.jpg",
      description: "จบการผจญภัยด้วยรอยยิ้ม",
      durationSeconds: 10,
    },
  ],
};
export default function ComponentsPreview() {
  const [approval, setApproval] = useState<"pending" | "approved" | "declined">(
    "pending",
  );
  const item: ChatComponent = {
    type: "credit_approval",
    id: "demo-credit",
    title: "ขออนุมัติสร้างวิดีโอ",
    estimatedCredits: 120,
    status: approval,
  };
  return (
    <main className="library-shell">
      <aside className="library-sidebar">
        <Link className="library-brand" href="/">
          <Brand />
        </Link>
        <Link className="library-back" href="/">
          <ArrowLeft size={17} />
          กลับสู่สตูดิโอ
        </Link>
        <Link className="library-back" href="/settings">
          <Blocks size={17} />
          ตั้งค่า
        </Link>
      </aside>
      <section className="library-main component-preview-page">
        <header className="library-top">
          <div>
            <h1>ตัวอย่างส่วนประกอบแชต</h1>
            <p>ตัวอย่างสำหรับออกแบบการเชื่อมต่อ AI</p>
          </div>
        </header>
        <div className="component-demo-note" role="note">
          ข้อมูลและเครดิตในหน้านี้เป็นตัวอย่าง การกดอนุมัติไม่มีการเรียก API
          หรือหักเครดิต
        </div>
        <div className="component-demo-grid">
          <section>
            <h2>สตอรี่บอร์ด</h2>
            <ChatComponentView item={storyboard} />
          </section>
          <section>
            <h2>ขออนุมัติเครดิต</h2>
            <ChatComponentView
              item={item}
              onDecision={(_, decision) =>
                setApproval(decision === "approve" ? "approved" : "declined")
              }
            />
            <button
              className="demo-reset"
              onClick={() => setApproval("pending")}
            >
              เริ่มตัวอย่างใหม่
            </button>
          </section>
          <section>
            <h2>ความคืบหน้า</h2>
            <ChatComponentView
              item={{
                type: "job_status",
                id: "demo-progress",
                status: "running",
                message: "กำลังสร้างฉาก",
                progress: 45,
              }}
            />
          </section>
        </div>
      </section>
    </main>
  );
}
