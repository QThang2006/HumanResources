import type { TrainingAiSuggestion } from './training.api';

// AI responses are untrusted at runtime, even when TypeScript types are present.
export function parseTrainingAiSuggestion(value: unknown): TrainingAiSuggestion {
  const invalid = () => new Error('Kết quả phân tích chưa đúng định dạng. Vui lòng thử lại.');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const result = value as Record<string, unknown>;
  const strings = (input: unknown) => Array.isArray(input) && input.every(item => typeof item === 'string');
  const nullableText = (input: unknown) => input === null || typeof input === 'string';
  const positiveId = (input: unknown) => typeof input === 'number' && Number.isSafeInteger(input) && input > 0;
  if (
    !positiveId(result.employeeId) || typeof result.employeeName !== 'string' ||
    !['FULL', 'PRELIMINARY'].includes(result.analysisMode as string) ||
    !nullableText(result.dataNotice) || !strings(result.skillGaps) ||
    typeof result.summary !== 'string' || typeof result.reason !== 'string' || typeof result.careerAdvice !== 'string' ||
    typeof result.readinessScore !== 'number' || !Number.isFinite(result.readinessScore) || result.readinessScore < 0 || result.readinessScore > 100 ||
    !(result.courseId === null || positiveId(result.courseId)) || !nullableText(result.courseTitle) ||
    !strings(result.matchedMissingSkills) || !nullableText(result.estimatedTimeToComplete) ||
    !(result.priority === null || ['HIGH', 'MEDIUM', 'LOW'].includes(result.priority as string)) ||
    typeof result.hasMatchingCourse !== 'boolean' || typeof result.assignedByAi !== 'boolean' || typeof result.aiGenerated !== 'boolean'
  ) throw invalid();
  if (result.hasMatchingCourse && (result.courseId === null || !result.courseTitle)) throw invalid();
  if (!result.hasMatchingCourse && result.courseId !== null) throw invalid();
  return value as TrainingAiSuggestion;
}
