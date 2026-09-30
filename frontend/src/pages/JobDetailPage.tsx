import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockJobs } from './CareersPage';
import { ArrowLeft, MapPin, DollarSign, UploadCloud, CheckCircle2, Code2, Send } from 'lucide-react';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const job = mockJobs.find((j) => j.id === Number(id)) || mockJobs[0];

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Nút quay lại */}
      <Link
        to="/careers"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại Cổng việc làm
      </Link>

      {/* Khung hướng dẫn kỹ thuật cho Thành viên 2 */}
      <div className="mb-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
          <Code2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full">
              Khung Sườn Chờ Code • Sprint 2
            </span>
            <span className="text-xs font-bold text-indigo-900">
              Phân hệ Ứng Tuyển & Kéo Thả CV (Smart Application Form)
            </span>
          </div>
          <p className="text-xs text-indigo-700/90 mt-1">
            📌 <strong>Phân công: Thành viên 2</strong> sẽ viết API <code className="bg-white/80 px-1 rounded">POST /api/applications/apply</code>, xử lý kéo thả file PDF, gọi Gemini AI bóc tách thông tin và tự động tính điểm Match Score.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột 1 & 2: Chi tiết Mô Tả Công Việc (JD) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {job.departmentName}
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Mở Tuyển Dụng
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{job.title}</h1>
            
            <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-slate-500 pb-6 border-b border-slate-100">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" /> {job.salaryRange}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Mô tả công việc:</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{job.description}</p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Yêu cầu ứng viên:</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{job.requirements}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cột 3: Khung Nộp Đơn Ứng Tuyển (Starter Form) */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 sticky top-24">
            <h2 className="text-base font-bold text-slate-900 mb-1">Nộp Hồ Sơ Ứng Tuyển</h2>
            <p className="text-xs text-slate-500 mb-4">Điền thông tin và đính kèm CV định dạng PDF</p>

            {isSubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-emerald-800">Đã Nhận Hồ Sơ!</h3>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Cảm ơn bạn. Bộ phận nhân sự sẽ liên hệ sớm nhất.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-3 text-xs font-bold text-emerald-700 underline"
                >
                  Nộp đơn khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Họ và tên:</label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email liên hệ:</label>
                  <input
                    type="email"
                    required
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="ungvien@gmail.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Số điện thoại:</label>
                  <input
                    type="tel"
                    required
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Khung Dropzone CV mẫu */}
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-slate-700 block">Kéo thả CV (PDF) tại đây</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Dung lượng tối đa 5MB</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all mt-4"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi Đơn Ứng Tuyển
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
