import payload from 'payload';
import { COLLECTIONS } from '@/constants/collections';
import { ApiError } from '@/middleware/errorHandler';
import type { CollectionSlug } from 'payload';

/**
 * Database utilities for common Payload operations
 */
export class DatabaseUtils {
  /**
   * Find document by ID with error handling
   */
  static async findById(collection: CollectionSlug, id: string | number, depth: number = 0) {
    try {
      const doc = await payload.findByID({
        collection: collection as any,
        id: String(id),
        depth,
      });

      if (!doc) {
        const collectionName = Object.values(COLLECTIONS).find(value => value === collection) || collection;
        throw ApiError.notFound(`${collectionName.slice(0, -1)} not found`);
      }

      return doc;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.notFound('Document not found');
    }
  }

  /**
   * Find documents with pagination and filtering
   */
  static async find(
    collection: CollectionSlug,
    options: {
      where?: any;
      sort?: string;
      limit?: number;
      page?: number;
      depth?: number;
    } = {}
  ) {
    try {
      return await payload.find({
        collection: collection as any,
        where: options.where,
        sort: options.sort || '-createdAt',
        limit: options.limit || 10,
        page: options.page || 1,
        depth: options.depth || 1,
      });
    } catch (error) {
      throw ApiError.notFound('Failed to fetch documents');
    }
  }

  /**
   * Create a new document
   */
  static async create(collection: CollectionSlug, data: any, user?: any) {
    try {
      return await payload.create({
        collection: collection as any,
        data,
        req: user ? { user } : undefined,
      });
    } catch (error) {
      throw ApiError.badRequest('Failed to create document');
    }
  }

  /**
   * Update an existing document
   */
  static async update(collection: CollectionSlug, id: string | number, data: any, user?: any) {
    try {
      return await payload.update({
        collection: collection as any,
        id,
        data,
        req: user ? { user } : undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw ApiError.notFound('Document not found');
      }
      throw ApiError.badRequest('Failed to update document');
    }
  }

  /**
   * Delete a document
   */
  static async delete(collection: CollectionSlug, id: string | number, user?: any) {
    try {
      return await payload.delete({
        collection: collection as any,
        id,
        req: user ? { user } : undefined,
      });
    } catch (error) {
      throw ApiError.notFound('Document not found or could not be deleted');
    }
  }

  /**
   * Count documents matching criteria
   */
  static async count(collection: CollectionSlug, where?: any) {
    try {
      return await payload.count({
        collection: collection as any,
        where,
      });
    } catch (error) {
      throw ApiError.notFound('Failed to count documents');
    }
  }

  /**
   * Execute a custom query
   */
  static async query(operation: () => Promise<any>) {
    try {
      return await operation();
    } catch (error) {
      throw ApiError.notFound('Query failed');
    }
  }
}