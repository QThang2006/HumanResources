import { cleanKnowledgeAnswer } from './knowledge-evidence';

export function KnowledgeAnswer({ answer }: { answer: string }) {
  const blocks: Array<{ type: 'paragraph' | 'list'; lines: string[] }> = [];
  let current: (typeof blocks)[number] | null = null;
  for (const line of cleanKnowledgeAnswer(answer).split('\n')) {
    const text = line.trim();
    if (!text) { current = null; continue; }
    const isList = /^[•*-]\s+/.test(text);
    const type = isList ? 'list' : 'paragraph';
    if (!current || current.type !== type) {
      current = { type, lines: [] };
      blocks.push(current);
    }
    current.lines.push(isList ? text.replace(/^[•*-]\s+/, '') : text);
  }
  return <div className="mt-5 max-w-prose space-y-3 text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">{blocks.map((block, index) => block.type === 'list'
    ? <ul key={index} className="list-disc space-y-2 pl-5">{block.lines.map((line, lineIndex) => <li key={lineIndex}>{line}</li>)}</ul>
    : <p key={index}>{block.lines.join(' ')}</p>)}</div>;
}
