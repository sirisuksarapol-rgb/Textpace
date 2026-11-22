import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  Plus,
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  Loader2,
  Trash2,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCw,
  ArrowLeft,
  Cpu,
  Quote,
  FileCheck2,
  Sun,
  Moon,
  Globe,
  AlertCircle,
  BookOpen,
  Pencil,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  workspaceApi,
  type WorkspaceFile,
  type ChatMessage,
  type CollectionDetail,
} from "../services/workspaceApi";

interface AiModelOption {
  id: string;
  label: string;
  provider: string;
}

interface ChatLocationState {
  initialDetail?: CollectionDetail;
}

const AI_MODELS: AiModelOption[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "Google",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    provider: "DeepSeek",
  },
];

interface CitationAccordionProps {
  citations: NonNullable<ChatMessage["citations"]>;
  sourceLabel: string;
  pagePrefix: string;
  onSelectCitation?: (
    citation: NonNullable<ChatMessage["citations"]>[number],
  ) => void;
}

function CitationAccordion({
  citations,
  sourceLabel,
  pagePrefix,
  onSelectCitation,
}: CitationAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer py-0.5"
      >
        <span className="inline-flex items-center gap-1">
          <Quote className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            {sourceLabel} ({citations.length})
          </span>
        </span>
        <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 shrink-0">
          {isOpen ? "ซ่อน" : "ดูแหล่งอ้างอิง"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-1.5 space-y-1.5">
          {citations.map((cit, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectCitation?.(cit)}
              className="w-full text-left text-[11px] px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer space-y-0.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400 truncate">
                  {idx + 1}. {cit.fileName}
                </span>
                <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                  {pagePrefix} {cit.page}
                </span>
              </div>
              {cit.excerpt && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                  “{cit.excerpt}”
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { lang, toggleLang, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams<{ chatId?: string }>();
  const activeChatId = chatId || "";
  const routeState = (location.state as ChatLocationState | null) || null;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // เปิดแถบไฟล์อัตโนมัติเฉพาะบน Desktop (>= 1024px) และใช้เป็น Slide-over Drawer บนมือถือ/แท็บเล็ต
  const [isLeftOpen, setIsLeftOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<"chat" | "viewer">("chat");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  const initialDetail = routeState?.initialDetail;
  const [workspaceName, setWorkspaceName] = useState<string>(
    initialDetail?.name || "",
  );
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [draftName, setDraftName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  const [combinedWiki, setCombinedWiki] = useState<string>(
    initialDetail?.combinedWiki || "",
  );
  const [files, setFiles] = useState<WorkspaceFile[]>(
    initialDetail?.documents || [],
  );
  const [selectedFileId, setSelectedFileId] = useState<string>(
    initialDetail?.documents[0]?.id || "",
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialDetail?.messages || [],
  );

  const [viewerTab, setViewerTab] = useState<"file" | "wiki">("file");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [textFileContent, setTextFileContent] = useState<string>("");
  const [isLoadingFileViewer, setIsLoadingFileViewer] =
    useState<boolean>(false);

  const [isLoadingDetail, setIsLoadingDetail] =
    useState<boolean>(!initialDetail);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const selectedFile =
    files.find((f) => f.id === selectedFileId) || files[0] || null;
  const currentModelObj =
    AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

  const closeLeftDrawerOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsLeftOpen(false);
    }
  };

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (!activeChatId) return;

    if (
      routeState?.initialDetail &&
      routeState.initialDetail.id === activeChatId
    ) {
      setWorkspaceName(routeState.initialDetail.name);
      setCombinedWiki(routeState.initialDetail.combinedWiki || "");
      setFiles(routeState.initialDetail.documents);
      setSelectedFileId(routeState.initialDetail.documents[0]?.id || "");
      setMessages(routeState.initialDetail.messages);
      setIsLoadingDetail(false);
      return;
    }

    let isCancelled = false;

    const loadDetail = async () => {
      setIsLoadingDetail(true);
      setChatError(null);
      try {
        const detail = await workspaceApi.getCollectionDetail(activeChatId);
        if (!isCancelled) {
          setWorkspaceName(detail.name);
          setCombinedWiki(detail.combinedWiki);
          setFiles(detail.documents);
          setSelectedFileId(detail.documents[0]?.id || "");
          setMessages(detail.messages);
        }
      } catch (err) {
        if (!isCancelled) {
          setChatError(
            err instanceof Error
              ? err.message
              : lang === "th"
                ? "ไม่สามารถโหลดข้อมูลห้องแชทได้"
                : "Failed to load workspace",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDetail(false);
        }
      }
    };

    loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [activeChatId, routeState, lang]);

  useEffect(() => {
    if (!activeChatId || !selectedFile) {
      setPdfBlobUrl(null);
      setTextFileContent("");
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;

    const loadFileContent = async () => {
      setIsLoadingFileViewer(true);
      try {
        const blob = await workspaceApi.fetchDocumentFile(
          activeChatId,
          selectedFile.id,
        );
        if (isCancelled) return;

        if (selectedFile.typeLabel === "PDF") {
          objectUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(objectUrl);
          setTextFileContent("");
        } else {
          const text = await blob.text();
          if (!isCancelled) {
            setTextFileContent(text);
            setPdfBlobUrl(null);
          }
        }
      } catch {
        if (!isCancelled) {
          setPdfBlobUrl(null);
          setTextFileContent(
            lang === "th"
              ? "ไม่สามารถแสดงตัวอย่างไฟล์ต้นฉบับได้"
              : "Unable to preview raw file",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingFileViewer(false);
        }
      }
    };

    loadFileContent();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeChatId, selectedFile, lang]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, mobilePane]);

  const handleStartEditName = () => {
    if (!activeChatId || isSavingName) return;
    setDraftName(workspaceName);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setDraftName(workspaceName);
  };

  const handleCommitEditName = async () => {
    const trimmed = draftName.trim();
    setIsEditingName(false);

    if (!trimmed || trimmed === workspaceName || !activeChatId) {
      setDraftName(workspaceName);
      return;
    }

    const previousName = workspaceName;
    setWorkspaceName(trimmed);
    setIsSavingName(true);
    setChatError(null);

    try {
      const updated = await workspaceApi.updateCollection(
        activeChatId,
        trimmed,
      );
      setWorkspaceName(updated.name);
    } catch (err) {
      setWorkspaceName(previousName);
      setChatError(
        err instanceof Error
          ? err.message
          : lang === "th"
            ? "แก้ไขชื่อโปรเจคไม่สำเร็จ"
            : "Failed to rename workspace",
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleCommitEditName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEditName();
    }
  };

  const handleAddFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0 || !activeChatId) return;

    setIsUploading(true);
    setChatError(null);
    try {
      const addedDocs = await workspaceApi.uploadDocuments(
        activeChatId,
        picked,
      );
      setFiles((prev) => [...addedDocs, ...prev]);
      if (addedDocs.length > 0) {
        setSelectedFileId(addedDocs[0].id);
        if (addedDocs[0].summaryWiki) {
          setCombinedWiki(addedDocs[0].summaryWiki);
        } else {
          const freshWiki = await workspaceApi.getCombinedWiki(activeChatId);
          setCombinedWiki(freshWiki);
        }
      }
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : lang === "th"
            ? "อัปโหลดไฟล์ไม่สำเร็จ"
            : "Failed to upload files",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = async (docId: string) => {
    if (!activeChatId) return;
    try {
      await workspaceApi.deleteDocument(activeChatId, docId);
      const remaining = files.filter((f) => f.id !== docId);
      setFiles(remaining);
      if (selectedFileId === docId) {
        setSelectedFileId(remaining[0]?.id || "");
      }
      if (remaining.length > 0) {
        const freshWiki = await workspaceApi.getCombinedWiki(activeChatId);
        setCombinedWiki(freshWiki);
      } else {
        setCombinedWiki("");
      }
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : lang === "th"
            ? "ลบไฟล์ไม่สำเร็จ"
            : "Failed to delete document",
      );
    }
  };

  const handleResetChat = async () => {
    if (!activeChatId || messages.length === 0) return;
    try {
      await workspaceApi.resetChatHistory(activeChatId);
      setMessages([]);
      setInputText("");
      setChatError(null);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : lang === "th"
            ? "ล้างประวัติแชทไม่สำเร็จ"
            : "Failed to clear chat history",
      );
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending || !activeChatId) return;

    const nowLabel = new Date().toLocaleTimeString(
      lang === "th" ? "th-TH" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const userMsgId = `u-${Date.now()}`;
    const aiMsgId = `a-${Date.now() + 1}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: trimmed,
      timestamp: nowLabel,
    };

    const placeholderAiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      modelUsed: currentModelObj.label,
      citations: [],
      timestamp: nowLabel,
    };

    setMessages((prev) => [...prev, userMsg, placeholderAiMsg]);
    setInputText("");
    setIsSending(true);
    setChatError(null);

    try {
      await workspaceApi.streamChatMessage(
        activeChatId,
        trimmed,
        selectedModel,
        {
          onCitations: (citations) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, citations } : m)),
            );
          },
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: m.content + token } : m,
              ),
            );
          },
        },
      );
    } catch (err) {
      setMessages((prev) =>
        prev.filter((m) => m.id !== aiMsgId || m.content.trim().length > 0),
      );
      setChatError(
        err instanceof Error
          ? err.message
          : lang === "th"
            ? "เกิดข้อผิดพลาดในการส่งข้อความ"
            : "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const filteredFiles = files.filter((f) => {
    const q = fileSearchQuery.trim().toLowerCase();
    return q ? f.name.toLowerCase().includes(q) : true;
  });

  const getModelDisplayLabel = (modelId?: string) => {
    if (!modelId) return currentModelObj.label;
    return AI_MODELS.find((m) => m.id === modelId)?.label || modelId;
  };

  const t = {
    th: {
      defaultTitle: "คอลเลกชันเอกสาร",
      editTitleHint: "คลิกเพื่อแก้ไขชื่อโปรเจค",
      addFileBtn: isUploading ? "กำลังประมวลผลรวม..." : "เพิ่มไฟล์",
      searchDocs: "ค้นหาไฟล์...",
      docsLabel: "ไฟล์ในห้องแชท",
      readyStatus: "พร้อมใช้",
      noDocs: 'ยังไม่มีไฟล์ในห้องแชทนี้ กดปุ่ม "เพิ่มไฟล์" เพื่ออัปโหลด',
      backHome: "กลับหน้าหลัก",
      tabRawFile: "เอกสารต้นฉบับ",
      tabWikiSummary: `สรุปรวมทุกไฟล์ (${files.length})`,
      combinedWikiBanner: `สังเคราะห์และประมวลผลรวมจากเอกสารทั้งหมด ${files.length} ไฟล์ในโปรเจคนี้`,
      noWikiSummary: "ยังไม่มีสรุปรวมสำหรับโปรเจคนี้",
      noSelectedDoc: "เลือกไฟล์จากรายการทางซ้ายเพื่อดูเนื้อหา",
      loadingDoc: "กำลังโหลดเนื้อหาเอกสาร...",
      chatbotTitle: "Textspace AI",
      chatbotSubtitle: "ผู้ช่วยถาม-ตอบเอกสาร",
      resetChat: "ล้างประวัติแชท",
      emptyChatTitle: "ถาม-ตอบกับเอกสารของคุณ",
      emptyChatDesc:
        "สอบถามประเด็นสำคัญ สรุปเนื้อหา หรือคำนวณข้อมูลรวมจากทุกไฟล์ที่แนบไว้",
      docNotice:
        files.length > 0
          ? `ประมวลผลรวมเอกสาร ${files.length} ไฟล์ในโปรเจคนี้แล้ว`
          : "ยังไม่มีไฟล์เอกสาร กรุณาเพิ่มไฟล์ก่อนเริ่มถาม",
      inputPlaceholder: "พิมพ์คำถามเกี่ยวกับเอกสารทั้งหมด...",
      disclaimer:
        "AI อาจทำผิดพลาดได้ โปรดตรวจสอบข้อมูลจากเอกสารต้นฉบับอีกครั้ง",
      sourceLabel: "แหล่งอ้างอิง",
      pagePrefix: "หน้า",
      collapseLeft: "พับเก็บแถบไฟล์",
      expandLeft: "ขยายแถบไฟล์",
      collapseRight: "พับเก็บหน้าต่างแชท",
      expandRight: "ขยายหน้าต่างแชท",
      mobileChatTab: "แชท AI",
      mobileDocsTab: "เอกสาร",
      openFilesDrawer: "รายการไฟล์ในโปรเจค",
    },
    en: {
      defaultTitle: "Document Collection",
      editTitleHint: "Click to rename project",
      addFileBtn: isUploading ? "Processing all..." : "Add File",
      searchDocs: "Search files...",
      docsLabel: "Workspace Files",
      readyStatus: "Ready",
      noDocs: 'No files in this workspace. Click "Add File" to upload.',
      backHome: "Back to Home",
      tabRawFile: "Source Document",
      tabWikiSummary: `Combined Wiki (${files.length})`,
      combinedWikiBanner: `Synthesized together across all ${files.length} file(s) in this project`,
      noWikiSummary: "No combined summary available for this project.",
      noSelectedDoc: "Select a file on the left to preview its content",
      loadingDoc: "Loading document content...",
      chatbotTitle: "Textspace AI",
      chatbotSubtitle: "Document Assistant",
      resetChat: "Reset conversation",
      emptyChatTitle: "Chat with your documents",
      emptyChatDesc:
        "Ask questions, synthesize insights, or calculate across all files together",
      docNotice:
        files.length > 0
          ? `Combined ${files.length} file(s) in this project`
          : "No files attached yet. Add a file to ground answers.",
      inputPlaceholder: "Ask a question across all files...",
      disclaimer:
        "AI can make mistakes. Please verify important details against the source.",
      sourceLabel: "Sources",
      pagePrefix: "Page",
      collapseLeft: "Collapse files panel",
      expandLeft: "Expand files panel",
      collapseRight: "Collapse chat panel",
      expandRight: "Expand chat panel",
      mobileChatTab: "AI Chat",
      mobileDocsTab: "Documents",
      openFilesDrawer: "Workspace files",
    },
  }[lang];

  const showRightContent = isRightOpen || mobilePane === "chat";

  return (
    <div className="h-screen h-dvh flex flex-col lg:flex-row bg-slate-100/90 dark:bg-slate-950 p-2 sm:p-3 gap-2 sm:gap-3 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* ================= แถบนำทางด้านบนสำหรับ Mobile & Tablet (< 1024px) ================= */}
      <header className="lg:hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs px-2.5 sm:px-3.5 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsLeftOpen(true)}
            title={t.openFilesDrawer}
            aria-label={t.openFilesDrawer}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {files.length}
            </span>
          </button>

          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {workspaceName || t.defaultTitle}
          </span>
        </div>

        {/* ตัวสลับมุมมองเต็มจอระหว่าง แชท AI กับ เอกสาร */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setMobilePane("chat")}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mobilePane === "chat"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span>{t.mobileChatTab}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobilePane("viewer")}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              mobilePane === "viewer"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>{t.mobileDocsTab}</span>
          </button>
        </div>
      </header>

      {/* Backdrop สำหรับ Mobile/Tablet Files Drawer (< 1024px) */}
      {isLeftOpen && (
        <div
          onClick={() => setIsLeftOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* ================= 1. การ์ดซ้าย: รายการไฟล์ในห้องแชท (Drawer บนมือถือ/แท็บเล็ต, Sidebar บน Desktop) ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:static rounded-r-2xl lg:rounded-2xl bg-white dark:bg-slate-900 border-r lg:border border-slate-200/80 dark:border-slate-800 shadow-xl lg:shadow-2xs flex flex-col justify-between transition-all duration-200 shrink-0 overflow-hidden ${
          isLeftOpen
            ? "translate-x-0 w-[85vw] max-w-xs lg:w-72"
            : "-translate-x-full lg:translate-x-0 w-[85vw] max-w-xs lg:w-12"
        }`}
      >
        {isLeftOpen ? (
          <>
            <div className="p-4 space-y-3.5 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-2xs shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>

                  {isEditingName ? (
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => void handleCommitEditName()}
                      onKeyDown={handleNameKeyDown}
                      aria-label={t.editTitleHint}
                      className="w-full min-w-0 px-2 py-0.5 rounded-lg border border-blue-500 bg-blue-50/50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEditName}
                      title={t.editTitleHint}
                      className="group/title flex items-center gap-1.5 min-w-0 flex-1 text-left rounded-lg px-1.5 py-0.5 -ml-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    >
                      <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {workspaceName || t.defaultTitle}
                      </h1>
                      {isSavingName ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
                      ) : (
                        <Pencil className="w-3 h-3 text-slate-400 opacity-70 lg:opacity-0 lg:group-hover/title:opacity-100 transition-opacity shrink-0" />
                      )}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsLeftOpen(false)}
                  title={t.collapseLeft}
                  aria-label={t.collapseLeft}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.csv"
                  onChange={handleAddFiles}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold shadow-2xs shadow-blue-600/20 transition-colors cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{t.addFileBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen((prev) => !prev);
                    if (isSearchOpen) setFileSearchQuery("");
                  }}
                  title={t.searchDocs}
                  aria-label={t.searchDocs}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    isSearchOpen
                      ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              {isSearchOpen && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder={t.searchDocs}
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-base lg:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                  {fileSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setFileSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t.docsLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {files.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {isLoadingDetail ? (
                  <div className="space-y-2">
                    {[1, 2].map((n) => (
                      <div
                        key={n}
                        className="h-14 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 px-2 leading-relaxed">
                    {t.noDocs}
                  </p>
                ) : (
                  filteredFiles.map((file) => {
                    const isSelected = file.id === selectedFile?.id;
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          setSelectedFileId(file.id);
                          setViewerTab("file");
                          setMobilePane("viewer");
                          closeLeftDrawerOnMobile();
                        }}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? "bg-blue-50/85 dark:bg-blue-950/45 border-blue-200 dark:border-blue-800/80 shadow-2xs"
                            : "bg-slate-50/70 dark:bg-slate-800/40 border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200/70 dark:border-slate-700"
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p
                              className={`text-xs font-semibold truncate ${
                                isSelected
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {file.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{file.typeLabel}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                {t.readyStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRemoveFile(file.id);
                          }}
                          aria-label="Remove file"
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 lg:p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 shrink-0">
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-0"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">{t.backHome}</span>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleLang}
                  title="TH / EN"
                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold uppercase text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{lang}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {theme === "light" ? (
                    <Moon className="w-3.5 h-3.5" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-between h-full p-2">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLeftOpen(true)}
                title={t.expandLeft}
                aria-label={t.expandLeft}
                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t.addFileBtn}
                aria-label={t.addFileBtn}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/home")}
              title={t.backHome}
              aria-label={t.backHome}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ================= 2. การ์ดตรงกลาง: พื้นที่แสดงเนื้อหาเอกสาร & สรุปรวมโปรเจค ================= */}
      <main
        className={`flex-1 min-w-0 min-h-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex-col overflow-hidden ${
          mobilePane === "viewer" ? "flex" : "hidden lg:flex"
        }`}
      >
        {isLoadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p>{t.loadingDoc}</p>
          </div>
        ) : selectedFile ? (
          <>
            <div className="px-3 sm:px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {viewerTab === "wiki"
                    ? workspaceName || t.defaultTitle
                    : selectedFile.name}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  {viewerTab === "wiki"
                    ? `${files.length} FILES`
                    : selectedFile.typeLabel}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setViewerTab("file")}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    viewerTab === "file"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {t.tabRawFile}
                </button>
                <button
                  type="button"
                  onClick={() => setViewerTab("wiki")}
                  className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    viewerTab === "wiki"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="w-3 h-3 shrink-0" />
                  <span>{t.tabWikiSummary}</span>
                </button>
              </div>
            </div>

            {viewerTab === "wiki" ? (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 text-xs text-blue-700 dark:text-blue-300 flex items-start sm:items-center gap-2 leading-relaxed">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                    <span>{t.combinedWikiBanner}</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {combinedWiki ||
                      selectedFile.summaryWiki ||
                      t.noWikiSummary}
                  </pre>
                </div>
              </div>
            ) : isLoadingFileViewer ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>{t.loadingDoc}</span>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title={selectedFile.name}
                className="w-full flex-1 border-0 bg-slate-50 dark:bg-slate-950"
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
                <div className="max-w-3xl mx-auto">
                  <pre className="whitespace-pre-wrap break-words font-sans text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {textFileContent}
                  </pre>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 text-xs text-slate-400 gap-3">
            <FileText className="w-10 h-10 opacity-35" />
            <p className="max-w-xs leading-relaxed">{t.noSelectedDoc}</p>
            <button
              type="button"
              onClick={() => setIsLeftOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addFileBtn}</span>
            </button>
          </div>
        )}
      </main>

      {/* ================= 3. การ์ดขวา: หน้าต่างแชท Textspace AI ================= */}
      <aside
        className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex-col transition-all duration-200 shrink-0 overflow-hidden ${
          mobilePane === "chat"
            ? "flex flex-1 min-h-0 w-full"
            : "hidden lg:flex"
        } ${
          isRightOpen
            ? "lg:flex-initial lg:w-96 xl:w-[410px]"
            : "lg:flex-initial lg:w-12"
        }`}
      >
        {showRightContent ? (
          <>
            <div className="px-3 sm:px-3.5 py-2.5 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsRightOpen(false)}
                  title={t.collapseRight}
                  aria-label={t.collapseRight}
                  className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <PanelRightClose className="w-4 h-4" />
                </button>

                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-2xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute bottom-0 right-0" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {t.chatbotTitle}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {t.chatbotSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative flex items-center">
                  <Cpu className="w-3 h-3 text-blue-600 dark:text-blue-400 absolute left-2.5 pointer-events-none" />
                  <select
                    aria-label="Select AI Model"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="pl-7 pr-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 cursor-pointer max-w-[118px] sm:max-w-[145px] truncate"
                  >
                    {AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void handleResetChat()}
                  title={t.resetChat}
                  aria-label={t.resetChat}
                  className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {chatError && (
              <div className="mx-3.5 mt-3 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[11px] flex items-start gap-2 shrink-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="break-words">{chatError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col">
              {messages.length === 0 ? (
                <div className="my-auto flex flex-col items-center text-center px-3 space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/10 to-indigo-500/10 border border-blue-200/70 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {t.emptyChatTitle}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-[260px] mx-auto">
                      {t.emptyChatDesc}
                    </p>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border max-w-full ${
                      files.length > 0
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/70 dark:border-blue-800/60 text-blue-700 dark:text-blue-300"
                        : "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-800/60 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        files.length > 0
                          ? "bg-blue-600 dark:bg-blue-400"
                          : "bg-amber-500"
                      }`}
                    />
                    <span className="truncate">{t.docNotice}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isUser
                              ? "bg-blue-600 text-white"
                              : "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60"
                          }`}
                        >
                          {isUser ? (
                            <User className="w-3.5 h-3.5" />
                          ) : (
                            <Bot className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div
                          className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed space-y-2 break-words ${
                            isUser
                              ? "bg-blue-600 text-white rounded-tr-sm"
                              : "bg-slate-100/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-sm"
                          }`}
                        >
                          {!isUser && (
                            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                              <span className="truncate">
                                {getModelDisplayLabel(msg.modelUsed)}
                              </span>
                              <span className="text-slate-400 font-normal shrink-0">
                                {msg.timestamp}
                              </span>
                            </div>
                          )}

                          {msg.content ? (
                            <p className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span>กำลังค้นหาและสรุปคำตอบ...</span>
                            </span>
                          )}

                          {!isUser &&
                            msg.citations &&
                            msg.citations.length > 0 && (
                              <CitationAccordion
                                citations={msg.citations}
                                sourceLabel={t.sourceLabel}
                                pagePrefix={t.pagePrefix}
                                onSelectCitation={(cit) => {
                                  const matched = files.find(
                                    (f) =>
                                      f.name.toLowerCase() ===
                                      cit.fileName.toLowerCase(),
                                  );
                                  if (matched) {
                                    setSelectedFileId(matched.id);
                                    setViewerTab("file");
                                    setMobilePane("viewer");
                                  }
                                }}
                              />
                            )}
                        </div>
                      </div>
                    );
                  })}

                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-3.5 pt-2 shrink-0"
            >
              <div className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-colors">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.inputPlaceholder}
                  className="flex-1 min-w-0 bg-transparent text-base lg:text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  aria-label="Send message"
                  className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 enabled:bg-blue-600 enabled:hover:bg-blue-700 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2 leading-snug">
                {t.disclaimer}
              </p>
            </form>
          </>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-between h-full p-2">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRightOpen(true)}
                title={t.expandRight}
                aria-label={t.expandRight}
                className="p-2 rounded-xl text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsRightOpen(true)}
                title={t.chatbotTitle}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}