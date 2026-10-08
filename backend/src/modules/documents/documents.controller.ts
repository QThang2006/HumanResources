import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { DocumentsService } from './documents.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { User, UserRole } from '../../entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.HR)
export class DocumentsController {
    constructor(
        private readonly documentsService: DocumentsService,
    ) {}

    // =========================
    // 1. LẤY DANH SÁCH DOCUMENT
    // =========================
    @Get()
    findAll() {
        return this.documentsService.findAll();
    }

    // =========================
    // 2. UPLOAD PDF KNOWLEDGE BASE
    // =========================
    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            dest: './uploads/documents',

            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
            },

            fileFilter: (req, file, callback) => {
                if (file.mimetype !== 'application/pdf') {
                    return callback(
                        new BadRequestException(
                            'Chỉ chấp nhận file PDF.',
                        ),
                        false,
                    );
                }

                callback(null, true);
            },
        }),
    )
    uploadPdf(
        @UploadedFile() file: Express.Multer.File,
        @Req() request: { user: User },
    ) {
        if (!file) {
            throw new BadRequestException(
                'Vui lòng chọn file PDF.',
            );
        }

        return this.documentsService.uploadPdf(
            file,
            request.user.id,
        );
    }

    // =========================
    // 3. RAG SEARCH
    // =========================
    @Post('search')
    searchKnowledgeBase(
        @Body()
        body: {
            query: string;
            topK?: number;
        },
    ) {
        const query = body.query?.trim();

        if (!query) {
            throw new BadRequestException(
                'Vui lòng nhập câu hỏi cần tìm kiếm.',
            );
        }

        const topK = Math.min(
            Math.max(body.topK ?? 3, 1),
            10,
        );

        return this.documentsService.searchKnowledgeBase(
            query,
            topK,
        );
    }
}