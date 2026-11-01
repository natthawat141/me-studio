"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  Copy,
  Folder,
  Pin,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { AppNavigation } from "@/components/app-navigation";
import { readWorkspace, saveWorkspace } from "@/lib/local-store";
import { defaultSettings, seedProjects, type Project } from "@/lib/studio-data";
import { InlineRename } from "@/components/inline-rename";
type Workspace = NonNullable<ReturnType<typeof readWorkspace>>;
export default function ProjectsPage() {
  const router = useRouter();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setData(
          readWorkspace() ?? {
            projects: seedProjects,
            selectedId: seedProjects[0].id,
            settings: defaultSettings,
            previewWidth: 53,
          },
        );
      } catch {
        setError("อ่านโปรเจกต์ไม่สำเร็จ ข้อมูลเดิมจะไม่ถูกเขียนทับ");
      }
    });
    return () => {
      active = false;
    };
  }, []);
  function commit(next: Workspace) {
    try {
      saveWorkspace(next);
      setData(next);
      return true;
    } catch {
      setError("บันทึกไม่สำเร็จ โปรดลองอีกครั้ง");
      return false;
    }
  }
  function patch(id: string, changes: Partial<Project>) {
    if (!data) return false;
    return commit({
      ...data,
      projects: data.projects.map((p) =>
        p.id === id ? { ...p, ...changes, updatedAt: Date.now() } : p,
      ),
    });
  }
  function open(p: Project) {
    if (!data) return;
    if (commit({ ...data, selectedId: p.id })) router.push("/");
  }
  function create() {
    if (!data) return;
    const id = crypto.randomUUID();
    if (
      commit({
        ...data,
        selectedId: id,
        projects: [
          { id, title: "โปรเจกต์ใหม่", messages: [], updatedAt: Date.now() },
          ...data.projects,
        ],
      })
    )
      router.push("/");
  }
  function duplicate(p: Project) {
    if (!data) return;
    const id = crypto.randomUUID();
    const copy: Project = {
      ...p,
      id,
      title: `${p.title} (สำเนา)`,
      archived: false,
      pinned: false,
      updatedAt: Date.now(),
      messages: p.messages.map((m) => ({ ...m, id: crypto.randomUUID() })),
    };
    commit({ ...data, projects: [copy, ...data.projects] });
  }
  function archive(p: Project) {
    if (!data) return;
    let projects = data.projects.map((x) =>
      x.id === p.id
        ? { ...x, archived: true, pinned: false, updatedAt: Date.now() }
        : x,
    );
    let selectedId = data.selectedId;
    if (selectedId === p.id) {
      let next = projects.find((x) => !x.archived);
      if (!next) {
        next = {
          id: crypto.randomUUID(),
          title: "โปรเจกต์ใหม่",
          messages: [],
          updatedAt: Date.now(),
        };
        projects = [next, ...projects];
      }
      selectedId = next.id;
    }
    commit({ ...data, selectedId, projects });
  }
  const visible = (data?.projects ?? [])
    .filter(
      (p) =>
        !!p.archived === archived &&
        p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt,
    );
  return (
    <main className="library-shell">
      <aside className="library-sidebar">
        <Link className="library-brand" href="/">
          <Brand />
        </Link>
        <AppNavigation active="projects" />
      </aside>
      <section className="library-main">
        <header className="library-top">
          <div>
            <h1>โปรเจกต์</h1>
            <p>จัดการเรื่องราวและงานที่กำลังสร้าง</p>
          </div>
          <div className="library-actions">
            <label className="library-search">
              <Search size={18} />
              <input
                aria-label="ค้นหาโปรเจกต์"
                placeholder="ค้นหาโปรเจกต์"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="library-upload"
              disabled={!data}
              onClick={create}
            >
              <Plus size={17} />
              โปรเจกต์ใหม่
            </button>
          </div>
        </header>
        <div
          className="library-filters"
          role="group"
          aria-label="สถานะโปรเจกต์"
        >
          <button aria-pressed={!archived} onClick={() => setArchived(false)}>
            ทั้งหมด
          </button>
          <button aria-pressed={archived} onClick={() => setArchived(true)}>
            เก็บถาวร
          </button>
        </div>
        {error && (
          <div className="library-error" role="alert">
            {error}
            <button aria-label="ปิดข้อความ" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className="project-table-wrap">
          <table className="project-table">
            <thead>
              <tr>
                <th>ชื่อโปรเจกต์</th>
                <th>อัปเดตล่าสุด</th>
                <th>เนื้อหา</th>
                <th>
                  <span className="sr-only">การจัดการ</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="project-row-name">
                      <button className="icon-btn" disabled={archived} aria-label={`เปิดโปรเจกต์ ${p.title}`} title="เปิดโปรเจกต์" onClick={() => open(p)}><Folder size={18} /></button>
                      <InlineRename value={p.title} disabled={archived} onSave={(title) => patch(p.id,{title})} />
                      {p.pinned && <Pin size={14} />}
                    </div>
                  </td>
                  <td>
                    {p.updatedAt
                      ? new Date(p.updatedAt).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "ตัวอย่าง"}
                  </td>
                  <td>
                    {p.messages.length} ข้อความ{p.videoId ? " · มีวิดีโอ" : ""}
                  </td>
                  <td>
                    <div className="project-row-actions">
                      {archived ? (
                        <button
                          className="icon-btn"
                          aria-label={`กู้คืน ${p.title}`}
                          title="กู้คืน"
                          onClick={() => patch(p.id, { archived: false })}
                        >
                          <RotateCcw size={17} />
                        </button>
                      ) : (
                        <>
                          <button
                            className="icon-btn"
                            aria-label={`${p.pinned ? "เลิกปักหมุด" : "ปักหมุด"} ${p.title}`}
                            title="ปักหมุด"
                            onClick={() => patch(p.id, { pinned: !p.pinned })}
                          >
                            <Pin size={17} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`ทำสำเนา ${p.title}`}
                            title="ทำสำเนา"
                            onClick={() => duplicate(p)}
                          >
                            <Copy size={17} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`เก็บถาวร ${p.title}`}
                            title="เก็บถาวร"
                            onClick={() => archive(p)}
                          >
                            <Archive size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && visible.length === 0 && (
            <div className="library-empty">
              <Folder size={27} />
              <p>
                {archived ? "ยังไม่มีโปรเจกต์ที่เก็บถาวร" : "ไม่พบโปรเจกต์"}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
