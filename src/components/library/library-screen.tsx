"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Download,
  File,
  FileText,
  Film,
  Grid2X2,
  Image as ImageIcon,
  LayoutList,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { AppNavigation } from "@/components/layout/app-navigation";
import {
  deleteMedia,
  loadMedia,
  readWorkspace,
  saveWorkspace,
  storeMedia,
} from "@/lib/local-store";
import { demoMedia, type Media } from "@/lib/studio-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type Filter = "all" | "video" | "image" | "audio" | "other";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "video", label: "วิดีโอ" },
  { id: "image", label: "รูปภาพ" },
  { id: "audio", label: "เสียง" },
  { id: "other", label: "ไฟล์อื่น" },
];
function kind(file: Media): Exclude<Filter, "all"> {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "other";
}
function Icon({ file, size = 22 }: { file: Media; size?: number }) {
  const type = kind(file);
  if (type === "video") return <Film size={size} />;
  if (type === "image") return <ImageIcon size={size} />;
  if (type === "audio") return <AudioLines size={size} />;
  return file.type.startsWith("text/") ? (
    <FileText size={size} />
  ) : (
    <File size={size} />
  );
}
function MediaPreview({ file }: { file: Media }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = file.blob ? URL.createObjectURL(file.blob) : (file.src ?? "");
    let active = true;
    queueMicrotask(() => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
      if (file.blob) URL.revokeObjectURL(next);
    };
  }, [file]);
  if (!url)
    return (
      <span className="asset-icon">
        <Icon file={file} size={34} />
      </span>
    );
  if (kind(file) === "image")
    return (
      <div
        className="asset-picture"
        style={{ backgroundImage: `url(${JSON.stringify(url)})` }}
        role="img"
        aria-label={`ภาพตัวอย่าง ${file.name}`}
      />
    );
  if (kind(file) === "video")
    return (
      <video
        src={url}
        preload="metadata"
        muted
        playsInline
        aria-hidden="true"
        tabIndex={-1}
      />
    );
  return (
    <span className="asset-icon">
      <Icon file={file} size={34} />
    </span>
  );
}
export function LibraryScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<Media[]>(demoMedia);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState<Media | null>(null);
  const [working, setWorking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    loadMedia()
      .then((items) => {
        if (active) setFiles([...demoMedia, ...items]);
      })
      .catch(() => {
        if (active) setError("โหลดไฟล์ในเครื่องไม่สำเร็จ ลองเปิดหน้านี้ใหม่");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function importFiles(list: FileList | null) {
    if (!list) return;
    setWorking(true);
    let failures = 0;
    const added: Media[] = [];
    for (const file of Array.from(list)) {
      if (file.size > 250 * 1024 * 1024) {
        failures++;
        continue;
      }
      const item: Media = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
      };
      try {
        await storeMedia(item);
        added.push(item);
      } catch {
        failures++;
      }
    }
    setFiles((prev) => [...prev, ...added]);
    setError(
      failures
        ? `นำเข้าไม่สำเร็จ ${failures} ไฟล์ ตรวจสอบพื้นที่และขนาดไฟล์ (สูงสุด 250 MB ต่อไฟล์)`
        : "",
    );
    setWorking(false);
    if (input.current) input.current.value = "";
  }
  const download = useCallback((file: Media) => {
    const url = file.blob ? URL.createObjectURL(file.blob) : file.src;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    if (file.blob) setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);
  async function remove(file: Media) {
    setWorking(true);
    try {
      const workspace = readWorkspace();
      if (workspace) {
        const updated = {
          ...workspace,
          projects: workspace.projects.map((p) =>
            p.videoId === file.id
              ? { ...p, videoId: undefined, updatedAt: Date.now() }
              : p,
          ),
        };
        saveWorkspace(updated);
        try {
          await deleteMedia(file.id);
        } catch (e) {
          saveWorkspace({ ...workspace, revision: updated.revision });
          throw e;
        }
      } else await deleteMedia(file.id);
      setFiles((prev) => prev.filter((item) => item.id !== file.id));
      setDeleting(null);
      setSelected(null);
    } catch {
      setError("ลบไฟล์ไม่สำเร็จ โปรดโหลดข้อมูลล่าสุดเพื่อตรวจสอบสถานะไฟล์และโปรเจกต์");
    } finally {
      setWorking(false);
    }
  }
  function openInProject(file: Media) {
    try {
      const workspace = readWorkspace();
      if (!workspace) {
        setError("กรุณาเปิดสตูดิโอก่อนเพื่อสร้างโปรเจกต์");
        return;
      }
      const selectedId = workspace.projects.some(
        (p) => p.id === workspace.selectedId,
      )
        ? workspace.selectedId
        : workspace.projects[0].id;
      saveWorkspace({
        ...workspace,
        selectedId,
        projects: workspace.projects.map((p) =>
          p.id === selectedId
            ? { ...p, videoId: file.id, updatedAt: Date.now() }
            : p,
        ),
      });
      router.push("/");
    } catch {
      setError("เปิดวิดีโอในโปรเจกต์ไม่สำเร็จ");
    }
  }
  const matches = files.filter(
    (file) =>
      (filter === "all" || kind(file) === filter) &&
      file.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <main className="library-shell">
      <aside className="library-sidebar">
        <Link className="library-brand" href="/">
          <Brand />
        </Link>
        <AppNavigation active="library" />
      </aside>
      <section className="library-main">
        <header className="library-top">
          <div>
            <h1>คลังไฟล์</h1>
            <p>ไฟล์ทั้งหมดที่นำเข้าและวิดีโอตัวอย่าง</p>
          </div>
          <div className="library-actions">
            <label className="library-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาไฟล์"
                aria-label="ค้นหาไฟล์"
              />
            </label>
            <div className="view-toggle" aria-label="รูปแบบการแสดงผล">
              <button
                aria-label="มุมมองตาราง"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <Grid2X2 size={18} />
              </button>
              <button
                aria-label="มุมมองรายการ"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <LayoutList size={18} />
              </button>
            </div>
            <button
              className="library-upload"
              disabled={working}
              onClick={() => input.current?.click()}
            >
              <Plus size={17} />
              นำเข้าไฟล์
            </button>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              onChange={(e) => void importFiles(e.target.files)}
            />
          </div>
        </header>
        <div className="library-filters" role="group" aria-label="ประเภทไฟล์">
          {filters.map((item) => (
            <button
              key={item.id}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {error && (
          <div className="library-error" role="alert">
            {error}
            <button aria-label="ปิดข้อความ" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {!ready ? (
          <p className="library-empty">กำลังโหลดไฟล์...</p>
        ) : matches.length === 0 ? (
          <div className="library-empty">
            <File size={27} />
            <p>ไม่พบไฟล์ที่ตรงกัน</p>
            <span>ลองเปลี่ยนคำค้นหาหรือเลือกประเภทอื่น</span>
          </div>
        ) : (
          <div className={`asset-grid ${view === "list" ? "asset-list" : ""}`}>
            {matches.map((file) => (
              <article className="asset-card" key={file.id}>
                <button
                  className="asset-open"
                  aria-label={`ดู ${file.name}`}
                  onClick={() => setSelected(file)}
                >
                  <span className="asset-header">
                    <Icon file={file} size={17} />
                    <span>{file.name}</span>
                  </span>
                  <span className="asset-body">
                    <MediaPreview file={file} />
                  </span>
                  <span className="asset-meta">
                    {file.src
                      ? "ตัวอย่าง"
                      : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                  </span>
                </button>
                <button
                  className="asset-download"
                  aria-label={`ดาวน์โหลด ${file.name}`}
                  title="ดาวน์โหลด"
                  onClick={() => download(file)}
                >
                  <Download size={17} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setDeleting(null);
          }
        }}
      >
        <DialogContent
          className="studio-dialog asset-dialog"
          showCloseButton={false}
        >
          <button
            className="close-dialog icon-btn"
            aria-label="ปิด"
            onClick={() => {
              setSelected(null);
              setDeleting(null);
            }}
          >
            <X size={19} />
          </button>
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>
            {selected?.src
              ? "ไฟล์ตัวอย่างที่มาพร้อมแอป"
              : "ไฟล์ที่เก็บในเบราว์เซอร์นี้"}
          </DialogDescription>
          {selected && (
            <>
              <div className="asset-detail">
                <MediaDetail file={selected} />
              </div>
              {deleting ? (
                <div className="delete-confirm" role="alert">
                  <p>
                    ลบ {deleting.name} ออกจากอุปกรณ์?
                    โปรเจกต์ที่ใช้วิดีโอนี้จะไม่แสดงคลิป และกู้คืนผ่านแอปไม่ได้
                  </p>
                  <div>
                    <button
                      disabled={working}
                      onClick={() => setDeleting(null)}
                    >
                      ยกเลิก
                    </button>
                    <button
                      disabled={working}
                      onClick={() => void remove(deleting)}
                    >
                      ยืนยันลบไฟล์
                    </button>
                  </div>
                </div>
              ) : (
                <div className="asset-detail-actions">
                  {kind(selected) === "video" && (
                    <button
                      className="library-upload"
                      onClick={() => openInProject(selected)}
                    >
                      เปิดในโปรเจกต์
                    </button>
                  )}
                  <button onClick={() => download(selected)}>
                    <Download size={16} />
                    ดาวน์โหลด
                  </button>
                  {!selected.src && (
                    <button onClick={() => setDeleting(selected)}>
                      <Trash2 size={16} />
                      ลบไฟล์
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
function MediaDetail({ file }: { file: Media }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = file.blob ? URL.createObjectURL(file.blob) : (file.src ?? "");
    let active = true;
    queueMicrotask(() => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
      if (file.blob) URL.revokeObjectURL(next);
    };
  }, [file]);
  if (!url) return null;
  if (kind(file) === "video") return <video src={url} controls playsInline />;
  if (kind(file) === "audio") return <audio src={url} controls />;
  if (kind(file) === "image")
    return (
      <div
        className="detail-image"
        style={{ backgroundImage: `url(${JSON.stringify(url)})` }}
        role="img"
        aria-label={file.name}
      />
    );
  return (
    <div className="detail-file">
      <Icon file={file} size={42} />
      <span>ดาวน์โหลดเพื่อเปิดไฟล์</span>
    </div>
  );
}
