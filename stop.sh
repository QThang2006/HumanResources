#!/bin/bash
# ========================================================
# 🛑 HR & ATS ECOSYSTEM - STOPPING SCRIPT (LINUX)
# ========================================================

echo "🛑 Đang tắt Backend và Frontend..."
pkill -f "dist/main" 2>/dev/null || true
pkill -f "nest start" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "✅ Đã dừng Backend và Frontend thành công!"
echo "💡 (Container Docker MySQL & n8n vẫn được giữ chạy nền để sẵn sàng cho lần sau)."
echo "   Nếu muốn tắt cả Docker: gõ 'docker compose down'"
