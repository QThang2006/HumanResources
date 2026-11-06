import { ChevronDown, FileText } from 'lucide-react';
import type { EvidenceDocument } from './knowledge-evidence';

export function KnowledgeEvidence({ documents }: { documents: EvidenceDocument[] }) {
  if (!documents.length) return null;
  const count = documents.reduce((total, document) => total + document.quotes.length, 0);
  return <details className="tv4-knowledge-evidence [&[open]>summary>svg]:rotate-180 mt-5 overflow-hidden rounded-xl border border-slate-200">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 bg-slate-50 px-4 py-3 text-left text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600 [&::-webkit-details-marker]:hidden">
      <span><span className="block text-sm font-semibold">Xem trích đoạn gốc</span><span className="mt-1 block text-xs leading-5 text-slate-600">{count > 0 ? `${count} trích đoạn được dùng từ ${documents.length} tài liệu` : `${documents.length} tài liệu đã được sử dụng`}</span></span>
      <ChevronDown size={18} aria-hidden="true" className="shrink-0" />
    </summary>
    <div className="divide-y divide-slate-200 bg-white">
      {documents.map(document => <section key={document.documentId} className="px-4 py-5 sm:px-5" aria-label={`Trích đoạn từ ${document.title}`}>
        <h5 className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-900"><FileText size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary-600" /><span className="min-w-0 [overflow-wrap:anywhere]">{document.title}</span></h5>
        {document.quotes.length > 0 && <div className="mt-4 space-y-5">{document.quotes.map(quote => <blockquote key={quote.chunkId} className="m-0 max-w-prose whitespace-pre-wrap text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">{quote.partial && <span aria-label="Đã lược bớt phần trước">… </span>}{quote.text}{quote.partial && <span aria-label="Đã lược bớt phần sau"> …</span>}</blockquote>)}</div>}
        {document.unavailable && <p className="mt-3 text-sm leading-6 text-slate-600">Một trích đoạn đã lưu chưa có đủ câu hoàn chỉnh để hiển thị. Vui lòng kiểm tra tài liệu gốc.</p>}
      </section>)}
      <p className="px-4 py-3 text-xs leading-5 text-slate-600 sm:px-5">Dấu … cho biết một phần văn bản đã được lược bớt hoặc đoạn trích chưa bao gồm đầy đủ phần trước và sau.</p>
    </div>
  </details>;
}
