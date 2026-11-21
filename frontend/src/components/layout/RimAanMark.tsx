import React from 'react';

export const RimAanMark: React.FC<{ showText?: boolean }> = ({ showText = true }) => {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* กรอบหน้ากระดาษ */}
        <rect
          x="3"
          y="3"
          width="24"
          height="24"
          rx="7"
          fill="var(--color-surface)"
          stroke="var(--color-primary)"
          strokeWidth="2"
        />
        {/* เส้นคั่นริมขอบ (Margin Rail) */}
        <line
          x1="10"
          y1="4"
          x2="10"
          y2="26"
          stroke="var(--color-accent)"
          strokeWidth="1.75"
        />
        {/* ขีดหมายเหตุริมอ่าน */}
        <line
          x1="6"
          y1="11"
          x2="8"
          y2="11"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* บรรทัดเนื้อหา */}
        <line
          x1="13.5"
          y1="11"
          x2="22"
          y2="11"
          stroke="var(--color-ink)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <line
          x1="13.5"
          y1="16"
          x2="20"
          y2="16"
          stroke="var(--color-muted)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <line
          x1="13.5"
          y1="21"
          x2="18"
          y2="21"
          stroke="var(--color-muted)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>

      {showText && (
        <span
          className="font-bold text-lg tracking-tight"
          style={{ color: 'var(--color-ink)' }}
        >
          Textspace <span className="font-normal text-sm" style={{ color: 'var(--color-muted)' }}>ริมอ่าน</span>
        </span>
      )}
    </div>
  );
};