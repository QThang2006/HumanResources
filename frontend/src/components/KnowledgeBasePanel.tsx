import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  FileText,
  Layers3,
  Library,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import {
  documentsApi,
  type KnowledgeDocument,
  type RagWorkflowSearchResponse,
} from '../api/documents.api';

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.ceil(bytes / 1024)} KB`;
};

const MAX_PDF_SIZE = 10 * 1024 * 1024;

const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const statusClass = (status: string) => {
  if (status === 'READY') {
    return 'bg-[#EFF7F1] text-[#2F6B4F] border-[#D4E7DA]';
  }
  if (status === 'FAILED') {
    return 'bg-[#FBF1F2] text-[#9D4150] border-[#EDC7CC]';
  }
  return 'bg-[#FFF7E8] text-[#9A6A2F] border-[#F0DFC1]';
};

const statusLabel = (status: KnowledgeDocument['status']) => {
  if (status === 'READY') return 'Sẵn sàng';
  if (status === 'FAILED') return 'Lỗi';
  return 'Đang xử lý';
};

export const KnowledgeBasePanel: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<KnowledgeDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentSearch, setDocumentSearch] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [query, setQuery] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [searching, setSearching] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [ragResponse, setRagResponse] =
    useState<RagWorkflowSearchResponse | null>(null);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await documentsApi.getAll();
      setDocuments(data);
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'Không thể tải danh sách tài liệu Kho tri thức.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadDocuments]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file PDF.' });
      return;
    }

    if (!isPdfFile(selectedFile)) {
      setMessage({ type: 'error', text: 'Chỉ chấp nhận file PDF.' });
      return;
    }

    if (selectedFile.size > MAX_PDF_SIZE) {
      setMessage({ type: 'error', text: 'File PDF không được vượt quá 10 MB.' });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);

      const result = await documentsApi.uploadPdf(selectedFile);
      setMessage({
        type: 'success',
        text: `${result.message} (${result.chunkCount} nội dung)`,
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
        text: 'Tải lên hoặc xử lý PDF thất bại.',
      });
    } finally {
      setUploading(false);
    }
  };

  const selectPdfFile = (file: File | null) => {
    if (!file) return;

    if (!isPdfFile(file)) {
      setSelectedFile(null);
      setMessage({ type: 'error', text: 'Chỉ chấp nhận file PDF.' });
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      setSelectedFile(null);
      setMessage({ type: 'error', text: 'File PDF không được vượt quá 10 MB.' });
      return;
    }

    setSelectedFile(file);
    setMessage(null);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    try {
      setDeletingId(pendingDelete.id);
      setMessage(null);
      const result = await documentsApi.delete(pendingDelete.id);
      setRagResponse(currentResponse =>
        currentResponse
          ? {
              ...currentResponse,
              results: currentResponse.results.filter(
                item => item.documentId !== pendingDelete.id,
              ),
              sources: currentResponse.sources.filter(
                item => item.documentId !== pendingDelete.id,
              ),
            }
          : null,
      );
      setMessage({ type: 'success', text: result.message });
      setPendingDelete(null);
      await loadDocuments();
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Không thể xóa tài liệu.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = async (question: string = query) => {
    if (searching) return;
    const trimmedQuery = question.trim();

    if (!trimmedQuery) {
      setMessage({
        type: 'error',
        text: 'Vui lòng nhập câu hỏi để kiểm thử Kho tri thức.',
      });
      return;
    }

    try {
      setSearching(true);
      setMessage(null);
      setRagResponse(null);
      setShowEvidence(false);
      const response = await documentsApi.searchThroughWorkflow(
        trimmedQuery,
        4,
      );
      setRagResponse(response);
      setLastQuestion(trimmedQuery);
      setShowEvidence(false);
    } catch (error) {
      console.error(error);
      setRagResponse(null);
      setShowEvidence(false);
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Không thể thực hiện tìm kiếm Kho tri thức.',
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

  const filteredDocuments = useMemo(() => {
    const keyword = documentSearch.trim().toLocaleLowerCase('vi');
    if (!keyword) return documents;

    return documents.filter(document =>
      document.title.toLocaleLowerCase('vi').includes(keyword),
    );
  }, [documentSearch, documents]);

  const sourceDocuments = ragResponse?.sources.filter(
    (source, index, sources) =>
      sources.findIndex(item => item.documentId === source.documentId) === index,
  ) ?? [];

  return (
    <div className="space-y-5">
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[1px]"
          onMouseDown={() => {
            if (deletingId === null) setPendingDelete(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-[24px] border border-[#E2E5E7] bg-white p-6 shadow-[0_24px_80px_rgba(32,25,22,0.2)]"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF1F2] text-[#9D4150]">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-black text-[#202326]">
              Xóa tài liệu?
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#666D72]">
              Tài liệu <strong>“{pendingDelete.title}”</strong> và toàn bộ nội dung đã lập chỉ mục sẽ bị xóa. Thao tác này không thể hoàn tác.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setPendingDelete(null)}
                className="h-10 rounded-xl border border-[#D8DCDE] bg-white px-4 text-xs font-black text-[#636A70] transition hover:bg-[#F2F4F4] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleDelete}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#9D4150] px-4 text-xs font-black text-white transition hover:bg-[#843743] disabled:opacity-50"
              >
                {deletingId !== null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deletingId !== null ? 'Đang xóa...' : 'Xóa tài liệu'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E7D9DD] bg-[#FAF3F5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#6F3042]">
                <Bot className="h-3.5 w-3.5" />
                Tri thức có dẫn nguồn
              </div>
              <h2 className="text-xl font-black tracking-tight text-[#1D2023]">
                Kho tri thức
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#72797E]">
              Tài liệu nội bộ, truy xuất và đối chiếu
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <MetricPill label="Tài liệu" value={stats.total} />
              <MetricPill label="Sẵn sàng" value={stats.ready} />
              <MetricPill label="Nội dung" value={stats.chunks} />
            </div>
          </div>
        </div>

        <div className="border-b border-[#E8EAEC] bg-[#F8F9F9] px-5 py-4 sm:px-7">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
            <KnowledgeFlowStep icon={<UploadCloud className="h-4 w-4" />} label="Tải PDF" />
            <ArrowRight className="hidden h-4 w-4 text-[#B0B5B8] sm:block" />
            <KnowledgeFlowStep icon={<Layers3 className="h-4 w-4" />} label="Lập chỉ mục" />
            <ArrowRight className="hidden h-4 w-4 text-[#B0B5B8] sm:block" />
            <KnowledgeFlowStep icon={<FileSearch className="h-4 w-4" />} label="Tìm nội dung" />
            <ArrowRight className="hidden h-4 w-4 text-[#B0B5B8] sm:block" />
            <KnowledgeFlowStep icon={<Bot className="h-4 w-4" />} label="AI tổng hợp" />
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
                <p className="mt-0.5 text-xs text-[#7F868B]">Tài liệu PDF</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={event => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragOver={event => event.preventDefault()}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={event => {
                event.preventDefault();
                setIsDraggingFile(false);
                selectPdfFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={`mt-5 flex min-h-44 w-full flex-col items-center justify-center rounded-[18px] border border-dashed px-5 py-6 text-center transition ${
                isDraggingFile
                  ? 'border-[#6F3042] bg-[#FAF3F5] ring-4 ring-[#6F3042]/10'
                  : 'border-[#D3D8DA] bg-[#FFFFFF] hover:border-[#8B5361] hover:bg-white'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF1F2] text-[#8B7460]">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-black text-[#303438]">Chọn file PDF</p>
              <p className="mt-1 text-xs text-[#90979C]">
                Kéo thả vào đây hoặc nhấn để chọn
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#B0B5B8]">
                PDF · tối đa 10 MB
              </p>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={event =>
                selectPdfFile(event.target.files?.[0] ?? null)
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
            <div className="border-b border-[#E8EAEC] px-5 py-4 sm:px-7">
              <div className="flex items-center justify-between gap-3">
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
              {documents.length > 0 && (
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90979C]" />
                  <input
                    value={documentSearch}
                    onChange={event => setDocumentSearch(event.target.value)}
                    placeholder="Tìm theo tên tài liệu..."
                    className="h-10 w-full rounded-xl border border-[#DDE1E2] bg-[#F8F9F9] pl-10 pr-3 text-xs font-semibold text-[#3D4246] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10"
                  />
                </div>
              )}
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
            ) : filteredDocuments.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                <Search className="h-5 w-5 text-[#9FA6AB]" />
                <p className="mt-2 text-sm font-black text-[#53595E]">
                  Không tìm thấy tài liệu
                </p>
                <button
                  type="button"
                  onClick={() => setDocumentSearch('')}
                  className="mt-3 text-xs font-black text-[#6F3042] hover:underline"
                >
                  Xóa tìm kiếm
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E9ECEC]">
                {filteredDocuments.map(document => (
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
                        {document.chunkCount} nội dung
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(
                          document.status,
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                        {statusLabel(document.status)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(document)}
                        disabled={deletingId === document.id}
                        title={`Xóa ${document.title}`}
                        aria-label={`Xóa tài liệu ${document.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[#9D4150] transition hover:bg-[#FBF1F2] disabled:cursor-wait disabled:opacity-50"
                      >
                        {deletingId === document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
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
              <h3 className="text-base font-black text-[#202326]">
                Kiểm thử câu trả lời
              </h3>
              <p className="mt-0.5 text-xs text-[#636A70]">
                Đặt câu hỏi, đọc câu trả lời và mở nguồn để đối chiếu khi cần.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="flex-1">
              <label
                htmlFor="knowledge-question"
                className="mb-2 block text-xs font-black text-[#4E5652]"
              >
                Câu hỏi cần tra cứu
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#90979C]" />
                <input
                  id="knowledge-question"
                  type="text"
                  value={query}
                  disabled={searching}
                  onChange={event => {
                    setQuery(event.target.value);
                    if (!event.target.value.trim()) {
                      setRagResponse(null);
                      setLastQuestion('');
                      setShowEvidence(false);
                    }
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      void handleSearch();
                    }
                  }}
                  placeholder="Ví dụ: Khóa học bắt buộc phải hoàn thành trong bao lâu?"
                  className="h-12 w-full rounded-2xl border border-[#D8DCDE] bg-[#F8F9F9] pl-11 pr-4 text-sm text-[#2E3235] placeholder:text-[#69736D] outline-none transition focus:border-[#8A4153] focus:bg-white focus:ring-4 focus:ring-[#8A4153]/10 disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#202326] px-5 text-sm font-black text-white transition hover:bg-[#171412] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {searching ? 'Đang tìm...' : 'Tìm câu trả lời'}
            </button>
          </div>

          {ragResponse && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 rounded-2xl border border-[#DCE4DF] bg-[#F8FBF9] p-5 sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-base font-black text-[#33403A]">
                    Câu trả lời từ Kho tri thức
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                        ragResponse.sources.length > 0
                          ? 'bg-[#E6F1EA] text-[#2F6B4F]'
                          : 'bg-[#FFF1D9] text-[#8A5B27]'
                      }`}
                    >
                      {ragResponse.sources.length === 0
                        ? 'Chưa đủ dữ liệu'
                        : ragResponse.aiGenerated
                          ? 'AI tổng hợp có dẫn nguồn'
                          : 'Trích đoạn liên quan'}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#68726D] ring-1 ring-[#DCE4DF]">
                      {sourceDocuments.length} tài liệu
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ragResponse.sources.length > 0 ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2F6B4F]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 text-[#A46C2C]" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRagResponse(null);
                      setLastQuestion('');
                      setShowEvidence(false);
                    }}
                    title="Đóng kết quả"
                    aria-label="Đóng kết quả"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-[#7A8380] transition hover:bg-white hover:text-[#303438]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {lastQuestion && (
                <p className="mt-4 text-sm leading-6 text-[#3F4944]">
                  <span className="font-bold">Bạn hỏi: </span>{lastQuestion}
                </p>
              )}

              <div className="mt-5 max-w-prose space-y-3 text-sm leading-7 text-[#3F4944] [overflow-wrap:anywhere]">
                {ragResponse.answer.split(/\n\s*\n/).map((paragraph, index) => {
                  const lines = paragraph.split('\n').filter(line => line.trim());
                  const isList = lines.every(line => /^[•*-]\s+/.test(line));
                  return isList ? (
                    <ul key={index} className="list-disc space-y-2 pl-5">
                      {lines.map((line, lineIndex) => (
                        <li key={lineIndex}>{line.replace(/^[•*-]\s+/, '')}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
                  );
                })}
              </div>

              {ragResponse.requiresHrIntervention && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#F0DFC1] bg-[#FFF8EA] px-4 py-3 text-xs font-bold leading-5 text-[#8A5B27]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Nội dung này có thể cần bộ phận Nhân sự hỗ trợ trực tiếp.
                </div>
              )}

              {ragResponse.sources.length > 0 && (
                <div className="mt-5 border-t border-[#DCE4DF] pt-4">
                  <p className="text-xs font-black text-[#4A5650]">
                    Nguồn tham khảo
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sourceDocuments.map(source => (
                      <span
                        key={source.documentId}
                        className="min-w-0 rounded-xl border border-[#DCE4DF] bg-white px-3 py-2 text-xs font-bold text-[#59645E] [overflow-wrap:anywhere]"
                      >
                        {source.documentTitle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ragResponse.suggestedFollowUpQuestions.length > 0 && (
                <div className="mt-5 border-t border-[#DCE4DF] pt-4">
                  <p className="text-xs font-black text-[#4A5650]">
                    Câu hỏi gợi ý
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ragResponse.suggestedFollowUpQuestions.map(question => (
                      <button
                        key={question}
                        type="button"
                        disabled={searching}
                        onClick={() => {
                          setQuery(question);
                          void handleSearch(question);
                        }}
                        className="rounded-xl border border-[#D8DCDE] bg-white px-3 py-2 text-left text-xs font-bold text-[#636A70] transition hover:border-[#8A4153] hover:text-[#6F3042] disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {ragResponse && ragResponse.results.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowEvidence(current => !current)}
                aria-expanded={showEvidence}
                aria-controls="knowledge-evidence"
                className="flex w-full items-center justify-between rounded-2xl border border-[#E2E5E7] bg-[#F8F9F9] px-4 py-3 text-left transition hover:bg-white"
              >
                <span>
                  <span className="block text-xs font-black text-[#4E5652]">
                    Nội dung dùng để đối chiếu
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-[#69736D]">
                    {ragResponse.results.length} đoạn tham chiếu được tìm thấy
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-[#7D8581] transition ${
                    showEvidence ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showEvidence && (
                <div id="knowledge-evidence" className="mt-3 grid gap-3">
                  {ragResponse.results.map((result, index) => {
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
                              <p className="text-sm font-black text-[#303438] [overflow-wrap:anywhere]">
                                {result.documentTitle}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#636A70]">
                                Đoạn tham chiếu {index + 1}
                              </p>
                            </div>
                          </div>

                          <span className="w-fit shrink-0 rounded-full bg-[#F6E9ED] px-3 py-1.5 text-[11px] font-black text-[#6F3042]">
                            Độ liên quan {similarityPercent.toFixed(0)}%
                          </span>
                        </div>

                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#636A70] [overflow-wrap:anywhere]">
                          {result.content}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!searching && ragResponse && ragResponse.results.length === 0 && (
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

const KnowledgeFlowStep: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => (
  <div className="flex items-center gap-2 rounded-xl border border-[#E2E5E7] bg-white px-3 py-2.5 text-[#626A66]">
    <span className="text-[#6F3042]">{icon}</span>
    <span className="text-xs font-black">{label}</span>
  </div>
);
