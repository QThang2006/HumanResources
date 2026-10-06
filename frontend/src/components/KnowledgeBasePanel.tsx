import React, { useCallback, useEffect, useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
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
            setMessage({
                type: 'error',
                text: 'Vui lòng chọn file PDF.',
            });
            return;
        }

        if (selectedFile.type !== 'application/pdf') {
            setMessage({
                type: 'error',
                text: 'Chỉ chấp nhận file PDF.',
            });
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

            const results = await documentsApi.search(
                trimmedQuery,
                3,
            );

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

    return (
        <div className="space-y-6">
            {message && (
                <div
                    className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                        message.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
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

            {/* Upload PDF */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <UploadCloud className="h-4 w-4 text-indigo-600" />
                        Knowledge Base PDF
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                        Nạp tài liệu PDF, tự động chia chunks và tạo vector embedding cho RAG.
                    </p>
                </div>

                <div className="rounded-xl border-2 border-dashed border-slate-200 p-5">
                    <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) =>
                            setSelectedFile(event.target.files?.[0] ?? null)
                        }
                        className="block w-full text-sm text-slate-600
              file:mr-4 file:rounded-lg file:border-0
              file:bg-indigo-50 file:px-4 file:py-2
              file:text-xs file:font-bold file:text-indigo-700
              hover:file:bg-indigo-100"
                    />

                    {selectedFile && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                            <FileText className="h-4 w-4 text-indigo-500" />
                            <span className="font-medium">
                {selectedFile.name}
              </span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl
              bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white
              transition-colors hover:bg-indigo-700
              disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang xử lý PDF...
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-4 w-4" />
                                Tải lên Knowledge Base
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Danh sách tài liệu */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Tài liệu đã nạp
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Theo dõi trạng thái xử lý và số lượng chunks.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadDocuments}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs font-semibold
              text-slate-500 hover:text-indigo-600 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${
                                loading ? 'animate-spin' : ''
                            }`}
                        />
                        Làm mới
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang tải tài liệu...
                    </div>
                ) : documents.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">
                        Chưa có tài liệu nào trong Knowledge Base.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-slate-100 text-left">
                                <th className="px-3 py-2.5 text-xs text-slate-400">
                                    Tài liệu
                                </th>

                                <th className="px-3 py-2.5 text-xs text-slate-400">
                                    Trạng thái
                                </th>

                                <th className="px-3 py-2.5 text-xs text-slate-400">
                                    Chunks
                                </th>

                                <th className="px-3 py-2.5 text-xs text-slate-400">
                                    Người tải
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-50">
                            {documents.map((document) => (
                                <tr key={document.id}>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-indigo-500" />

                                            <span className="font-semibold text-slate-700">
                          {document.title}
                        </span>
                                        </div>
                                    </td>

                                    <td className="px-3 py-3">
                      <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              document.status === 'READY'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : document.status === 'FAILED'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-amber-50 text-amber-700'
                          }`}
                      >
                        {document.status}
                      </span>
                                    </td>

                                    <td className="px-3 py-3 text-xs text-slate-600">
                                        {document.chunkCount}
                                    </td>

                                    <td className="px-3 py-3 text-xs text-slate-600">
                                        {document.uploader?.name ?? '—'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* RAG Testing */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <Search className="h-4 w-4 text-indigo-600" />
                    RAG Testing Sandbox
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                    Nhập câu hỏi để kiểm tra Cosine Similarity với các chunks trong Knowledge Base.
                </p>

                <div className="mt-5 flex gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                handleSearch();
                            }
                        }}
                        placeholder="Ví dụ: Thuật toán Bresenham hoạt động như thế nào?"
                        className="flex-1 rounded-xl border border-slate-300 px-4 py-3
              text-sm outline-none focus:border-indigo-500"
                    />

                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={searching}
                        className="inline-flex items-center gap-2 rounded-xl
              bg-slate-900 px-5 py-3 text-xs font-bold text-white
              hover:bg-slate-800 disabled:opacity-50"
                    >
                        {searching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}

                        Kiểm thử
                    </button>
                </div>

                {searchResults.length > 0 && (
                    <div className="mt-5 space-y-3">
                        {searchResults.map((result, index) => (
                            <div
                                key={result.chunkId}
                                className="rounded-xl border border-slate-200 p-4"
                            >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="text-xs font-bold text-slate-700">
                                        #{index + 1} • {result.documentTitle}
                                    </div>

                                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                    Similarity:{' '}
                                        {(result.similarity * 100).toFixed(2)}%
                  </span>
                                </div>

                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                    {result.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {!searching &&
                    query.trim() &&
                    searchResults.length === 0 && (
                        <p className="mt-4 text-xs text-slate-400">
                            Chưa có kết quả RAG phù hợp.
                        </p>
                    )}
            </div>
        </div>
    );
};