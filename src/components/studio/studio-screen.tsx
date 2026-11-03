"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import {
  ArrowUp,
  Download,
  Film,
  LoaderCircle,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Paperclip,
  Pin,
  Play,
  Plus,
  Search,
  Square,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { InlineRename } from "@/components/projects/inline-rename";
import { AppNavigation } from "@/components/layout/app-navigation";
import { VoiceMenu } from "@/components/media/voice-menu";
import { ModelSelect } from "@/components/chat/model-select";
import { chatModelLabel, chatModelKey, chatModelStorageKey, type ChatModel } from "@/lib/chat-models";
import { persistProjectAgentSettings } from "@/services/project-agent-settings";
import { loadProviderCatalog } from "@/services/provider-catalog";
import { DraftStore } from "@/lib/draft-store";
import { ChatComponentView } from "@/components/chat/chat-components";
import { AgentSettingsPanel } from "@/components/studio/agent-settings-panel";
import { getAgentSettings, type AgentSettings } from "@/lib/agent-settings";
import { useMediaQuery } from "@/hooks/use-media-query";
import { VideoPreview } from "@/components/media/video-preview";
import {
  defaultSettings,
  demoMedia,
  prompts,
  seedProjects,
  type Media,
  type Project,
} from "@/lib/studio-data";
import {
  loadMedia,
  readWorkspace,
  saveWorkspace,
  storeMedia,
  WorkspaceConflictError,
} from "@/lib/local-store";
import { requestAssistant } from "@/lib/assistant";

