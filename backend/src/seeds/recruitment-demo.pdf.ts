import { DemoJobSpec } from './recruitment-demo.catalog';

function ascii(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').replace(/đ/g, 'd').replace(/[^\x20-\x7e]/g, '-');
}
function pdfText(value: string) { return ascii(value).replace(/[\\()]/g, '\\$&'); }
function wrap(value: string, width = 85) {
  const lines: string[] = []; let line = '';
  for (const word of ascii(value).split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) { lines.push(line); line = ''; }
    line += (line ? ' ' : '') + word;
  }
  if (line) lines.push(line);
  return lines;
}

/** A text-based, one-page synthetic CV; no dependency or external service needed. */
export function demoCv(name: string, email: string, job: DemoJobSpec, experience: number) {
  const summary = `${experience} years of project experience in ${job.skills.slice(0, 3).join(', ')}. Focused on dependable delivery, clear documentation and collaboration with product and QA teams.`;
  const sections = [
    { title: 'PROFILE', lines: wrap(summary) },
    { title: 'CORE SKILLS', lines: wrap(job.skills.join('  |  ')) },
    { title: 'PROJECT EXPERIENCE', lines: [job.project, ...wrap('Implemented and reviewed a feature from requirements to release, documented API contracts and tested edge cases.'), ...wrap('Investigated defects with reproducible examples, added regression checks and improved monitoring of failures.')] },
    { title: 'EDUCATION', lines: ['Bachelor of Information Technology - synthetic education record', 'Coursework: database systems, software engineering and application security'] },
    { title: 'WORKING STYLE', lines: ['Code review, iterative delivery and constructive feedback', 'Vietnamese: native; English: technical reading and project communication'] },
  ];
  const commands: string[] = ['0.13 0.22 0.35 rg'];
  const text = (value: string, y: number, size = 11, bold = false) => {
    commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 54 ${y} Td (${pdfText(value)}) Tj ET`);
  };
  text(name, 744, 24, true); text(job.title, 714, 13);
  text(email, 693, 10); text('Portfolio: local demo project | Location: Vietnam', 676, 10);
  commands.push('0.80 0.85 0.90 RG 54 660 m 558 660 l S');
  let y = 634;
  for (const section of sections) {
    text(section.title, y, 11, true); y -= 22;
    for (const line of section.lines.flatMap(line => wrap(line))) { text(line, y); y -= 17; }
    y -= 15;
  }
  if (y < 80) throw new Error('Demo CV exceeds the one-page layout.');
  text('SYNTHETIC CV - TV2 demonstration only. This is not a real applicant.', 42, 8);
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
  ];
  let body = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(body, 'ascii')); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(body, 'ascii');
  body += 'xref\n0 7\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('');
  body += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { buffer: Buffer.from(body, 'ascii'), rawText: [ascii(name), ascii(job.title), email, ...sections.flatMap(section => [section.title, ...section.lines.map(ascii)]), 'SYNTHETIC CV - TV2 demonstration only.'].join('\n') };
}
