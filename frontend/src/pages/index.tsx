import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Languages } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useApp } from '../context/AppContext';

export default function IndexPage() {
  const { lang } = useApp();

  const content = {
    th: {
      badge: 'ผู้ช่วยวิเคราะห์เอกสารอัจฉริยะ',
      title: 'เปลี่ยนเอกสารกองโตให้เป็นคำตอบที่แม่นยำในไม่กี่วินาที',
      subtitle:
        'อัปโหลดไฟล์สัญญา รายงาน หรือเอกสารภาษาไทยและอังกฤษ เพื่อให้ AI ช่วยสรุปใจความสำคัญและตอบทุกข้อสงสัยจากข้อมูลจริงในเอกสารของคุณ',
      ctaPrimary: 'เริ่มต้นใช้งานฟรี',
      ctaSecondary: 'เข้าสู่ระบบ',
      features: [
        {
          icon: Sparkles,
          title: 'ถาม-ตอบจากเนื้อหาจริง',
          desc: 'ดึงคำตอบพร้อมอ้างอิงจากเอกสารของคุณ ลดความคลาดเคลื่อนของข้อมูล',
        },
        {
          icon: Languages,
          title: 'เข้าใจภาษาไทยและอังกฤษ',
          desc: 'รองรับการค้นหาความหมายและสรุปเนื้อหาได้ทั้งสองภาษาอย่างเป็นธรรมชาติ',
        },
        {
          icon: ShieldCheck,
          title: 'ปลอดภัยและเป็นส่วนตัว',
          desc: 'จัดการสิทธิ์การเข้าถึงเอกสารของคุณได้อย่างมั่นใจ',
        },
      ],
    },
    en: {
      badge: 'Intelligent Document Assistant',
      title: 'Turn complex documents into accurate answers in seconds',
      subtitle:
        'Upload contracts, reports, or Thai and English documents. Let AI summarize key points and answer questions directly from your files.',
      ctaPrimary: 'Get Started Free',
      ctaSecondary: 'Log in',
      features: [
        {
          icon: Sparkles,
          title: 'Grounded Q&A',
          desc: 'Get answers directly backed by your uploaded document context.',
        },
        {
          icon: Languages,
          title: 'Bilingual Support',
          desc: 'Seamlessly search and summarize across both Thai and English.',
        },
        {
          icon: ShieldCheck,
          title: 'Private & Secure',
          desc: 'Full control over your workspace and uploaded documents.',
        },
      ],
    },
  }[lang];

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Topbar */}
      <Topbar />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center">
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 sm:py-16 md:py-20 text-center space-y-4 sm:space-y-6">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug sm:leading-tight text-balance">
            {content.title}
          </h1>

          <p className="max-w-xl sm:max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            {content.subtitle}
          </p>

          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <span>{content.ctaPrimary}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-semibold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>{content.ctaSecondary}</span>
            </Link>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 md:pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {content.features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 sm:space-y-3 transition-colors last:sm:col-span-2 last:lg:col-span-1"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}