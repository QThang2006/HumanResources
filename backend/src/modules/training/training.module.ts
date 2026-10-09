import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../core/ai/ai.module';

import { TrainingCourse } from '../../entities/training-course.entity';
import { EmployeeTraining } from '../../entities/employee-training.entity';
import { User } from '../../entities/user.entity';

import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            TrainingCourse,
            EmployeeTraining,
            User,
        ]),
        AiModule,
    ],
    controllers: [TrainingController],
    providers: [TrainingService],
    exports: [TrainingService],
})
export class TrainingModule {}