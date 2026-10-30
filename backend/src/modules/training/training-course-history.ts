import type { EmployeeTraining, TrainingCourseSnapshot } from '../../entities/employee-training.entity';

/** TV4: retained course details keep employee learning records independent of the catalog. */
export function getTrainingCourseDetails(training: EmployeeTraining): TrainingCourseSnapshot | null {
  const course = training.course;
  if (!course) return training.courseSnapshot ?? null;
  return {
    id: course.id,
    title: course.title,
    type: course.type,
    skillsProvided: course.skillsProvided ?? [],
    courseUrl: course.courseUrl ?? null,
    durationHours: course.durationHours,
  };
}
