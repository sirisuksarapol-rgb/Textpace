import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SquarePen,
  LayoutGrid,
  Plus,
  BookOpen,
  FileText,
  ListFilter,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Moon,
  Globe,
  LogOut,
  Paperclip,
  Scale,
  FileSearch,
  ListChecks,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import CreateCollectionModal, { type NewCollectionPayload } from '../components/CreateCollectionModal';
import { workspaceApi, type CollectionSummary, type CollectionDetail } from '../services/workspaceApi';

interface StoredUser {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface HomeUploadTask {
  id: string;
  collectionName: string;
  fileCount: number;
  status: 'uploading' | 'success' | 'error';
  createdDetail?: CollectionDetail;
  errorMessage?: string;
}

export default function HomePage() {
  const { lang, toggleLang, theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string>('');
  const [uploadTasks, setUploadTasks] = useState<HomeUploadTask[]>([]);

  // เปิดอัตโนมัติเฉพาะบน Tablet/Desktop (>= 768px) และพับเก็บเป็น Drawer บนมือถือ
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  let currentUser: StoredUser | null = null;
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (raw) currentUser = JSON.parse(raw) as StoredUser;
  } catch {
    currentUser = null;
  }

  const fullName =
    [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ').trim() ||
    currentUser?.username ||
    currentUser?.email ||
    'Guest User';
  const shortName = currentUser?.first_name || currentUser?.username || 'คุณ';
  const avatarInitial = fullName.charAt(0).toUpperCase();

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchCollections = async () => {
      setIsLoadingCollections(true);
      setErrorMsg(null);
      try {
        const data = await workspaceApi.listCollections();
        if (!isCancelled) {
          setCollections(data);
          if (data.length > 0) {
            setActiveCollectionId(data[0].id);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : lang === 'th'
                ? 'ไม่สามารถโหลดข้อมูลคอลเลกชันได้'
                : 'Failed to load collections'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCollections(false);
        }
      }
    };

    fetchCollections();

    return () => {
      isCancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const handleOpenNewModal = () => {
    closeSidebarOnMobile();
    setIsModalOpen(true);
  };

  const dismissUploadTask = (taskId: string) => {
    setUploadTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const handleCreateCollection = async ({ name, description, files }: NewCollectionPayload) => {
    // ปิด Modal ทันทีเพื่อให้ผู้ใช้ไปใช้งานส่วนอื่นต่อได้โดยไม่ต้องรอหน้าค้าง
    setIsModalOpen(false);

    const taskId = `create-${Date.now()}`;
    const tempId = `temp-${Date.now()}`;
    const trimmedName = name.trim();

    const optimisticSummary: CollectionSummary = {
      id: tempId,
      name: trimmedName,
      description: description || '',
      docCount: files.length,
      messageCount: 0,
      updatedAt: lang === 'th' ? 'กำลังอัปโหลด...' : 'Uploading...',
    };

    setCollections((prev) => [optimisticSummary, ...prev]);
    setUploadTasks((prev) => [
      {
        id: taskId,
        collectionName: trimmedName,
        fileCount: files.length,
        status: 'uploading',
      },
      ...prev,
    ]);

    void (async () => {
      try {
        const created = await workspaceApi.createCollection(trimmedName, description || '', files);

        const newSummary: CollectionSummary = {
          id: created.id,
          name: created.name,
          description: created.description,
          docCount: created.documents.length,
          messageCount: 0,
          updatedAt: lang === 'th' ? 'เมื่อสักครู่' : 'Just now',
        };

        setCollections((prev) =>
          prev.map((item) => (item.id === tempId ? newSummary : item))
        );
        setActiveCollectionId(created.id);

        setUploadTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, status: 'success', createdDetail: created }
              : task
          )
        );
      } catch (err) {
        setCollections((prev) => prev.filter((item) => item.id !== tempId));
        const errText =
          err instanceof Error
            ? err.message
            : lang === 'th'
              ? 'สร้างคอลเลกชันไม่สำเร็จ'
              : 'Failed to create collection';

        setUploadTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, status: 'error', errorMessage: errText }
              : task
          )
        );
      }
    })();
  };

  const handleOpenCollection = (collectionId: string) => {
    if (collectionId.startsWith('temp-')) return;
    setActiveCollectionId(collectionId);
    closeSidebarOnMobile();
    navigate(`/chat/${collectionId}`);
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredCollections = collections.filter((item) => {
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    );
  });

  const sortedCollections = sortNewestFirst
    ? filteredCollections
    : [...filteredCollections].reverse();

  const t = {
    th: {
      newChat: 'แชทใหม่',
      library: 'คลังเอกสาร',
      collectionSection: 'คอลเลกชัน',
      newCollection: 'คอลเลกชันใหม่',
      allChatsSection: 'ทั้งหมด',
      searchPlaceholder: 'ค้นหาคอลเลกชัน...',
      filterTooltip: sortNewestFirst ? 'เรียงจากล่าสุด' : 'เรียงจากเก่าสุด',
      collapseSidebar: 'พับเก็บเมนู',
      expandSidebar: 'ขยายเมนู',
      workspacePlan: 'Textspace Workspace',
      logout: 'ออกจากระบบ',
      switchLang: 'เปลี่ยนภาษา (TH / EN)',
      switchTheme: theme === 'light' ? 'เปลี่ยนเป็นโหมดมืด' : 'เปลี่ยนเป็นโหมดสว่าง',
      greetingPrefix: `สวัสดี, ${shortName}`,
      greetingSub: 'วันนี้ให้ Textspace ช่วยค้นหาอะไรในเอกสารของคุณดี?',
      promptBoxPlaceholder: 'ตั้งชื่อห้องแชทและแนบเอกสารอย่างน้อย 1 ไฟล์เพื่อเริ่มถาม-ตอบ...',
      attachAndStart: 'แนบไฟล์ & เริ่มแชท',
      recentTitle: 'คอลเลกชันล่าสุดของคุณ',
      filesUnit: 'ไฟล์',
      msgsUnit: 'ข้อความ',
      processingTag: 'กำลังนำเข้าเอกสาร...',
      uploadingTaskTitle: (name: string) => `กำลังสร้าง "${name}"`,
      uploadingTaskDesc: 'กำลังอัปโหลดและประมวลผลไฟล์ คุณสามารถใช้งานส่วนอื่นต่อได้เลย',
      uploadDoneTitle: (name: string) => `"${name}" พร้อมใช้งานแล้ว`,
      openChatBtn: 'เปิดห้องแชท',
      uploadFailTitle: 'สร้างคอลเลกชันไม่สำเร็จ',
      emptySearch: 'ไม่พบรายการที่ค้นหา',
      emptyCollections: 'ยังไม่มีคอลเลกชันเอกสาร กดปุ่ม "แนบไฟล์ & เริ่มแชท" เพื่อเริ่มต้น',
      loadingText: 'กำลังโหลดคอลเลกชัน...',
      suggestions: [
        {
          icon: BookOpen,
          title: 'สรุปใจความสำคัญ',
          desc: 'ย่อเนื้อหาหลักจากไฟล์ PDF หรือรายงานยาว ๆ ให้กระชับ',
        },
        {
          icon: Scale,
          title: 'เปรียบเทียบข้อมูล',
          desc: 'วิเคราะห์ความแตกต่างและจุดเด่นระหว่างเอกสารหลายฉบับ',
        },
        {
          icon: ListChecks,
          title: 'ดึงข้อกำหนดและเงื่อนไข',
          desc: 'รวบรวมตัวเลข วันที่ และข้อควรระวังสำคัญในสัญญา',
        },
        {
          icon: FileSearch,
          title: 'ถาม-ตอบพร้อมแหล่งอ้างอิง',
          desc: 'ค้นหาคำตอบเชิงลึกพร้อมระบุหน้าและย่อหน้าต้นฉบับ',
        },
      ],
    },
    en: {
      newChat: 'New chat',
      library: 'Document library',
      collectionSection: 'Collections',
      newCollection: 'New collection',
      allChatsSection: 'All workspaces',
      searchPlaceholder: 'Search collections...',
      filterTooltip: sortNewestFirst ? 'Sorted by newest' : 'Sorted by oldest',
      collapseSidebar: 'Collapse menu',
      expandSidebar: 'Expand menu',
      workspacePlan: 'Textspace Workspace',
      logout: 'Log out',
      switchLang: 'Switch language (TH / EN)',
      switchTheme: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode',
      greetingPrefix: `Hello, ${shortName}`,
      greetingSub: 'What would you like to explore in your documents today?',
      promptBoxPlaceholder: 'Name a workspace and attach at least 1 file to start chatting...',
      attachAndStart: 'Attach & Start',
      recentTitle: 'Your Recent Collections',
      filesUnit: 'files',
      msgsUnit: 'messages',
      processingTag: 'Indexing documents...',
      uploadingTaskTitle: (name: string) => `Creating "${name}"`,
      uploadingTaskDesc: 'Uploading & indexing files in background. Feel free to keep browsing',
      uploadDoneTitle: (name: string) => `"${name}" is ready`,
      openChatBtn: 'Open Chat',
      uploadFailTitle: 'Creation failed',
      emptySearch: 'No matching items found',
      emptyCollections: 'No collections yet. Click "Attach & Start" to create your first workspace.',
      loadingText: 'Loading collections...',
      suggestions: [
        {
          icon: BookOpen,
          title: 'Summarize Key Points',
          desc: 'Condense lengthy PDFs or reports into clear takeaways',
        },
        {
          icon: Scale,
          title: 'Compare Documents',
          desc: 'Analyze differences and highlights across multiple files',
        },
        {
          icon: ListChecks,
          title: 'Extract Terms & Dates',
          desc: 'Pull key clauses, deadlines, and figures from contracts',
        },
        {
          icon: FileSearch,
          title: 'Cited Q&A Search',
          desc: 'Get grounded answers with exact page and snippet citations',
        },
      ],
    },
  }[lang];

  return (
    <div className="h-screen h-dvh flex bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors relative">
      {/* Backdrop สำหรับ Mobile Drawer (< 768px) */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* ================= Responsive Left Sidebar ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 md:static shrink-0 h-full bg-slate-50/98 dark:bg-slate-900/95 border-r border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-200 ${
          isSidebarOpen
            ? 'translate-x-0 w-72 max-w-[85vw]'
            : '-translate-x-full md:translate-x-0 w-72 md:w-16 overflow-hidden'
        }`}
      >
        {isSidebarOpen ? (
          <>
            {/* 1. ส่วนหัว Sidebar */}
            <div className="px-4 pt-4 pb-2 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <Link
                  to="/home"
                  onClick={closeSidebarOnMobile}
                  className="flex items-center gap-2.5 group min-w-0"
                >
                  <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-2xs shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white truncate">
                    Textspace
                  </span>
                </Link>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen((prev) => !prev);
                      if (isSearchOpen) setSearchQuery('');
                    }}
                    title={t.searchPlaceholder}
                    aria-label={t.searchPlaceholder}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isSearchOpen
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    title={t.collapseSidebar}
                    aria-label={t.collapseSidebar}
                    className="w-9 h-9 rounded-full bg-slate-200/75 dark:bg-slate-800/90 hover:bg-slate-300/75 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isSearchOpen && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-8 pr-7 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. รายการเมนู + คอลเลกชัน + รายการทั้งหมด */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5">
              <nav className="space-y-0.5">
                <button
                  type="button"
                  onClick={handleOpenNewModal}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                >
                  <SquarePen className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span className="truncate">{t.newChat}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const readyCol = collections.find((c) => !c.id.startsWith('temp-'));
                    if (readyCol) {
                      handleOpenCollection(readyCol.id);
                    } else {
                      handleOpenNewModal();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                >
                  <LayoutGrid className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span className="truncate">{t.library}</span>
                </button>
              </nav>

              <div className="space-y-1">
                <div className="px-3.5 pb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t.collectionSection}
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewModal}
                  className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span className="truncate">{t.newCollection}</span>
                </button>

                {filteredCollections.slice(0, 5).map((col) => {
                  const isTemp = col.id.startsWith('temp-');
                  return (
                    <button
                      key={col.id}
                      type="button"
                      disabled={isTemp}
                      onClick={() => handleOpenCollection(col.id)}
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 disabled:opacity-70 transition-colors text-left cursor-pointer"
                    >
                      {isTemp ? (
                        <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{col.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <div className="px-3.5 pb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t.allChatsSection}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSortNewestFirst((prev) => !prev)}
                    title={t.filterTooltip}
                    aria-label={t.filterTooltip}
                    className="p-1 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isLoadingCollections ? (
                  <div className="px-3.5 py-3 flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>{t.loadingText}</span>
                  </div>
                ) : sortedCollections.length === 0 ? (
                  <p className="px-3.5 py-2 text-xs text-slate-400">{t.emptySearch}</p>
                ) : (
                  sortedCollections.map((item) => {
                    const isActive = item.id === activeCollectionId;
                    const isTemp = item.id.startsWith('temp-');
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isTemp}
                        onClick={() => handleOpenCollection(item.id)}
                        className={`w-full flex items-center justify-between gap-2 text-left px-3.5 py-2 rounded-full text-sm transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-200/85 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/55 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        {isTemp && (
                          <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. ส่วนท้าย Sidebar ติดขอบล่างสุด: โปรไฟล์ผู้ใช้ + ปุ่มตั้งค่า */}
            <div
              ref={settingsMenuRef}
              className="relative p-3 border-t border-slate-200/70 dark:border-slate-800/80 bg-slate-50/95 dark:bg-slate-900/95 shrink-0"
            >
              {isSettingsOpen && (
                <div className="absolute bottom-16 left-3 right-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5 space-y-1 z-30">
                  <button
                    type="button"
                    onClick={toggleLang}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">{t.switchLang}</span>
                    </span>
                    <span className="uppercase font-bold text-blue-600 dark:text-blue-400 shrink-0 ml-2">
                      {lang}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {theme === 'light' ? (
                      <Moon className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{t.switchTheme}</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{t.logout}</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 px-1.5 py-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    {avatarInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-wide text-slate-800 dark:text-slate-100 truncate uppercase">
                      {fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {t.workspacePlan}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  title="Settings"
                  aria-label="Settings"
                  className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ================= Mini Rail เมื่อพับเก็บ Sidebar บน Desktop ================= */
          <div className="hidden md:flex flex-col items-center justify-between h-full py-4">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title={t.expandSidebar}
                aria-label={t.expandSidebar}
                className="w-9 h-9 rounded-full bg-slate-200/75 dark:bg-slate-800 hover:bg-slate-300/75 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenNewModal}
                title={t.newChat}
                aria-label={t.newChat}
                className="w-9 h-9 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <SquarePen className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                title={t.library}
                aria-label={t.library}
                className="w-9 h-9 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              title={fullName}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
            >
              {avatarInitial}
            </button>
          </div>
        )}
      </aside>

      {/* ================= Right Main Workspace Area ================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-14 px-3.5 sm:px-6 flex items-center justify-between gap-2 shrink-0 border-b border-transparent">
          <div className="flex items-center gap-2 min-w-0">
            {/* ปุ่มเปิด Drawer บนมือถือ */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label={t.expandSidebar}
              className="md:hidden p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>

            <Link
              to="/home"
              className={`flex items-center gap-2 min-w-0 ${
                isSidebarOpen ? 'md:hidden' : 'flex'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-2xs md:hidden shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-800 dark:text-white truncate">
                Textspace
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              title={t.switchLang}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="uppercase">{lang}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={t.switchTheme}
              aria-label={t.switchTheme}
              className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-5 sm:py-8 md:py-10">
          <div className="max-w-3xl mx-auto space-y-7 sm:space-y-10">
            {/* Greeting */}
            <div className="space-y-1.5 sm:space-y-2 pt-1 sm:pt-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent break-words">
                {t.greetingPrefix}
              </h1>
              <p className="text-base sm:text-xl md:text-2xl font-medium text-slate-400 dark:text-slate-500 leading-snug">
                {t.greetingSub}
              </p>
            </div>

            {/* Prompt / Create Workspace Box */}
            <div
              onClick={handleOpenNewModal}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleOpenNewModal();
              }}
              className="group rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 hover:border-blue-500/60 dark:hover:border-blue-500/60 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3.5 sm:space-y-4"
            >
              <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500 px-0.5 sm:px-1 leading-relaxed">
                {t.promptBoxPlaceholder}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                <span className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>PDF, DOCX, TXT</span>
                </span>

                <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-full bg-blue-600 group-hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>{t.attachAndStart}</span>
                </span>
              </div>
            </div>

            {/* Recent Collections */}
            <div className="space-y-3 pt-1 sm:pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t.recentTitle}
              </h2>

              {errorMsg && (
                <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {isLoadingCollections ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="h-20 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 animate-pulse"
                    />
                  ))}
                </div>
              ) : collections.length === 0 ? (
                <div className="p-5 sm:p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 leading-relaxed">
                  {t.emptyCollections}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {collections.map((item) => {
                    const isTemp = item.id.startsWith('temp-');
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleOpenCollection(item.id)}
                        className={`group p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isTemp
                            ? 'border-blue-200/80 dark:border-blue-800/70 bg-blue-50/40 dark:bg-blue-950/20 cursor-default'
                            : 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 hover:border-blue-500/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            {isTemp ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.name}
                            </h3>
                            <p className="text-xs text-slate-400 truncate">
                              {isTemp ? (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {item.docCount} {t.filesUnit} • {t.processingTag}
                                </span>
                              ) : (
                                <>
                                  {item.docCount} {t.filesUnit} • {item.messageCount} {t.msgsUnit} •{' '}
                                  {item.updatedAt}
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {!isTemp && (
                          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 transition-colors" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ================= Floating Background Upload Status Widget ================= */}
      {uploadTasks.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 z-50 w-[92vw] max-w-xs space-y-2 pointer-events-none"
        >
          {uploadTasks.map((task) => {
            const isUploadingTask = task.status === 'uploading';
            const isSuccessTask = task.status === 'success';

            return (
              <div
                key={task.id}
                className={`pointer-events-auto rounded-2xl border p-3.5 shadow-lg backdrop-blur-md transition-all ${
                  isUploadingTask
                    ? 'bg-white/95 dark:bg-slate-900/95 border-blue-200 dark:border-blue-800/80'
                    : isSuccessTask
                      ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-200 dark:border-emerald-800/80'
                      : 'bg-white/95 dark:bg-slate-900/95 border-rose-200 dark:border-rose-800/80'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isUploadingTask
                        ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                        : isSuccessTask
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isUploadingTask ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isSuccessTask ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {isUploadingTask
                        ? t.uploadingTaskTitle(task.collectionName)
                        : isSuccessTask
                          ? t.uploadDoneTitle(task.collectionName)
                          : t.uploadFailTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {task.status === 'error' && task.errorMessage
                        ? task.errorMessage
                        : isUploadingTask
                          ? t.uploadingTaskDesc
                          : `${task.fileCount} ${t.filesUnit}`}
                    </p>

                    {isSuccessTask && task.createdDetail && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const detail = task.createdDetail!;
                            dismissUploadTask(task.id);
                            navigate(`/chat/${detail.id}`, {
                              state: { initialDetail: detail },
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <span>{t.openChatBtn}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {!isUploadingTask && (
                    <button
                      type="button"
                      onClick={() => dismissUploadTask(task.id)}
                      aria-label="Dismiss notification"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isUploadingTask && (
                  <div className="mt-2.5 h-1 w-full rounded-full bg-blue-100 dark:bg-blue-950 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCollection}
      />
    </div>
  );
}