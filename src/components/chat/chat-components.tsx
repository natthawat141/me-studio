"use client";
import { Clapperboard, Coins, Clock3, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChatComponent } from "@/lib/chat-components";
export function ChatComponentView({
  item,
  onDecision,
}: {
  item: ChatComponent;
  onDecision?: (id: string, decision: "approve" | "decline") => void;
}) {
  if (item.type === "storyboard")
    return (
      <Card className="chat-ui-card">
        <CardHeader>
          <div className="chat-ui-icon">
            <Clapperboard size={18} />
          </div>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{item.scenes.length} ฉาก</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="storyboard-scenes">
            {item.scenes.map((scene, index) => (
              <div className="storyboard-scene" key={scene.id}>
                {scene.thumbnailUrl &&
                  /^\/demos\/storyboard\/[a-z0-9-]+\.jpg$/.test(
                    scene.thumbnailUrl,
                  ) && (
                    <div
                      className="storyboard-thumbnail"
                      style={{
                        backgroundImage: `url(${JSON.stringify(scene.thumbnailUrl)})`,
                      }}
                      role="img"
                      aria-label={`ภาพตัวอย่าง ${scene.title}`}
                    />
                  )}
                <span className="scene-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{scene.title}</strong>
                  <p>{scene.description}</p>
                  <small>
                    <Clock3 size={13} /> {scene.durationSeconds} วินาที
                  </small>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  if (item.type === "credit_approval")
    return (
      <Card className="chat-ui-card">
        <CardHeader>
          <div className="chat-ui-icon">
            <Coins size={18} />
          </div>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>ตรวจสอบก่อนเริ่มสร้าง</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="credit-summary">
            <span>เครดิตที่คาดว่าจะใช้</span>
            <strong>{item.estimatedCredits.toLocaleString()} เครดิต</strong>
          </div>
          {item.status === "pending" ? (
            <div className="credit-actions">
              <button
                onClick={() => onDecision?.(item.id, "decline")}
                disabled={!onDecision}
              >
                ยังไม่ใช่ตอนนี้
              </button>
              <button
                onClick={() => onDecision?.(item.id, "approve")}
                disabled={!onDecision}
              >
                อนุมัติ
              </button>
            </div>
          ) : (
            <p className="credit-result">
              <CheckCircle2 size={16} />{" "}
              {item.status === "approved" ? "อนุมัติแล้ว" : "ยังไม่อนุมัติ"}
            </p>
          )}
        </CardContent>
      </Card>
    );
  return (
    <Card className="chat-ui-card">
      <CardHeader>
        <CardTitle>{item.message}</CardTitle>
        <CardDescription>
          {item.status === "queued"
            ? "รอประมวลผล"
            : item.status === "running"
              ? "กำลังประมวลผล"
              : item.status === "completed"
                ? "เสร็จแล้ว"
                : "ไม่สำเร็จ"}
        </CardDescription>
      </CardHeader>
      {item.progress !== undefined && (
        <CardContent>
          <progress max={100} value={item.progress} aria-label="ความคืบหน้า" />
        </CardContent>
      )}
    </Card>
  );
}
