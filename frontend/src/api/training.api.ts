import { apiClient } from './client';
import { parseTrainingAiSuggestion } from './training-ai-response';

export type TrainingCourseType =
    | 'MANDATORY'
    | 'AI_SKILL_GAP'
    | 'SOFT_SKILL';

export type TrainingStatus =
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'COMPLETED';

export interface TrainingCourse {
    id: number;
    title: string;
    type: TrainingCourseType;
    skillsProvided: string[];
    courseUrl: string | null;
    durationHours: number;
    assignmentCount: number;
    isArchived: boolean;
    createdAt: string;
}

export interface TrainingAssignment {
    id: number;

    user: {
        id: number;
        fullName: string;
        email: string;
        jobTitle?: string | null;
        departmentName?: string | null;
        isActive?: boolean;
    };

    course: {
        id: number | null;
        title: string;
        type: TrainingCourseType;
        isArchived?: boolean;
        isDeleted?: boolean;
    };
    courseDeletedAt?: string | null;

    progressPercent: number;
    assignedByAi: boolean;
    aiReason: string | null;
    status: TrainingStatus;
    completedAt: string | null;
    dueAt: string | null;
    lastReminderAt: string | null;
    reminderCount: number;
    managerEscalatedAt: string | null;
    createdAt: string;
}

export interface TrainingSummary {
    totalAssignments: number;
    assigned: number;
    inProgress: number;
    completed: number;
    averageProgress: number;
    completionRate: number;
}

export interface TrainingCourseRoster {
    course: TrainingCourse;
    assignments: TrainingAssignment[];
}

export interface TrainingCourseMutation {
    id: number;
    isArchived: boolean;
    assignmentCount: number;
    message: string;
}
export interface TrainingAiSuggestion {
    employeeId: number;
    employeeName: string;
    analysisMode: 'FULL' | 'PRELIMINARY';
    dataNotice: string | null;
    skillGaps: string[];
    readinessScore: number;
    summary: string;

    courseId: number | null;
    courseTitle: string | null;
    matchedMissingSkills: string[];
    priority: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    estimatedTimeToComplete: string | null;

    reason: string;
    careerAdvice: string;

    assignedByAi: boolean;
    aiGenerated: boolean;
    hasMatchingCourse: boolean;
}
export interface TrainingAiReadiness {
    employeeId: number;
    employeeName: string;
    canAnalyze: boolean;
    analysisMode: 'FULL' | 'PRELIMINARY';
    hasJobTitle: boolean;
    hasDepartment: boolean;
    hasPerformanceReviews: boolean;
    reviewCount: number;
    latestKpiScore: number | null;
    trainingHistoryCount: number;
    availableCourseCount: number;
    missingData: string[];
}
export const trainingApi = {

    getCourses: async (includeArchived = false): Promise<TrainingCourse[]> => {
        return apiClient.get('/training/courses', { params: { includeArchived } });
    },

    getCourseAssignments: async (courseId: number, signal?: AbortSignal): Promise<TrainingCourseRoster> => {
        return apiClient.get(`/training/courses/${courseId}/assignments`, { signal });
    },

    removeCourse: async (courseId: number): Promise<TrainingCourseMutation> => {
        return apiClient.delete(`/training/courses/${courseId}`);
    },

    restoreCourse: async (courseId: number): Promise<TrainingCourseMutation> => {
        return apiClient.patch(`/training/courses/${courseId}/restore`);
    },

    deleteCoursePermanently: async (courseId: number): Promise<TrainingCourseMutation> => {
        return apiClient.delete(`/training/courses/${courseId}/permanent`);
    },


    createCourse: async (data: {
        title: string;
        type: TrainingCourseType;
        skillsProvided: string[];
        courseUrl?: string;
        durationHours?: number;
    }): Promise<TrainingCourse> => {
        return apiClient.post('/training/courses', data);
    },

    getAssignments: async (): Promise<TrainingAssignment[]> => {
        return apiClient.get('/training/assignments');
    },
    aiSuggestCourse: async (
        userId: number,
        signal?: AbortSignal,
    ): Promise<TrainingAiSuggestion> => {
        const response = await apiClient.post('/training/ai-suggest', {
            userId,
        }, { signal });
        return parseTrainingAiSuggestion(response);
    },
    getAiReadiness: async (
        userId: number,
        signal?: AbortSignal,
    ): Promise<TrainingAiReadiness> => {
        return apiClient.get(`/training/ai-readiness/${userId}`, { signal });
    },

    assignCourse: async (data: {
        userId: number;
        courseId: number;
        assignedByAi?: boolean;
        aiReason?: string;
        dueAt?: string;
    }) => {
        return apiClient.post('/training/assignments', data);
    },

    updateProgress: async (
        assignmentId: number,
        progressPercent: number,
    ) => {
        return apiClient.patch(
            `/training/assignments/${assignmentId}/progress`,
            {
                progressPercent,
            },
        );
    },
    updateDueDate: async (
        assignmentId: number,
        dueAt: string,
    ) => {
        return apiClient.patch(
            `/training/assignments/${assignmentId}/due-date`,
            { dueAt },
        );
    },

    getSummary: async (): Promise<TrainingSummary> => {
        return apiClient.get('/training/summary');
    },

};
