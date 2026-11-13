/**
 * ==============================================================================
 * TALENTHUNT ATS ENTERPRISE DESIGN TOKENS
 * ==============================================================================
 * Căn cứ: docs/BAO_CAO_CHUAN_HOA_UI_TOAN_HE_THONG_TV1_TV4.md
 * 
 * Bộ Design Tokens chuẩn áp dụng thống nhất cho toàn bộ hệ thống (TV1, TV2, TV3, TV4).
 * Giúp lập trình viên chỉ cần import dùng trực tiếp, tránh gõ nhầm class màu
 * hoặc bo góc không đồng bộ.
 */

export const DESIGN_TOKENS = {
  // ── 1. MÀU THƯƠNG HIỆU CHỦ ĐẠO (ENTERPRISE ATS BLUE) ──
  // Xóa bỏ hoàn toàn màu tím/chàm indigo-*, purple-*
  brand: {
    primary: 'blue-600',
    primaryHover: 'blue-700',
    primaryActive: 'blue-800',
    primaryLight: 'blue-50',
    primaryBorder: 'blue-200',
    primaryRing: 'ring-blue-500/20',
  },

  // ── 2. NỀN & BỀ MẶT KHỐI (SURFACE & NEUTRALS) ──
  // Loại bỏ hoàn toàn nền kính mờ glassmorphism
  surface: {
    pageBackground: 'bg-slate-50',
    cardBackground: 'bg-white',
    cardBorder: 'border-slate-200',
    cardHoverBorder: 'hover:border-slate-300',
    inputBorder: 'border-slate-300',
    inputFocusBorder: 'focus:border-blue-500',
    divider: 'border-slate-100',
  },

  // ── 3. PHÂN CẤP CHỮ & NỘI DUNG (TYPOGRAPHY) ──
  text: {
    heading: 'text-slate-900',
    body: 'text-slate-700',
    muted: 'text-slate-500',
    subtle: 'text-slate-400',
    inverse: 'text-white',
    link: 'text-blue-600 hover:text-blue-700',
  },

  // ── 4. TRẠNG THÁI NGỮ NGHĨA (SEMANTIC ACCENTS) ──
  semantic: {
    success: {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    warning: {
      text: 'text-amber-800',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-500',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    danger: {
      text: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      icon: 'text-rose-600',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    info: {
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    neutral: {
      text: 'text-slate-700',
      bg: 'bg-slate-100',
      border: 'border-slate-200',
      icon: 'text-slate-500',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
    },
  },

  // ── 5. HỆ THỐNG BO GÓC CHUẨN (BORDER RADIUS) ──
  // Card/Modal hướng tới rounded-xl; Button/Input hướng tới rounded-lg
  radius: {
    card: 'rounded-xl',
    modal: 'rounded-xl',
    button: 'rounded-lg',
    input: 'rounded-lg',
    badge: 'rounded-full',
    tag: 'rounded-md',
  },

  // ── 6. HIỆU ỨNG ĐỔ BÓNG VI MÔ (SHADOWS) ──
  shadow: {
    card: 'shadow-xs',
    elevated: 'shadow-sm',
    modal: 'shadow-xl',
  },
} as const;

// ── COMPOSITE PRESETS CHO CÁC COMPONENT PHỔ BIẾN ──
export const COMPONENT_PRESETS = {
  card: 'bg-white border border-slate-200 rounded-xl shadow-xs',
  cardHoverable: 'bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 hover:shadow-sm transition-all',
  buttonPrimary: 'inline-flex items-center justify-center font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed',
  buttonSecondary: 'inline-flex items-center justify-center font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400/20 disabled:opacity-50 disabled:cursor-not-allowed',
  input: 'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400',
} as const;

export default DESIGN_TOKENS;
