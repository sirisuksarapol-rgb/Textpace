import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { X, FolderPlus, UploadCloud, FileText, Trash2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface NewCollectionPayload {
  name: string;
  description: string;
  files: File[];
}

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: NewCollectionPayload) => Promise<void> | void;
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

export default function CreateCollectionModal({
  isOpen,
  onClose,
  onCreate,
}: CreateCollectionModalProps) {
  const { lang } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const t = {
    th: {
      title: 'สร้างแชท / คอลเลกชันใหม่',
      subtitle: 'ตั้งชื่อหัวข้อและแนบเอกสารอย่างน้อย 1 ไฟล์เพื่อเริ่มถาม-ตอบกับ AI',
      nameLabel: 'ชื่อแชท / ชื่อคอลเลกชัน',
      namePlaceholder: 'เช่น สัญญาเช่าอาคาร, รายงานวิจัยบทที่ 1-3',
      descLabel: 'รายละเอียดเพิ่มเติม (ไม่บังคับ)',
      descPlaceholder: 'โน้ตสั้น ๆ เกี่ยวกับชุดเอกสารนี้...',
      filesLabel: 'เอกสารประกอบ (จำเป็นต้องมีอย่างน้อย 1 ไฟล์)',
      dropzoneTitle: 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง',
      dropzoneHint: 'รองรับ PDF, DOCX, TXT, MD',
      minOneFileError: 'กรุณาแนบไฟล์เอกสารอย่างน้อย 1 ไฟล์ก่อนสร้างแชท',
      emptyNameError: 'กรุณากรอกชื่อแชทหรือคอลเลกชัน',
      cancelBtn: 'ยกเลิก',
      createBtn: 'สร้างและเริ่มแชท',
      creatingBtn: 'กำลังสร้าง...',
    },
    en: {
      title: 'New Chat / Collection',
      subtitle: 'Name your workspace and attach at least 1 document to start chatting with AI',
      nameLabel: 'Chat / Collection Name',
      namePlaceholder: 'e.g. Lease Agreement, Thesis Chapter 1-3',
      descLabel: 'Description (Optional)',
      descPlaceholder: 'Short note about these documents...',
      filesLabel: 'Documents (At least 1 file required)',
      dropzoneTitle: 'Click to browse or drag & drop files',
      dropzoneHint: 'Supports PDF, DOCX, TXT, MD',
      minOneFileError: 'Please attach at least 1 document before creating.',
      emptyNameError: 'Please enter a name for your chat or collection.',
      cancelBtn: 'Cancel',
      createBtn: 'Create & Open',
      creatingBtn: 'Creating...',
    },
  }[lang];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const validFiles = selected.filter((file) => {
      const lower = file.name.toLowerCase();
      return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    });

    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const uniqueNew = validFiles.filter((f) => !existingNames.has(`${f.name}-${f.size}`));
      return [...prev, ...uniqueNew];
    });

    setErrorMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg(t.emptyNameError);
      return;
    }
    if (files.length < 1) {
      setErrorMsg(t.minOneFileError);
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        files,
      });
      setName('');
      setDescription('');
      setFiles([]);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถสร้างรายการได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ชื่อแชท / คอลเลกชัน */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t.nameLabel} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
              />
            </div>

            {/* คำอธิบาย */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t.descLabel}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
              />
            </div>

            {/* อัปโหลดไฟล์ (อย่างน้อย 1 ไฟล์) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {t.filesLabel}
                </label>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {files.length} {lang === 'th' ? 'ไฟล์' : 'file(s)'}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col items-center justify-center gap-1.5 text-center transition-colors cursor-pointer"
              >
                <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t.dropzoneTitle}
                </span>
                <span className="text-xs text-slate-400">{t.dropzoneHint}</span>
              </button>

              {/* รายการไฟล์ที่เลือก */}
              {files.length > 0 && (
                <ul className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                  {files.map((file, idx) => (
                    <li
                      key={`${file.name}-${file.size}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                          {file.name}
                        </span>
                        <span className="text-slate-400 shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        aria-label="Remove file"
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ปุ่มดำเนินการ */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || files.length < 1}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                {isSubmitting ? t.creatingBtn : t.createBtn}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}