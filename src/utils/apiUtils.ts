import { NextRequest } from 'next/server';
import { ApiError } from '@/middleware/errorHandler';

/**
 * API utilities for common operations across controllers
 */
export class ApiUtils {

  /**
   * Parse JSON body with error handling
   */
  static async parseJsonBody<T>(request: NextRequest, schema?: any): Promise<T> {
    try {
      const body = await request.json();

      if (schema) {
        const validation = schema.safeParse(body);
        if (!validation.success) {
          throw ApiError.badRequest('Validation failed', validation.error.issues);
        }
        return validation.data as T;
      }

      return body as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.badRequest('Invalid JSON body');
    }
  }

  /**
   * Get pagination parameters from request
   */
  static getPaginationParams(request: NextRequest) {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    return {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)), // Max 100, min 1
    };
  }

  /**
   * Get sorting parameters from request
   */
  static getSortParams(request: NextRequest, defaultSort: string = '-createdAt') {
    const url = new URL(request.url);
    const sort = url.searchParams.get('sort') || defaultSort;
    return sort;
  }

  /**
   * Build database query options
   */
  static buildQueryOptions(request: NextRequest, defaults: { depth?: number; sort?: string; limit?: number } = {}) {
    const { page, limit } = this.getPaginationParams(request);
    const sort = this.getSortParams(request, defaults.sort);

    return {
      page,
      limit,
      sort,
      depth: defaults.depth || 1,
    };
  }
}