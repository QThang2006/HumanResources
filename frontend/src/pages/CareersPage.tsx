import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, DollarSign, ArrowRight, UserPlus, Code2 } from 'lucide-react';
import type { Job } from '../types';

export const mockJobs: Job[] = [
  {
    id: 1,
    title: 'Senior Backend Developer (NestJS & MySQL)',
    departmentId: 1,
    departmentName: 'Phòng Kỹ thuật Phần mềm (TECH)',
    location: 'Hà Nội (Hybrid)',
    salaryRange: '25 - 35 Triệu VNĐ',
    description: 'Thiết kế kiến trúc hệ thống backend microservices, tối ưu cơ sở dữ liệu MySQL và xây dựng RESTful API.',
    requirements: 'Tối thiểu 3 năm kinh nghiệm với Node.js/NestJS, thành thạo MySQL, Docker.',
    status: 'OPEN',
    createdAt: '2026-09-20',
    applicationCount: 4,
  },
  {
    id: 2,
    title: 'Frontend React Engineer (TypeScript & Tailwind)',
    departmentId: 1,
    departmentName: 'Phòng Kỹ thuật Phần mềm (TECH)',
    location: 'Hà Nội / Remote',
    salaryRange: '18 - 25 Triệu VNĐ',
    description: 'Phát triển giao diện web cho hệ sinh thái HR Tech, tối ưu hóa trải nghiệm người dùng với Tailwind CSS.',
    requirements: '2+ năm kinh nghiệm React, TypeScript, Responsive Design.',
    status: 'OPEN',
    createdAt: '2026-09-22',
    applicationCount: 2,
  },
];

export const CareersPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Khung hướng dẫn kỹ thuật cho Thành viên 2 */}
      <div className="mb-8 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
          <Code2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full">
              Khung Sườn Chờ Code • Sprint 2
            </span>
            <span className="text-xs font-bold text-indigo-900">
              Phân hệ Cổng Việc Làm Công Khai (Public Careers)
            </span>
          </div>
          <p className="text-xs text-indigo-700/90 mt-1">
            📌 <strong>Phân công: Thành viên 2</strong> sẽ kết nối API <code className="bg-white/80 px-1 rounded">GET /api/jobs</code>, xây dựng thanh tìm kiếm từ khóa, bộ lọc phòng ban và danh sách tin tuyển dụng tại đây.
          </p>
        </div>
      </div>

      {/* Tiêu đề Cổng Tuyển Dụng */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Cơ Hội Nghề Nghiệp Tại Công Ty
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Gia nhập đội ngũ phát triển sản phẩm công nghệ tiên phong cùng môi trường làm việc cởi mở.
        </p>
      </div>

      {/* Danh sách thẻ việc làm mẫu (Starter Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockJobs.map((job) => (
          <div
            key={job.id}
            className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {job.departmentName}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Đang Mở Tuyển
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                <Link to={`/careers/${job.id}`}>{job.title}</Link>
              </h2>
              <p className="text-xs text-slate-600 mt-2 line-clamp-2">{job.description}</p>
              
              <div className="flex flex-wrap gap-4 mt-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  {job.salaryRange}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> {job.applicationCount} ứng viên đã nộp
              </span>
              <Link
                to={`/careers/${job.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Xem chi tiết & Ứng tuyển <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Khung Placeholder chờ Thành viên 2 mở rộng */}
      <div className="mt-8 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
        <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-xs font-medium">Khung sườn đã dựng sẵn • Thành viên 2 sẽ bổ sung các bộ lọc & phân trang tại đây</p>
      </div>
    </div>
  );
};
