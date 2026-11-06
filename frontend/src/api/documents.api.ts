import { apiClient } from './client';

export interface KnowledgeDocument {
    id: number;
    title: string;
    fileUrl: string;
    fileType: string;
    status: 'PROCESSING' | 'READY' | 'FAILED';
    uploadedBy: number;

    uploader: {
        id: number;
        name: string;
        email: string;
    } | null;

    chunkCount: number;
    createdAt: string;
}

export interface RagSearchResult {
    chunkId: number;
    documentId: number;
    documentTitle: string;
    chunkIndex: number;
    content: string;
    similarity: number;
}

export interface RagWorkflowSearchResponse {
    workflow: string;
    answer: string;
    sources: Array<{
        chunkId: number;
        documentId: number;
        documentTitle: string;
        similarity: number;
        chunkIndex?: number;
        excerpt?: string;
        excerptIsPartial?: boolean;
    }>;
    results: RagSearchResult[];
    suggestedFollowUpQuestions: string[];
    requiresHrIntervention: boolean;
    aiGenerated: boolean;
}

export const documentsApi = {
    getAll: async (): Promise<KnowledgeDocument[]> => {
        return apiClient.get('/documents');
    },

    uploadPdf: async (
        file: File,
    ): Promise<{
        id: number;
        title: string;
        status: string;
        chunkCount: number;
        message: string;
    }> => {
        const formData = new FormData();
        formData.append('file', file);

        return apiClient.post('/documents/upload', formData);
    },

    delete: async (
        documentId: number,
    ): Promise<{ id: number; message: string }> => {
        return apiClient.delete(`/documents/${documentId}`);
    },

    search: async (
        query: string,
        topK: number = 3,
    ): Promise<RagSearchResult[]> => {
        return apiClient.post('/documents/search', {
            query,
            topK,
        });
    },

    searchThroughWorkflow: async (
        query: string,
        topK: number = 3,
    ): Promise<RagWorkflowSearchResponse> => {
        return apiClient.post('/documents/workflow-search', {
            query,
            topK,
        });
    },
};
