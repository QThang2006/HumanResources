import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Bot, Heart } from 'lucide-react';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* 1. Header Navigation */}
      <Navbar />

      {/* 2. Main Content Viewport */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 3. Subtle Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-700">HR Tech AI Ecosystem</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
              v1.0.0-Enterprise
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>Đồ án môn học • Xây dựng với</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
            <span>bởi Nhóm Kỹ Thuật Phần Mềm</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
