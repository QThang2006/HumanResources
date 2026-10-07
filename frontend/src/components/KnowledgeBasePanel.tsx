import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  FileText,
  Layers3,
  Library,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
} from 'lucide-react';

import {
  documentsApi,
  type KnowledgeDocument,
  type RagSearchResult,
} from '../api/documents.api';

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.ceil(bytes / 1024)} KB`;
};

const statusClass = (status: string) => {
  if (status === 'READY') {
    return 'bg-[#EFF7F1] text-[#2F6B4F] border-[#D4E7DA]';
  }
  if (status === 'FAILED') {
    return 'bg-[#FBF1F2] text-[#9D4150] border-[#EDC7CC]';
  }
  return 'bg-[#FFF7E8] text-[#9A6A2F] border-[#F0DFC1]';
};

export const KnowledgeBasePanel: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RagSearchResult[]>([]);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await documentsApi.getAll();
      setDocuments(data);
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'Không thể tải danh sách tài liệu Knowledge Base.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file PDF.' });
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Chỉ chấp nhận file PDF.' });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);

      const result = await documentsApi.uploadPdf(selectedFile);
      setMessage({
        type: 'success',
        text: `${result.message} (${result.chunkCount} chunks)`,
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadDocuments();
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'Upload hoặc xử lý PDF thất bại.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setMessage({
        type: 'error',
        text: 'Vui lòng nhập câu hỏi để kiểm thử RAG.',
      });
      return;
    }

    try {
      setSearching(true);
      setMessage(null);
      const results = await documentsApi.search(trimmedQuery, 3);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'Không thể thực hiện tìm kiếm RAG.',
      });
    } finally {
      setSearching(false);
    }
  };

  const stats = useMemo(() => {
    const ready = documents.filter(document => document.status === 'READY').length;
    const chunks = documents.reduce(
      (total, document) => total + (Number(document.chunkCount) || 0),
      0,
    );

    return {
      total: documents.length,
      ready,
      chunks,
    };
  }, [documents]);

  return (
    <div className="space-y-5">
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm ${
            message.type === 'success'
              ? 'border-[#CDE3D6] text-[#2F6B4F]'
              : 'border-[#EDC7CC] text-[#9D4150]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-[24px] border border-[#E2E5E7] bg-white shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#1D2023]">
                Knowledge base
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <MetricPill label="Tài liệu" value={stats.total} />
              <MetricPill label="Ready" value={stats.ready} />
              <MetricPill label="Chunks" value={stats.chunks} />
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-[350px_minmax(0,1fr)]">
          <aside className="border-b border-[#E8EAEC] bg-[#FFFFFF] p-5 sm:p-7 xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6E9ED] text-[#6F3042]">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#202326]">Thêm tài liệu</h3>
                <p className="mt-0.5 text-xs text-[#7F868B]">PDF document</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 flex min-h-44 w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#D3D8DA] bg-[#FFFFFF] px-5 py-6 text-center transition hover:border-[#8B5361] hover:bg-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF1F2] text-[#8B7460]">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-black text-[#303438]">Chọn file PDF</p>
              <p className="mt-1 text-xs text-[#90979C]">Nhấn để duyệt tài liệu</p>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={event =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
              className="hidden"
            />

            {selectedFile && (
              <div className="mt-3 rounded-2xl border border-[#E1E4E5] bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6E9ED] text-[#6F3042]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#303438]">
                      {selectedFile.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#82898E]">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#6F3042] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(111,48,66,0.16)] transition hover:bg-[#5D2737] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              {uploading ? 'Đang xử lý...' : 'Tải lên'}
            </button>
          </aside>

          <div className="min-w-0">
            <div className="flex items-center justify-between border-b border-[#E8EAEC] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2">
                <Library className="h-4 w-4 text-[#8B7460]" />
                <h3 className="text-sm font-black text-[#202326]">Tài liệu đã nạp</h3>
              </div>
              <button
                type="button"
                onClick={loadDocuments}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-[#72797E] transition hover:bg-[#F1F3F3] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-80 items-center justify-center gap-3 text-[#82898E]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-semibold">Đang tải tài liệu...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF1F2] text-[#8A8179]">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-black text-[#303438]">Chưa có tài liệu</p>
                <p className="mt-1 text-xs text-[#7F868B]">Tải PDF đầu tiên để bắt đầu.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E9ECEC]">
                {documents.map(document => (
                  <article
                    key={document.id}
                    className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-[#FFFFFF] sm:flex-row sm:items-center sm:justify-between sm:px-7"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF1F2] text-[#8B7460] transition group-hover:bg-[#F6E9ED] group-hover:text-[#6F3042]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#303438]">
                          {document.title}
                        </p>
                        <p className="mt-1 text-xs text-[#82898E]">
                          {document.uploader?.name ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-14 sm:pl-0">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F3F3] px-2.5 py-1 text-[11px] font-bold text-[#72797E]">
                        <Layers3 className="h-3.5 w-3.5" />
                        {document.chunkCount} chunks
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(
                          document.status,
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                        {document.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E2E5E7] bg-white shadow-[0_12px_34px_rgba(45,34,28,0.055)]">
        <div className="border-b border-[#E8EAEC] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF1F1] text-[#A26D3F]">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#202326]">RAG sandbox</h3>
              <p className="mt-0.5 text-xs text-[#7F868B]">Thử một câu hỏi trên dữ liệu đã lập chỉ mục.</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90979C]" />
              <input
                type="text"
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  if (!event.target.value.trim()) {
                    setSearchResults([]);
                  }
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Ví dụ: Chính sách nghỉ phép của công ty như thế nào?"
                className="h-12 w-full rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] pl-11 pr-4 text-sm text-[#2E3235] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#202326] px-5 text-sm font-black text-white transition hover:bg-[#171412] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {searching ? 'Đang tìm...' : 'Kiểm thử'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-6 grid gap-3">
              {searchResults.map((result, index) => {
                const similarityPercent = Math.max(
                  0,
                  Math.min(100, result.similarity * 100),
                );

                return (
                  <article
                    key={result.chunkId}
                    className="rounded-[18px] border border-[#E3E5E6] bg-[#FFFFFF] p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#6F3042] text-xs font-black text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#303438]">
                            {result.documentTitle}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#90979C]">
                            Chunk #{result.chunkId}
                          </p>
                        </div>
                      </div>

                      <span className="w-fit rounded-full bg-[#F6E9ED] px-3 py-1.5 text-[11px] font-black text-[#6F3042]">
                        {similarityPercent.toFixed(2)}% match
                      </span>
                    </div>

                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#EAE2DB]">
                      <div
                        className="h-full rounded-full bg-[#B48855] transition-all"
                        style={{ width: `${similarityPercent}%` }}
                      />
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#636A70]">
                      {result.content}
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          {!searching && query.trim() && searchResults.length === 0 && (
            <div className="mt-6 rounded-[18px] border border-dashed border-[#D6DADC] bg-[#F8F9F9] px-4 py-9 text-center">
              <FileSearch className="mx-auto h-5 w-5 text-[#9FA6AB]" />
              <p className="mt-2 text-xs font-bold text-[#7F868B]">Chưa có kết quả phù hợp.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const MetricPill: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="rounded-2xl border border-[#E2E5E7] bg-[#F8F9F9] px-3.5 py-2 text-left">
    <div className="text-base font-black text-[#202326]">{value}</div>
    <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[#90979C]">
      {label}
    </div>
  </div>
);
