import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  CheckSquare, 
  Smile, 
  Bot, 
  Code2, 
  Activity, 
  BookOpen
} from 'lucide-react';

export const EmployeeWorkspacePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 1. GÓC NHÌN EMPLOYEE: KHÔNG GIAN HỘI NHẬP & COPILOT CHAT */}
      {user?.role === 'EMPLOYEE' && (
        <div className="space-y-6">
          {/* Banner hướng dẫn Thành viên 4 */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
                  Khung Sườn Chờ Code • Sprint 4
                </span>
                <span className="text-xs font-bold text-emerald-900">
                  Không Gian Làm Việc Nhân Viên (Personal Workspace)
                </span>
              </div>
              <p className="text-xs text-emerald-700/90 mt-1">
                📌 <strong>Phân công: Thành viên 4</strong> sẽ kết nối API checklist thử việc 30 ngày (<code className="bg-white/80 px-1 rounded">onboarding_tasks</code>), widget check-in cảm xúc hàng ngày và Chatbot Copilot RAG tự động tích nhiệm vụ qua chat.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 1 & 2: Checklist 30 Ngày & Khóa Đào Tạo AI */}
            <div className="lg:col-span-2 space-y-6">
              {/* Widget Check-in Cảm Xúc Hàng Ngày (Mẫu) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-emerald-600" /> Hôm nay bạn cảm thấy thế nào?
                </h3>
                <p className="text-xs text-slate-500 mb-4">Ghi nhận nhanh tâm trạng để doanh nghiệp hỗ trợ bạn tốt nhất</p>
                <div className="flex gap-3">
                  <button className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-center transition-all">
                    <span className="text-xl block mb-1">😊</span>
                    <span className="text-xs font-bold text-slate-700">Tuyệt Vời</span>
                  </button>
                  <button className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-center transition-all">
                    <span className="text-xl block mb-1">😐</span>
                    <span className="text-xs font-bold text-slate-700">Bình Thường</span>
                  </button>
                  <button className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 text-center transition-all">
                    <span className="text-xl block mb-1">😫</span>
                    <span className="text-xs font-bold text-slate-700">Căng Thẳng</span>
                  </button>
                </div>
              </div>

              {/* Khung Checklist Onboarding Mẫu */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600" /> Checklist Hội Nhập 30 Ngày
                </h3>
                <p className="text-xs text-slate-500 mb-4">Hoàn thành các mốc quan trọng trong tháng đầu tiên</p>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                  Khung sườn Checklist • Thành viên 4 sẽ render danh sách task từ DB tại đây
                </div>
              </div>

              {/* Khung Khóa Đào Tạo AI */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" /> Khóa Học AI Chỉ Định (L&D)
                </h3>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
                  Khung sườn Khóa học & Thanh tiến độ % • Thành viên 4 sẽ kết nối API tại đây
                </div>
              </div>
            </div>

            {/* Cột 3: Trợ Lý AI Copilot RAG */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">HR Copilot RAG 24/7</h3>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        ● Trực tuyến
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Hỏi đáp chính sách ngày phép, bảo hiểm, nội quy hoặc gõ <em>"tôi đã nộp cccd"</em> để tự tích task.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs my-6 flex-1 flex items-center justify-center">
                  Khung Chat Copilot • Thành viên 4 sẽ tích hợp Gemini RAG tại đây
                </div>

                <input
                  type="text"
                  disabled
                  placeholder="Nhập câu hỏi quy chế..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GÓC NHÌN MANAGER: BẢNG THEO DÕI SỨC KHỎE TINH THẦN ĐỘI NGŨ (TEAM MOOD) */}
      {user?.role === 'MANAGER' && (
        <div className="space-y-6">
          {/* Banner hướng dẫn Thành viên 3 */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded-full">
                  Khung Sườn Chờ Code • Sprint 3 & 4
                </span>
                <span className="text-xs font-bold text-amber-900">
                  Theo Dõi Sức Khỏe Tinh Thần Đội Ngũ (Team Mood Monitor)
                </span>
              </div>
              <p className="text-xs text-amber-700/90 mt-1">
                📌 <strong>Phân công: Thành viên 3</strong> sẽ kết nối bảng <code className="bg-white/80 px-1 rounded">employee_moods</code>, hiển thị chỉ số cảm xúc các thành viên team mình, nhận diện cảnh báo kiệt sức và nút <em>Hẹn 1-on-1 Gỡ Rối</em> để giải quyết cảnh báo.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600" /> Giám Sát Sức Khỏe Tinh Thần & Tiến Độ Hội Nhập
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Dành riêng cho Trưởng phòng phụ trách bộ phận Kỹ thuật Phần mềm (TECH)
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">Khung sườn danh sách thành viên • Thành viên 3 sẽ tích hợp bảng Team Mood tại đây</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. GÓC NHÌN KHÁC (HR / SUPERADMIN) */}
      {(user?.role === 'HR' || user?.role === 'SUPERADMIN') && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-600">
          <Users className="w-10 h-10 mx-auto mb-2 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Không Gian Làm Việc Nhân Viên</h2>
          <p className="text-xs text-slate-500 mt-1">
            Vui lòng sử dụng bộ chuyển Role trên thanh điều hướng để trải nghiệm góc nhìn của <strong>EMPLOYEE</strong> hoặc <strong>MANAGER</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
