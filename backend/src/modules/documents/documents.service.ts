import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Document, DocumentStatus } from '../../entities/document.entity';
import { DocumentChunk } from '../../entities/document-chunk.entity';
import { VectorService } from '../core/ai/vector.service';

const pdfParse = require('pdf-parse');
@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(Document)
        private readonly documentRepository: Repository<Document>,

        @InjectRepository(DocumentChunk)
        private readonly chunkRepository: Repository<DocumentChunk>,

        private readonly vectorService: VectorService,
    ) {}

    async findAll() {
        const documents = await this.documentRepository.find({
            relations: {
                uploader: true,
                chunks: true,
            },
            order: {
                createdAt: 'DESC',
            },
        });

        return documents.map((document) => ({
            id: document.id,
            title: document.title,
            fileUrl: document.fileUrl,
            fileType: document.fileType,
            status: document.status,
            uploadedBy: document.uploadedBy,
            uploader: document.uploader
                ? {
                    id: document.uploader.id,
                    name: document.uploader.fullName,
                    email: document.uploader.email,
                }
                : null,
            chunkCount: document.chunks?.length ?? 0,
            createdAt: document.createdAt,
        }));
    }
    async uploadPdf(file: Express.Multer.File, uploadedBy: number) {
        const decodedName = Buffer.from(
            file.originalname,
            'latin1',
        ).toString('utf8');

        const safeTitle = decodedName.includes('�')
            ? file.originalname
            : decodedName;
        const document = this.documentRepository.create({
            uploadedBy,
            title: safeTitle,
            fileUrl: file.path.replace(/\\/g, '/'),
            fileType: file.mimetype,
            status: DocumentStatus.PROCESSING,
        });

        const savedDocument = await this.documentRepository.save(document);

        try {
            const buffer = fs.readFileSync(file.path);
            const parsed = await pdfParse(buffer);

            const chunks = this.vectorService.chunkText(parsed.text);

            for (let index = 0; index < chunks.length; index++) {
                const content = chunks[index];

                const embedding =
                    await this.vectorService.generateEmbedding(content);

                const chunk = this.chunkRepository.create({
                    documentId: savedDocument.id,
                    chunkIndex: index,
                    content,
                    embedding,
                });

                await this.chunkRepository.save(chunk);
            }

            savedDocument.status = DocumentStatus.READY;
            await this.documentRepository.save(savedDocument);

            return {
                id: savedDocument.id,
                title: savedDocument.title,
                status: savedDocument.status,
                chunkCount: chunks.length,
                message: 'Tài liệu đã được xử lý và đưa vào Knowledge Base.',
            };
        } catch (error) {
            savedDocument.status = DocumentStatus.FAILED;
            await this.documentRepository.save(savedDocument);

            throw error;
        }
    }
    async searchKnowledgeBase(
        query: string,
        topK: number = 3,
    ) {
        const queryEmbedding =
            await this.vectorService.generateEmbedding(query);

        const chunks = await this.chunkRepository.find({
            relations: {
                document: true,
            },
        });

        const readyChunks = chunks.filter(
            (chunk) =>
                chunk.document &&
                chunk.document.status === DocumentStatus.READY,
        );

        const results = this.vectorService.findSimilar(
            queryEmbedding,
            readyChunks,
            Math.max(topK * 3, topK),
            0.1,
        );

// Loại bỏ các chunk có nội dung trùng nhau,
// ví dụ cùng một PDF vô tình được upload nhiều lần.
        const seenContents = new Set<string>();

        const uniqueResults = results
            .filter((result) => {
                const normalizedContent = result.chunk.content
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();

                if (seenContents.has(normalizedContent)) {
                    return false;
                }

                seenContents.add(normalizedContent);
                return true;
            })
            .slice(0, topK);

        return uniqueResults.map((result) => ({
            chunkId: result.chunk.id,
            documentId: result.chunk.documentId,
            documentTitle: result.chunk.document.title,
            chunkIndex: result.chunk.chunkIndex,
            content: result.chunk.content,
            similarity: Number(result.similarity.toFixed(4)),
        }));
    }
}