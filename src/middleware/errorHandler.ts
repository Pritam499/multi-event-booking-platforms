import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/apiResponse';



export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const apiError = error as ApiError;

      console.error('API Error:', {
        message: apiError.message,
        stack: apiError.stack,
        statusCode: apiError.statusCode,
      });

      // Handle different types of errors
      if (apiError.statusCode) {
        return ApiResponse.error(apiError.message, apiError.statusCode, apiError.errors);
      }

      // Handle Payload-specific errors
      if (apiError.message?.includes('Forbidden') || apiError.message?.includes('forbidden')) {
        return ApiResponse.forbidden(apiError.message);
      }

      if (apiError.message?.includes('Unauthorized') || apiError.message?.includes('unauthorized')) {
        return ApiResponse.unauthorized(apiError.message);
      }

      if (apiError.message?.includes('Not found') || apiError.message?.includes('not found')) {
        return ApiResponse.notFound(apiError.message);
      }

      // Default internal server error
      return ApiResponse.error(
        apiError.message || 'Internal server error',
        500
      );
    }
  };
}

// Helper function to create API errors
export class ApiError extends Error {
  public statusCode: number;
  public errors?: any[];

  constructor(message: string, statusCode: number = 500, errors?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: any[]) {
    return new ApiError(message, 400, errors);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(message, 403);
  }

  static notFound(message: string = 'Resource not found') {
    return new ApiError(message, 404);
  }

  static conflict(message: string = 'Conflict') {
    return new ApiError(message, 409);
  }
}