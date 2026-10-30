import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

import { EmployeeTraining } from './employee-training.entity';

export enum TrainingCourseType {
  MANDATORY = 'MANDATORY',
  AI_SKILL_GAP = 'AI_SKILL_GAP',
  SOFT_SKILL = 'SOFT_SKILL',
}

@Entity('training_courses')
export class TrainingCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: TrainingCourseType,
    default: TrainingCourseType.SOFT_SKILL,
  })
  type: TrainingCourseType;

  @Column({ name: 'skills_provided', type: 'json' })
  skillsProvided: string[];

  @Column({
    name: 'course_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  courseUrl: string;

  @Column({
    name: 'duration_hours',
    type: 'int',
    default: 10,
  })
  durationHours: number;

  // Removing a course from the catalog must never cascade-delete learning history.
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(
      () => EmployeeTraining,
      (training) => training.course,
  )
  assignments: EmployeeTraining[];
}
