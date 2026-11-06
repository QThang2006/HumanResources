import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
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

import { KnowledgeEvidence } from './KnowledgeEvidence';
import { KnowledgeAnswer } from './KnowledgeAnswer';
import { groupKnowledgeEvidence } from './knowledge-evidence';

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
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (status === 'FAILED') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return 'bg-amber-50 text-amber-800 border-amber-200';
};

const statusLabel = (status: KnowledgeDocument['status']) => {
  if (status === 'READY') return 'Sẵn sàng';
  if (status === 'FAILED') return 'Lỗi';
  return 'Đang xử lý';
};

export const KnowledgeBasePanel: React.FC<{ presentation?: 'standard' | 'admin' }> = ({ presentation = 'standard' }) => {
  const isAdminPresentation = presentation === 'admin';
  const [workspace, setWorkspace] = useState<'search' | 'documents'>('search');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
  const [ragResponse, setRagResponse] =
    useState<RagWorkflowSearchResponse | null>(null);

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await documentsApi.getAll();
      setDocuments(data);
    } catch (error) {
      console.error(error);
      setLoadError(true);
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
        text: isAdminPresentation ? 'Vui lòng nhập câu hỏi về tài liệu nội bộ.' : 'Vui lòng nhập câu hỏi để kiểm thử Kho tri thức.',
      });
      return;
    }

    try {
      setSearching(true);
      setMessage(null);
      setRagResponse(null);
      const response = await documentsApi.searchThroughWorkflow(
        trimmedQuery,
        4,
      );
      setRagResponse(response);
      setLastQuestion(trimmedQuery);
    } catch (error) {
      console.error(error);
      setRagResponse(null);
      setMessage({
        type: 'error',
        text: isAdminPresentation && error instanceof Error && /workflow|n8n/i.test(error.message)
          ? 'Dịch vụ tra cứu hiện chưa sẵn sàng. Vui lòng thử lại sau.'
          : error instanceof Error ? error.message : 'Không thể tra cứu tài liệu. Vui lòng thử lại.',
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

  const evidenceDocuments = useMemo(() => ragResponse ? groupKnowledgeEvidence(ragResponse) : [], [ragResponse]);

  if (loadError) {
    return <section className="tv4-load-error" role="alert">
      <AlertCircle className="h-6 w-6" />
      <h2>Không thể tải Kho tri thức</h2>
      <p>Chưa thể lấy danh sách tài liệu. Vui lòng thử lại trước khi tra cứu hoặc quản lý tài liệu.</p>
      <button type="button" className="tv4-primary" onClick={() => void loadDocuments()}><RefreshCw className="h-4 w-4" /> Thử lại</button>
    </section>;
  }

  if (loading && documents.length === 0) {
    return <div role="status" className="tv4-load-error"><Loader2 className="h-5 w-5 animate-spin" /><p>Đang tải Kho tri thức…</p></div>;
  }

  return (
    <div className={`tv4-knowledge space-y-5 ${isAdminPresentation ? 'tv4-knowledge-admin' : ''}`}>
      <header className="tv4-page-heading">
        <div><h2>Kho tri thức</h2><p>Tài liệu nội bộ, truy xuất và đối chiếu</p></div>
        <div className="tv4-inline-stats"><span><strong>{stats.total}</strong> tài liệu</span><span><strong>{stats.ready}</strong> sẵn sàng</span></div>
      </header>
      <nav className="tv4-tabs" aria-label="Kho tri thức">
        <button type="button" aria-current={workspace === 'search' ? 'page' : undefined} onClick={() => setWorkspace('search')}><FileSearch className="h-4 w-4" /> Tra cứu</button>
        <button type="button" aria-current={workspace === 'documents' ? 'page' : undefined} onClick={() => setWorkspace('documents')}><Library className="h-4 w-4" /> Tài liệu ({stats.total})</button>
      </nav>
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[1px]"
          onMouseDown={() => {
            if (deletingId === null) setPendingDelete(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Xóa tài liệu?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tài liệu <strong>“{pendingDelete.title}”</strong> và toàn bộ nội dung đã lập chỉ mục sẽ bị xóa. Thao tác này không thể hoàn tác.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => setPendingDelete(null)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={handleDelete}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 text-xs font-semibold text-white transition hover:bg-rose-800 disabled:opacity-50"
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
          className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm ${
            message.type === 'success'
              ? 'border-emerald-200 text-emerald-700'
              : 'border-rose-200 text-rose-700'
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

      {workspace === 'documents' && (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Quản lý tài liệu
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
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

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
            <KnowledgeFlowStep icon={<UploadCloud className="h-4 w-4" />} label="Tải PDF" />
            <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
            <KnowledgeFlowStep icon={<Layers3 className="h-4 w-4" />} label="Lập chỉ mục" />
            <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
            <KnowledgeFlowStep icon={<FileSearch className="h-4 w-4" />} label="Tìm nội dung" />
            <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
            <KnowledgeFlowStep icon={<Bot className="h-4 w-4" />} label="AI tổng hợp" />
          </div>
        </div>

        <div className="grid xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-white p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Thêm tài liệu</h3>
                <p className="mt-0.5 text-xs text-slate-600">Tài liệu PDF</p>
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
              className={`mt-5 flex min-h-44 w-full flex-col items-center justify-center rounded-lg border border-dashed px-5 py-6 text-center transition ${
                isDraggingFile
                  ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-600/10'
                  : 'border-slate-300 bg-white hover:border-primary-600 hover:bg-white'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">Chọn file PDF</p>
              <p className="mt-1 text-xs text-slate-600">
                Kéo thả vào đây hoặc nhấn để chọn
              </p>
              <p className="mt-2 text-xs font-medium text-slate-600">
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
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
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
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="border-b border-slate-200 px-5 py-4 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Tài liệu đã nạp</h3>
                </div>
                <button
                  type="button"
                  onClick={loadDocuments}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>
              </div>
              {documents.length > 0 && (
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    value={documentSearch}
                    onChange={event => setDocumentSearch(event.target.value)}
                    placeholder="Tìm theo tên tài liệu..."
                    className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex min-h-80 items-center justify-center gap-3 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-semibold">Đang tải tài liệu...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">Chưa có tài liệu</p>
                <p className="mt-1 text-xs text-slate-600">Tải PDF đầu tiên để bắt đầu.</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                <Search className="h-5 w-5 text-slate-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Không tìm thấy tài liệu
                </p>
                <button
                  type="button"
                  onClick={() => setDocumentSearch('')}
                  className="mt-3 text-xs font-semibold text-primary-600 hover:underline"
                >
                  Xóa tìm kiếm
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredDocuments.map(document => (
                  <article
                    key={document.id}
                    className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:px-7"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-primary-50 group-hover:text-primary-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {document.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {document.uploader?.name ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-14 sm:pl-0">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        <Layers3 className="h-3.5 w-3.5" />
                        {document.chunkCount} nội dung
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
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
      )}
      {workspace === 'search' && (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-primary-600">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{isAdminPresentation ? 'Bạn cần tìm hiểu điều gì?' : 'Kiểm thử'}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {isAdminPresentation ? 'Tìm câu trả lời về chính sách, quy định và tài liệu nội bộ.' : 'Đặt câu hỏi và kiểm tra trực tiếp nội dung đã dùng làm căn cứ.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <form className="flex flex-col gap-2 md:flex-row" onSubmit={event => { event.preventDefault(); void handleSearch(); }} aria-label="Tra cứu tài liệu">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                aria-label="Câu hỏi tra cứu tài liệu nội bộ"
                maxLength={1000}
                disabled={searching}
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  if (!event.target.value.trim()) {
                    setRagResponse(null);
                    setLastQuestion('');
                                }
                }}
                placeholder="Ví dụ: Chính sách nghỉ phép của công ty như thế nào?"
                className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
              />
            </div>

            <button
              type="submit"
              disabled={searching}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {searching ? 'Đang tìm...' : 'Tìm câu trả lời'}
            </button>
          </form>
          {searching && <p role="status" className="mt-4 text-sm text-slate-600">Đang tìm nội dung liên quan và tổng hợp câu trả lời…</p>}

          {!ragResponse && !searching && (
            <div className="tv4-search-intro">
              <p>Tra cứu nhanh chính sách và quy định nội bộ của công ty.</p>
              {stats.ready === 0 && <button type="button" className="tv4-primary" onClick={() => setWorkspace('documents')}><UploadCloud className="h-4 w-4" /> Thêm tài liệu để bắt đầu</button>}
            </div>
          )}

          {ragResponse && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    Câu trả lời từ Kho tri thức
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ragResponse.sources.length > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ragResponse.sources.length === 0
                        ? 'Chưa đủ dữ liệu'
                        : ragResponse.aiGenerated
                          ? 'AI tổng hợp'
                          : 'Trích đoạn liên quan'}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {sourceDocuments.length} tài liệu
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ragResponse.sources.length > 0 ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-800" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRagResponse(null);
                      setLastQuestion('');
                    }}
                    title="Đóng kết quả"
                    aria-label="Đóng kết quả"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-slate-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {lastQuestion && (
                <p className="mt-4 text-sm leading-6 text-slate-700">
                  <span className="font-bold">Bạn hỏi: </span>{lastQuestion}
                </p>
              )}

              <KnowledgeAnswer answer={ragResponse.answer} />

              {ragResponse.requiresHrIntervention && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Nội dung này có thể cần bộ phận Nhân sự hỗ trợ trực tiếp.
                </div>
              )}

              {ragResponse.sources.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-700">
                    Nguồn tham khảo
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sourceDocuments.map(source => (
                      <span
                        key={source.documentId}
                        className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 [overflow-wrap:anywhere]"
                      >
                        {source.documentTitle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ragResponse.suggestedFollowUpQuestions.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-700">
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
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-xs font-bold text-slate-600 transition hover:border-primary-600 hover:text-primary-600 disabled:opacity-50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {ragResponse && <KnowledgeEvidence key={lastQuestion} documents={evidenceDocuments} />}

          {!searching && ragResponse && ragResponse.results.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center">
              <FileSearch className="mx-auto h-5 w-5 text-slate-500" />
              <p className="mt-2 text-xs font-bold text-slate-600">Chưa có kết quả phù hợp.</p>
            </div>
          )}
        </div>
      </section>
      )}
    </div>
  );
};

const MetricPill: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left">
    <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    <span className="text-xs font-medium text-slate-600">{label}</span>
  </div>
);

const KnowledgeFlowStep: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => (
  <div className="flex items-center gap-2 px-1 py-1.5 text-slate-600">
    <span className="text-primary-600">{icon}</span>
    <span className="text-xs font-semibold">{label}</span>
  </div>
);
