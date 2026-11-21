import { Link, Outlet, useLocation } from 'react-router-dom';
import { FileText, MessageSquare, Upload, Home } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'หน้าหลัก', icon: Home },
    { path: '/documents', label: 'คลังเอกสาร', icon: FileText },
    { path: '/chat', label: 'ถาม-ตอบ AI', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Navbar ด้านบน */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* โลโก้ */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <FileText className="w-6 h-6" />
            <span>Textspace AI</span>
          </Link>

          {/* เมนูเปลี่ยนหน้า */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ปุ่มลัดอัปโหลด */}
          <Link
            to="/documents"
            className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>อัปโหลดเอกสาร</span>
          </Link>
        </div>
      </header>

      {/* พื้นที่แสดงเนื้อหาของแต่ละ Route */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}