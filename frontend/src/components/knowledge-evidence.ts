import type { RagWorkflowSearchResponse } from '../api/documents.api';

export interface EvidenceQuote { chunkId: number; chunkIndex: number; text: string; partial: boolean }
export interface EvidenceDocument { documentId: number; title: string; quotes: EvidenceQuote[]; unavailable: boolean }

export function cleanKnowledgeAnswer(answer: string): string {
  return answer.replace(/\[(?:nguồn|source)\s*:[^\]]*\]/giu, '')
    .replace(/[ \t]+([,.;:!?])/g, '$1').replace(/[ \t]+$/gm, '').trim();
}

export function groupKnowledgeEvidence(response: RagWorkflowSearchResponse): EvidenceDocument[] {
  const groups = new Map<number, EvidenceDocument>();
  const seenChunks = new Set<string>();
  for (const source of response.sources) {
    const key = `${source.documentId}:${source.chunkId}`;
    if (seenChunks.has(key)) continue;
    seenChunks.add(key);
    let group = groups.get(source.documentId);
    if (!group) {
      group = { documentId: source.documentId, title: source.documentTitle, quotes: [], unavailable: false };
      groups.set(source.documentId, group);
    }
    const result = response.results.find(item => item.chunkId === source.chunkId && item.documentId === source.documentId);
    // Older API responses have no prepared excerpt. Keep their text intact and
    // explicitly mark its boundaries rather than guessing missing content.
    const prepared = typeof source.excerpt === 'string';
    const text = (prepared ? source.excerpt : result?.content)?.trim();
    if (!text) { group.unavailable = true; continue; }
    const normalized = text.replace(/\s+/g, ' ');
    if (group.quotes.some(quote => quote.text.replace(/\s+/g, ' ') === normalized)) continue;
    group.quotes.push({ chunkId: source.chunkId, chunkIndex: source.chunkIndex ?? result?.chunkIndex ?? 0, text, partial: prepared ? Boolean(source.excerptIsPartial) : true });
  }
  return [...groups.values()].map(group => ({ ...group, quotes: group.quotes.sort((left, right) => left.chunkIndex - right.chunkIndex) }));
}
