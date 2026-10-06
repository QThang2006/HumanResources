import { BadRequestException, Injectable, NotFoundException, UnsupportedMediaTypeException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { Worker } from 'worker_threads';

export const MAX_CV_BYTES = 5 * 1024 * 1024;
@Injectable()
export class CvStorageService {
  private readonly directory = resolve(process.env.ATS_UPLOAD_DIR || '.ats-private/cv');
  async parse(file?: Express.Multer.File): Promise<string | null> {
    if (!file) throw new BadRequestException('Vui lòng đính kèm CV PDF.');
    if (!file.size || file.size > MAX_CV_BYTES) throw new BadRequestException('CV phải có dung lượng từ 1 byte đến 5 MiB.');
    if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname) || file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new UnsupportedMediaTypeException('Chỉ chấp nhận file PDF hợp lệ.');
    }
    // Parsing untrusted PDFs runs outside the API event loop with bounded time/memory.
    return new Promise((accept, reject) => {
      const worker = new Worker(`
        const { parentPort, workerData } = require('node:worker_threads');
        const parse = require(workerData.parser);
        // Legacy pdf.js expects Uint8Array slicing semantics, not Node Buffer.slice.
        parse(Uint8Array.from(workerData.buffer), { max: 40 }).then(result => {
          parentPort.postMessage({ text: result.text, pages: result.numpages });
        }).catch(() => parentPort.postMessage({ error: true }));
      `, { eval: true, workerData: { parser: require.resolve('pdf-parse/lib/pdf-parse.js'), buffer: file.buffer }, resourceLimits: { maxOldGenerationSizeMb: 128 } });
      let settled = false;
      const finish = (error?: Error, text?: string | null) => {
        if (settled) return;
        settled = true; clearTimeout(timer); void worker.terminate();
        error ? reject(error) : accept(text ?? null);
      };
      const timer = setTimeout(() => finish(new UnprocessableEntityException('PDF xử lý quá lâu. Hãy xuất lại file PDF có văn bản.')), 10000);
      worker.once('message', (message: { error?: boolean; text?: string; pages?: number }) => {
        if (message.error || typeof message.text !== 'string') return finish(new UnprocessableEntityException('Không đọc được PDF. File có thể hỏng hoặc có mật khẩu.'));
        if (message.pages > 40 || message.text.length > 60000) return finish(new UnprocessableEntityException('CV quá dài. Giới hạn 40 trang và 60.000 ký tự.'));
        finish(undefined, message.text.trim() || null);
      });
      worker.once('error', () => finish(new UnprocessableEntityException('Không đọc được PDF.')));
      worker.once('exit', () => { if (!settled) finish(new UnprocessableEntityException('Không đọc được PDF.')); });
    });
  }
  async save(file: Express.Multer.File) {
    await mkdir(this.directory, { recursive: true });
    const key = randomUUID() + '.pdf';
    await writeFile(join(this.directory, key), file.buffer, { flag: 'wx', mode: 0o600 });
    return key;
  }
  private filePath(key: string) {
    if (!/^[a-f0-9-]{36}\.pdf$/.test(key)) throw new NotFoundException('CV chưa có file lưu hợp lệ.');
    return join(this.directory, key);
  }
  async read(key: string) {
    try { return await readFile(this.filePath(key)); }
    catch { throw new NotFoundException('Không tìm thấy file CV.'); }
  }
  async remove(key: string) {
    await unlink(this.filePath(key)).catch(() => undefined);
  }
}
