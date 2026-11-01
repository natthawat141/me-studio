"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  KeyRound,
  Bot,
  Blocks,
  MonitorPlay,
  Settings,
  Search,
  UserRound,
} from "lucide-react";
import { ProviderSettings } from "@/components/provider-settings";
import { readWorkspace, saveWorkspace } from "@/lib/local-store";
import { defaultSettings, seedProjects } from "@/lib/studio-data";
const sections = [
  { id: "general", label: "ทั่วไป", icon: Settings },
  { id: "profile", label: "โปรไฟล์", icon: UserRound },
  { id: "models", label: "โมเดลแชต", icon: Bot },
  { id: "connections", label: "การเชื่อมต่อ", icon: KeyRound },
  { id: "playback", label: "การเล่นวิดีโอ", icon: MonitorPlay },
  { id: "components", label: "ส่วนประกอบแชต", icon: Blocks },
] as const;
type Section = (typeof sections)[number]["id"];
export default function SettingsPage() {
  const [section, setSection] = useState<Section>("general");
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState({ displayName: "", email: "" });
  const [playback, setPlayback] = useState(defaultSettings);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const requested = new URLSearchParams(window.location.search).get("section");
        if (sections.some((item) => item.id === requested)) setSection(requested as Section);
        const raw = localStorage.getItem("me-studio.profile.v1");
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed === "object" &&
            "displayName" in parsed &&
            "email" in parsed &&
            typeof parsed.displayName === "string" &&
            typeof parsed.email === "string"
          )
            setProfile({
              displayName: parsed.displayName,
              email: parsed.email,
            });
        }
        const data = readWorkspace();
        if (data) setPlayback(data.settings);
        setReady(true);
      } catch {
        setNotice("อ่านข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูลในเบราว์เซอร์");
      }
    });
    return () => {
      active = false;
    };
  }, []);
  function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      localStorage.setItem("me-studio.profile.v1", JSON.stringify(profile));
      setNotice("บันทึกโปรไฟล์แล้ว");
    } catch {
      setNotice("บันทึกโปรไฟล์ไม่สำเร็จ");
    }
  }
  function changePlayback(name: "autoPlay" | "muted", value: boolean) {
    try {
      const next = { ...playback, [name]: value };
      const workspace = readWorkspace() ?? {
        projects: seedProjects,
        selectedId: seedProjects[0].id,
        settings: defaultSettings,
        previewWidth: 53,
      };
      saveWorkspace({ ...workspace, settings: next });
      setPlayback(next);
      setNotice("บันทึกการตั้งค่าแล้ว");
    } catch {
      setNotice("บันทึกการตั้งค่าไม่สำเร็จ");
    }
  }
  return (
    <main className="settings-shell">
      <aside className="settings-sidebar">
        <Link className="settings-return" href="/"><ArrowLeft size={19} /> กลับไปที่สตูดิโอ</Link>
        <label className="settings-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาการตั้งค่า" aria-label="ค้นหาการตั้งค่า" /></label>
        <nav aria-label="หมวดหมู่การตั้งค่า">
          {sections.filter((item) => item.label.includes(search.trim())).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined} onClick={() => { setSection(item.id); setNotice(""); }}><Icon size={18} />{item.label}</button>;
          })}
        </nav>
      </aside>
      <section className="settings-content">
        <div className="settings-content-inner">
          <header className="settings-heading"><h1>{sections.find((item) => item.id === section)?.label}</h1></header>
        {notice && (
          <p className="settings-toast" role="status">
            {notice}
          </p>
        )}
        <div className="settings-sections">
          {section === "general" && <div className="settings-intro"><h2>ตั้งค่าสตูดิโอ</h2><p>จัดการโปรไฟล์ โมเดล และการเล่นวิดีโอจากเมนูด้านซ้าย</p><div className="settings-overview"><button onClick={() => setSection("profile")}><UserRound size={18} /><span><strong>โปรไฟล์</strong><small>ชื่อและข้อมูลของคุณ</small></span></button><button onClick={() => setSection("models")}><Bot size={18} /><span><strong>โมเดลแชต</strong><small>เลือกผู้ให้บริการและโมเดล</small></span></button><button onClick={() => setSection("connections")}><KeyRound size={18} /><span><strong>การเชื่อมต่อ</strong><small>บริการเสียงและ API</small></span></button></div></div>}
          {section === "profile" && <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <UserRound size={19} />
              </span>
              <div>
                <h2>โปรไฟล์</h2>
                <p>ข้อมูลที่แสดงบนอุปกรณ์นี้</p>
              </div>
            </div>
            <form onSubmit={saveProfile}>
              <label>
                ชื่อที่แสดง
                <input
                  value={profile.displayName}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, displayName: e.target.value }))
                  }
                  placeholder="ชื่อของคุณ"
                />
              </label>
              <label>
                อีเมล
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="name@example.com"
                />
              </label>
              <button className="settings-save" disabled={!ready}>
                บันทึกโปรไฟล์
              </button>
            </form>
          </section>}
          {section === "models" && <ProviderSettings section="models" />}
          {section === "components" && <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <Blocks size={19} />
              </span>
              <div>
                <h2>ส่วนประกอบแชต</h2>
                <p>ตรวจหน้าตา storyboard และการอนุมัติเครดิต</p>
              </div>
            </div>
            <Link className="settings-preview-link" href="/components-preview">
              ดูตัวอย่าง component
            </Link>
          </section>}
          {section === "connections" && <ProviderSettings section="connections" />}
          {section === "playback" && <section className="settings-card">
            <div className="settings-card-heading">
              <span>
                <MonitorPlay size={19} />
              </span>
              <div>
                <h2>การเล่นวิดีโอ</h2>
                <p>ตั้งค่าเริ่มต้นของตัวเล่น</p>
              </div>
            </div>
            <div className="settings-fields">
              <label>
                <span>เล่นอัตโนมัติเมื่อเปิดคลิป</span>
                <input
                  disabled={!ready}
                  type="checkbox"
                  checked={playback.autoPlay}
                  onChange={(e) => changePlayback("autoPlay", e.target.checked)}
                />
              </label>
              <label>
                <span>ปิดเสียงเมื่อเปิดคลิป</span>
                <input
                  disabled={!ready}
                  type="checkbox"
                  checked={playback.muted}
                  onChange={(e) => changePlayback("muted", e.target.checked)}
                />
              </label>
            </div>
          </section>}
          <p className="settings-explanation">
            โปรไฟล์และการตั้งค่าเก็บในเบราว์เซอร์นี้ ยังไม่ได้ซิงก์กับบัญชี
          </p>
        </div>
        </div>
      </section>
    </main>
  );
}
