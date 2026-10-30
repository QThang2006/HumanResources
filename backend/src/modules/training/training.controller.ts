import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    ParseBoolPipe,
    Patch,
    Post,
    Query,
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
    findAllCourses(
        @Query('includeArchived', new ParseBoolPipe({ optional: true }))
        includeArchived?: boolean,
    ) {
        return this.trainingService.findAllCourses(includeArchived ?? false);
    }
    @Get('courses/:id/assignments')
    findCourseAssignments(@Param('id', ParseIntPipe) courseId: number) {
        return this.trainingService.findCourseAssignments(courseId);
    }
    @Delete('courses/:id')
    archiveCourse(@Param('id', ParseIntPipe) courseId: number) {
        return this.trainingService.setCourseArchived(courseId, true);
    }
    @Patch('courses/:id/restore')
    restoreCourse(@Param('id', ParseIntPipe) courseId: number) {
        return this.trainingService.setCourseArchived(courseId, false);
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
    @Post('ai-suggest')
    suggestCourseForEmployee(
        @Body() body: { userId: number },
    ) {
        return this.trainingService.suggestCourseForEmployee(
            body.userId,
        );
    }
    @Get('ai-readiness/:userId')
    getAiReadiness(
        @Param('userId', ParseIntPipe) userId: number,
    ) {
        return this.trainingService.getAiReadiness(userId);
    }
    @Post('assignments')
    assignCourse(
        @Body()
        body: {
            userId: number;
            courseId: number;
            assignedByAi?: boolean;
            aiReason?: string;
            dueAt?: string;
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
    @Patch('assignments/:id/due-date')
    updateDueDate(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { dueAt: string },
    ) {
        return this.trainingService.updateDueDate(id, body.dueAt);
    }

}