export function StudioScreen() {
  const [projects, setProjects] = useState<Project[]>([
    {id:"start",title:"โปรเจกต์ใหม่",messages:[],updatedAt:0}, ...seedProjects,
  ]);
  const [selectedId, setSelectedId] = useState("start");
  const [media, setMedia] = useState<Media[]>(demoMedia);
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const agentSettingsTrigger = useRef<HTMLButtonElement>(null);
  const mobile = useMediaQuery('(max-width: 600px)');
  const [chatModel, setChatModel] = useState<ChatModel>({ provider: "", modelId: "" });
  const [previewWidth, setPreviewWidth] = useState(53);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const fileInput = useRef<HTMLInputElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const revision = useRef(0);
  const drafts = useRef(new DraftStore());
  const [chatModelChoices, setChatModelChoices] = useState<(ChatModel & {label:string})[]>([]);
  const current = projects.find((p) => p.id === selectedId) ?? projects[0];
  const selectedMedia = media.find((m) => m.id === current.videoId);
  const projectAgentSettings = getAgentSettings(current.agentSettings);
  const effectiveChatModel = projectAgentSettings.chatModel ?? chatModel;
  const rightPanelOpen = agentSettingsOpen || Boolean(previewOpen && selectedMedia);
  function closeAgentSettings() {
    setAgentSettingsOpen(false);
    requestAnimationFrame(() => agentSettingsTrigger.current?.focus());
  }
  function saveAgentSettings(value: AgentSettings) {
    if (!ready || storageError) return false;
    try {
      const snapshot = persistProjectAgentSettings({projects,selectedId,settings,previewWidth,revision:revision.current},current.id,value);
      revision.current = snapshot.revision ?? 0;
      setProjects(snapshot.projects);
      return true;
    } catch (error) {
      if (error instanceof WorkspaceConflictError) setStorageError(true);
      setNotice(error instanceof WorkspaceConflictError ? error.message : 'บันทึกการตั้งค่า Agent ไม่สำเร็จ');
      return false;
    }
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (window.matchMedia("(max-width: 850px)").matches) setSidebarOpen(false);
        const savedWidth = Number(
          localStorage.getItem("me-studio.sidebar-width.v1"),
        );
        if (
          Number.isFinite(savedWidth) &&
          savedWidth >= 180 &&
          savedWidth <= 360
        )
          setSidebarWidth(savedWidth);
        try {
          const savedChatModel = localStorage.getItem(chatModelStorageKey);
          if (savedChatModel) {
            const model: unknown = JSON.parse(savedChatModel);
            if (model && typeof model === "object" && "provider" in model && "modelId" in model && typeof model.provider === "string" && typeof model.modelId === "string") setChatModel({ provider: model.provider, modelId: model.modelId });
          }
        } catch { setNotice("อ่านโมเดลที่เลือกไว้ไม่สำเร็จ โปรดเลือกใหม่ในตั้งค่า"); }
        const stored = readWorkspace();
        if (stored?.projects.length) {
          revision.current = stored.revision ?? 0;
          setProjects(stored.projects);
          setSelectedId(stored.selectedId);
          setSettings(stored.settings ?? defaultSettings);
          setPreviewWidth(
            Math.max(30, Math.min(70, stored.previewWidth ?? 53)),
          );
        }
        const files = await loadMedia();
        if (active) setMedia([...demoMedia, ...files]);
      } catch {
        if (active) {
          setStorageError(true);
          setNotice(
            "โหลดข้อมูลในเครื่องไม่สำเร็จ ระบบหยุดบันทึกอัตโนมัติเพื่อรักษาข้อมูลเดิม",
          );
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    const timer = window.setTimeout(() => {
      try {
        const snapshot = { projects, selectedId, settings, previewWidth, revision: revision.current };
        saveWorkspace(snapshot);
        revision.current = snapshot.revision;
      } catch (error) {
        if (error instanceof WorkspaceConflictError) {
          setStorageError(true);
          setNotice(error.message);
        } else setNotice("บันทึกข้อมูลไม่สำเร็จ พื้นที่ในเบราว์เซอร์อาจเต็ม");
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [projects, selectedId, settings, previewWidth, ready, storageError]);
  useEffect(() => {
    const abort = new AbortController();
    loadProviderCatalog(abort.signal).then((catalog) => setChatModelChoices(catalog.models)).catch(() => {
      if (!abort.signal.aborted) setNotice("โหลดรายการโมเดลไม่สำเร็จ ตรวจสอบการตั้งค่าเซิร์ฟเวอร์");
    });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    conversation.current?.scrollTo({
      top: conversation.current.scrollHeight,
      behavior: "smooth",
    });
  }, [current.id, current.messages.length, pendingId]);
  function updateProject(id: string, patch: Partial<Project>) {
    setProjects((p) =>
      p.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item,
      ),
    );
  }
  function select(id: string) {
    drafts.current.save(current.id, { text: draft, attachmentIds: attachments });
    const next = drafts.current.read(id);
    setSelectedId(id);
    setDraft(next.text);
    setAttachments(next.attachmentIds);
  }
  function createProject() {
    const id = crypto.randomUUID();
    setProjects((p) => [
      { id, title: "โปรเจกต์ใหม่", messages: [], updatedAt: Date.now() },
      ...p,
    ]);
    select(id);
  }
  async function importFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 250 * 1024 * 1024) {
        setNotice("ไฟล์ต้องมีขนาดไม่เกิน 250 MB");
        continue;
      }
      const asset: Media = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
      };
      try {
        await storeMedia(asset);
        setMedia((prev) => [...prev, asset]);
        if (file.type.startsWith("video/")) {
          updateProject(current.id, { videoId: asset.id });
          setPreviewOpen(true);
        } else {
          setAttachments((prev) => [...prev, asset.id]);
        }
        setNotice(`เก็บ ${file.name} ในเครื่องแล้ว`);
      } catch {
        setNotice(`ไม่สามารถบันทึก ${file.name} ได้`);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  async function send() {
    if ((!draft.trim() && !attachments.length) || pendingId) return;
    const text = draft.trim() || "แนบไฟล์ประกอบ";
    const id = current.id;
    const names = attachments.map(
      (file) => media.find((m) => m.id === file)?.name ?? "ไฟล์",
    );
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      text,
      files: names,
      attachmentIds: [...attachments],
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              title: p.title === "โปรเจกต์ใหม่" ? text.slice(0, 40) : p.title,
              messages: [...p.messages, userMessage],
              updatedAt: Date.now(),
            }
          : p,
      ),
    );
    drafts.current.save(id, { text: "", attachmentIds: [] });
    setDraft("");
    setAttachments([]);
    setPendingId(id);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await requestAssistant({
        projectId: id, message: text, attachmentIds: [...attachments],
        model: effectiveChatModel.modelId ? effectiveChatModel : null,
        agentSettings: getAgentSettings(current.agentSettings),
      }, abort.signal);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                messages: [
                  ...p.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: response,
                  },
                ],
              }
            : p,
        ),
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setNotice("ส่งข้อความไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setPendingId(null);
    }
  }
  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function resize(event: PointerEvent<HTMLDivElement>) {
    if (
      !event.currentTarget.hasPointerCapture(event.pointerId) ||
      !shell.current
    )
      return;
    const bounds = shell.current.getBoundingClientRect();
    setPreviewWidth(
      Math.max(
        30,
        Math.min(70, ((bounds.right - event.clientX) / bounds.width) * 100),
      ),
    );
  }
  function downloadProject() {
    const blob = new Blob([JSON.stringify(current, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${current.title}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const sortedProjects = [...projects].sort(
    (a, b) =>
      Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt,
  );
  const filtered = sortedProjects.filter(
    (p) =>
      !p.archived &&
      p.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <main
      className={`me-studio ${sidebarOpen ? "" : "sidebar-collapsed"}`}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <aside className="side" inert={agentSettingsOpen && mobile}>
        <div className="brand-row">
          <Brand />
          <button
            className="icon-btn"
            aria-label="ซ่อนเมนู"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose size={19} />
          </button>
        </div>
        <button className="new-button" aria-label="สร้างโปรเจกต์ใหม่" onClick={createProject}>
          <Plus size={18} /> โปรเจกต์ใหม่
        </button>
        <AppNavigation active="studio" />
        <label className="project-search">
          <Search size={17} />
          <input
            placeholder="ค้นหาโปรเจกต์"
            aria-label="ค้นหาโปรเจกต์"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <p className="recent-label">ล่าสุด</p>
        <div className="recent-projects">
          {filtered.map((p) => (
            <button
              className={current.id === p.id ? "active-project" : ""}
              key={p.id}
              onClick={() => select(p.id)}
            >
              {p.pinned ? <Pin size={16} /> : <MessageSquare size={16} />}
              <span>{p.title}</span>
            </button>
          ))}
          {!filtered.length && <p className="muted">ไม่พบโปรเจกต์</p>}
        </div>
        <footer>
          <Link className="account-link" href="/login">
            เข้าสู่ระบบ / สมัครสมาชิก
          </Link>
        </footer>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="ปิดเมนู" onClick={() => setSidebarOpen(false)} />}
      {sidebarOpen && (
        <div
          className="sidebar-resize"
          role="separator"
          aria-label="ปรับความกว้างแถบด้านข้าง"
          aria-orientation="vertical"
          aria-valuemin={180}
          aria-valuemax={360}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            setSidebarWidth(
              Math.max(180, Math.min(360, Math.round(e.clientX))),
            );
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            localStorage.setItem(
              "me-studio.sidebar-width.v1",
              String(sidebarWidth),
            );
          }}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const width = Math.max(
              180,
              Math.min(360, sidebarWidth + (e.key === "ArrowRight" ? 10 : -10)),
            );
            setSidebarWidth(width);
            localStorage.setItem("me-studio.sidebar-width.v1", String(width));
          }}
        />
      )}
      <div
        ref={shell}
        className={`workspace ${rightPanelOpen ? "" : "preview-closed"}`}
        style={{ "--preview-width": `${previewWidth}%` } as CSSProperties}
      >
        <section className="chat" inert={agentSettingsOpen && mobile}>
          <header className="studio-header">
            {!sidebarOpen && (
              <button
                className="icon-btn"
                aria-label="เปิดเมนู"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
            )}
            <InlineRename key={current.id} value={current.title} onSave={(title) => updateProject(current.id, {title})} />
            <button className="icon-btn" aria-label="ดาวน์โหลดข้อมูลโปรเจกต์" title="ดาวน์โหลดข้อมูลโปรเจกต์" onClick={downloadProject}><Download size={17} /></button>
          </header>
          <div className="chat-scroll" ref={conversation}>
            {current.messages.length ? (
              <div className="thread">
                {current.messages.map((m) => (
                  <article className={`chat-message ${m.role}`} key={m.id}>
                    {m.role === "assistant" && (
                      <div className="assistant-name">me studio</div>
                    )}
                    <p>{m.text}</p>
                    {m.components?.map((component) => (
                      <ChatComponentView key={component.id} item={component} />
                    ))}
                    {m.files?.map((name, index) => (
                      <span
                        className="attachment-chip"
                        key={`${name}-${index}`}
                      >
                        <Paperclip size={12} />
                        {name}
                      </span>
                    ))}
                  </article>
                ))}
                {current.videoId && (
                  <button
                    className="video-artifact"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <span>
                      <Play size={17} />
                    </span>
                    <div>
                      <strong>{selectedMedia?.name ?? "วิดีโอ"}</strong>
                      <small>เปิดวิดีโอด้านขวา</small>
                    </div>
                  </button>
                )}
                {pendingId === current.id && (
                  <div className="processing">
                    <LoaderCircle size={15} className="spin" />
                    กำลังประมวลผลตัวอย่าง
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-chat">
                <Film size={32} />
                <h1>วันนี้อยากสร้างเรื่องอะไร?</h1>
                <p>เล่าไอเดียของคุณ หรือเริ่มจากวิดีโอที่มี</p>
                <div>
                  {prompts.map((p) => (
                    <button key={p} onClick={() => setDraft(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="input-area">
            {notice && (
              <div className="notice" role="status">
                <span>{notice}</span>
                <button aria-label="ปิดข้อความ" onClick={() => setNotice("")}>
                  <X size={14} />
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="prompt-box"
            >
              {attachments.length > 0 && (
                <div className="attachments">
                  {attachments.map((id) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() =>
                        setAttachments((p) => p.filter((item) => item !== id))
                      }
                    >
                      {media.find((m) => m.id === id)?.name}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}
              <textarea
                aria-label="ข้อความถึงผู้ช่วย"
                placeholder="พิมพ์เพื่อสร้างหรือแก้ไขการ์ตูน..."
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <div className="prompt-tools">
                <div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="นำเข้าไฟล์"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Plus size={20} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    ref={agentSettingsTrigger}
                    aria-label="การตั้งค่า Agent"
                    aria-expanded={agentSettingsOpen}
                    onClick={() => setAgentSettingsOpen((open) => !open)}
                  >
                    <SettingsIcon size={19} />
                  </button>
                  <VoiceMenu />
                  <div className="chat-model-choice">
                    {chatModelChoices.length || effectiveChatModel.modelId ? <ModelSelect
                      label="เลือกโมเดลแชต"
                      placeholder="เลือกโมเดล"
                      value={chatModelKey(effectiveChatModel)}
                      onChange={(key) => {
                        const choice = chatModelChoices.find((item) => chatModelKey(item) === key);
                        const next = choice ? { provider: choice.provider, modelId: choice.modelId } : effectiveChatModel;
                        saveAgentSettings({...projectAgentSettings,chatModel:next});
                      }}
                      options={[
                        ...(!chatModelChoices.some((item) => chatModelKey(item) === chatModelKey(effectiveChatModel)) && effectiveChatModel.modelId ? [{ value: chatModelKey(effectiveChatModel), label: chatModelLabel(effectiveChatModel) }] : []),
                        ...chatModelChoices.map((item) => ({ value: chatModelKey(item), label: item.label })),
                      ]}
                    /> : <Link href="/settings?section=models" className="composer-choice">เพิ่มโมเดล <Plus size={14} /></Link>}
                  </div>
                </div>
                {pendingId ? (
                  <button
                    className="send-button"
                    type="button"
                    aria-label="หยุดคำตอบ"
                    onClick={() => controller.current?.abort()}
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    className="send-button"
                    disabled={!ready || (!draft.trim() && !attachments.length)}
                    aria-label="ส่งข้อความ"
                  >
                    <ArrowUp size={20} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
        {rightPanelOpen && (
          <>
            <div
              className="resize-handle"
              role="separator"
              aria-label="ปรับขนาดแผงด้านขวา"
              aria-orientation="vertical"
              aria-valuemin={30}
              aria-valuemax={70}
              aria-valuenow={Math.round(previewWidth)}
              tabIndex={0}
              onPointerDown={startResize}
              onPointerMove={resize}
              onPointerUp={(e) =>
                e.currentTarget.releasePointerCapture(e.pointerId)
              }
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  e.preventDefault();
                  setPreviewWidth((w) =>
                    Math.max(
                      30,
                      Math.min(70, w + (e.key === "ArrowLeft" ? 2 : -2)),
                    ),
                  );
                }
              }}
            >
              <span />
            </div>
            {agentSettingsOpen && <AgentSettingsPanel key={current.id} value={projectAgentSettings} models={chatModelChoices} onChange={saveAgentSettings} onClose={closeAgentSettings} hasVideo={Boolean(previewOpen && selectedMedia)} disabled={!ready || storageError} />}
            {previewOpen && selectedMedia && <VideoPreview
              hidden={agentSettingsOpen}
              key={selectedMedia?.id ?? "empty"}
              media={selectedMedia}
              settings={settings}
              onClose={() => setPreviewOpen(false)}
              onImport={() => fileInput.current?.click()}
            />}
          </>
        )}
      </div>
      <input
        type="file"
        multiple
        ref={fileInput}
        hidden
        onChange={(e) => void importFiles(e.target.files)}
      />

    </main>
  );
}
