import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { Worker } from 'worker_threads';

export const MAX_CV_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function hasImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  // WebP is RIFF with a WEBP form type at byte 8.
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  return false;
}

@Injectable()
export class CvStorageService {
  private readonly directory = resolve(process.env.ATS_UPLOAD_DIR || '.ats-private/cv');

  async parse(file?: Express.Multer.File): Promise<string | null> {
    if (!file) throw new BadRequestException('Vui lòng đính kèm CV PDF hoặc ảnh.');
    if (!file.size || file.size > MAX_CV_BYTES)
      throw new BadRequestException('CV phải có dung lượng từ 1 byte đến 5 MiB.');
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    const imageType = IMAGE_TYPES[extension];
    const isPdf = extension === '.pdf' && file.mimetype === 'application/pdf';
    const isImage = Boolean(imageType && file.mimetype === imageType);
    if (
      (!isPdf && !isImage) ||
      (isPdf && file.buffer.subarray(0, 5).toString() !== '%PDF-') ||
      (isImage && !hasImageSignature(file.buffer, imageType || ''))
    )
      throw new UnsupportedMediaTypeException('Chỉ chấp nhận PDF, PNG, JPG hoặc WEBP hợp lệ.');
    // Scanned PDFs and images have no text layer. Gemini Vision reads the original file later.
    if (isImage) return null;
    // Parsing untrusted PDFs runs outside the API event loop with bounded time/memory.
    return new Promise((accept, reject) => {
      const worker = new Worker(
        `
        const { parentPort, workerData } = require('node:worker_threads');
        const parse = require(workerData.parser);
        // Legacy pdf.js expects Uint8Array slicing semantics, not Node Buffer.slice.
        parse(Uint8Array.from(workerData.buffer), { max: 40 }).then(result => {
          parentPort.postMessage({ text: result.text, pages: result.numpages });
        }).catch(() => parentPort.postMessage({ error: true }));
      `,
        {
          eval: true,
          workerData: {
            parser: require.resolve('pdf-parse/lib/pdf-parse.js'),
            buffer: file.buffer,
          },
          resourceLimits: { maxOldGenerationSizeMb: 128 },
        },
      );
      let settled = false;
      const finish = (error?: Error, text?: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        error ? reject(error) : accept(text ?? null);
      };
      const timer = setTimeout(
        () =>
          finish(
            new UnprocessableEntityException(
              'PDF xử lý quá lâu. Hãy xuất lại file PDF có văn bản.',
            ),
          ),
        10000,
      );
      worker.once('message', (message: { error?: boolean; text?: string; pages?: number }) => {
        if (message.error || typeof message.text !== 'string')
          return finish(
            new UnprocessableEntityException(
              'Không đọc được PDF. File có thể hỏng hoặc có mật khẩu.',
            ),
          );
        if (message.pages > 40 || message.text.length > 60000)
          return finish(
            new UnprocessableEntityException('CV quá dài. Giới hạn 40 trang và 60.000 ký tự.'),
          );
        finish(undefined, message.text.trim() || null);
      });
      worker.once('error', () => finish(new UnprocessableEntityException('Không đọc được PDF.')));
      worker.once('exit', () => {
        if (!settled) finish(new UnprocessableEntityException('Không đọc được PDF.'));
      });
    });
  }

  async save(file: Express.Multer.File) {
    await mkdir(this.directory, { recursive: true });
    // Existing demo seed callers pass only the PDF buffer.
    const name = file.originalname || 'cv.pdf';
    const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
    const key = randomUUID() + (extension === '.pdf' || IMAGE_TYPES[extension] ? extension : '.pdf');
    await writeFile(join(this.directory, key), file.buffer, { flag: 'wx', mode: 0o600 });
    return key;
  }

  private filePath(key: string) {
    if (!/^[a-f0-9-]{36}\.(pdf|png|jpe?g|webp)$/.test(key))
      throw new NotFoundException('CV chưa có file lưu hợp lệ.');
    return join(this.directory, key);
  }

  mimeType(key: string) {
    const extension = key.slice(key.lastIndexOf('.')).toLowerCase();
    if (extension === '.pdf') return 'application/pdf';
    return IMAGE_TYPES[extension] || null;
  }

  async read(key: string) {
    try {
      return await readFile(this.filePath(key));
    } catch {
      throw new NotFoundException('Không tìm thấy file CV.');
    }
  }

  async remove(key: string) {
    await unlink(this.filePath(key)).catch(() => undefined);
  }
}
