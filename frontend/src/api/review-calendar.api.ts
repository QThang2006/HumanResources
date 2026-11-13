import { apiClient } from './client';

export interface ReviewCalendar {
  reviewPeriod: string;
  openingDate: string;
  reminderDate: string;
  deadline: string;
  version: number;
  configured: boolean;
  updatedAt: string | null;
}
export interface ReviewDelivery {
  status: 'SENT' | 'PARTIAL' | 'FAILED';
  sentAt: string | null;
  emailNotified: boolean;
  telegramNotified: boolean;
}
export interface ReviewCalendarEmployee {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string | null;
  departmentName: string | null;
  submitted: boolean;
  review: { id: number; kpiScore: number; ratingRank: string; managerComment: string | null; submittedAt: string } | null;
  openingDelivery: ReviewDelivery | null;
  followUpDelivery: ReviewDelivery | null;
}
export interface ReviewCalendarBoard {
  calendar: ReviewCalendar;
  today: string;
  count: number;
  submittedCount: number;
  employees: ReviewCalendarEmployee[];
}
export type ReviewCalendarUpdate = Pick<ReviewCalendar, 'openingDate' | 'reminderDate' | 'deadline' | 'version'>;

export interface SubmitReviewInput {
  userId: number;
  reviewPeriod: string;
  kpiScore: number;
  managerComment?: string;
  ratingRank: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
}

export const reviewCalendarApi = {
  get: (period: string, signal?: AbortSignal): Promise<ReviewCalendarBoard> => apiClient.get(`/performance-reviews/calendar/${encodeURIComponent(period)}`, { signal }),
  update: (period: string, data: ReviewCalendarUpdate): Promise<ReviewCalendar> => apiClient.put(`/performance-reviews/calendar/${encodeURIComponent(period)}`, data),
  submitReview: (data: SubmitReviewInput): Promise<{ message: string; review: any }> => apiClient.post('/performance-reviews', data),
};
