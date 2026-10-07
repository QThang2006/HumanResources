import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { TrainingCourseType } from '../../entities/training-course.entity';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.HR)
export class TrainingController {
    @Get('summary')
    getTrainingSummary() {
        return this.trainingService.getTrainingSummary();
    }
    constructor(
        private readonly trainingService: TrainingService,
    ) {}

    @Get('courses')
    findAllCourses() {
        return this.trainingService.findAllCourses();
    }
    @Post('courses')
    createCourse(
        @Body()
        body: {
            title: string;
            type: TrainingCourseType;
            skillsProvided: string[];
            courseUrl?: string;
            durationHours?: number;
        },
    )
    {
        return this.trainingService.createCourse(body);
    }
    @Post('assignments')
    assignCourse(
        @Body()
        body: {
            userId: number;
            courseId: number;
            assignedByAi?: boolean;
            aiReason?: string;
        },
    ) {
        return this.trainingService.assignCourse(body);
    }
    @Get('assignments')
    findAllAssignments() {
        return this.trainingService.findAllAssignments();
    }
    @Patch('assignments/:id/progress')
    updateProgress(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { progressPercent: number },
    ) {
        return this.trainingService.updateProgress(
            id,
            body.progressPercent,
        );
    }

}