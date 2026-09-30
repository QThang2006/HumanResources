import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { EmployeeTraining } from './employee-training.entity';

@Entity('training_courses')
export class TrainingCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'skills_provided', type: 'json' })
  skillsProvided: string[];

  @Column({ name: 'course_url', type: 'varchar', length: 500, nullable: true })
  courseUrl: string;

  @Column({ name: 'duration_hours', type: 'int', default: 10 })
  durationHours: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => EmployeeTraining, (training) => training.course)
  assignments: EmployeeTraining[];
}
