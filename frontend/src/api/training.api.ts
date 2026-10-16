import { apiClient } from './client';

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
    createdAt: string;
}

export interface TrainingAssignment {
    id: number;

    user: {
        id: number;
        fullName: string;
        email: string;
    };

    course: {
        id: number;
        title: string;
        type: TrainingCourseType;
    };

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

    getCourses: async (): Promise<TrainingCourse[]> => {
        return apiClient.get('/training/courses');
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
    ): Promise<TrainingAiSuggestion> => {
        return apiClient.post('/training/ai-suggest', {
            userId,
        });
    },
    getAiReadiness: async (
        userId: number,
    ): Promise<TrainingAiReadiness> => {
        return apiClient.get(`/training/ai-readiness/${userId}`);
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
