import { NextResponse } from 'next/server';

export class ApiResponse {
  static success(data: any, message: string = 'Success', status: number = 200) {
    return NextResponse.json(
      {
        success: true,
        message,
        data,
      },
      { status }
    );
  }

  static error(message: string, status: number = 500, errors?: any[]) {
    return NextResponse.json(
      {
        success: false,
        message,
        errors,
      },
      { status }
    );
  }

  static validationError(errors: any[]) {
    return this.error('Validation failed', 400, errors);
  }

  static notFound(message: string = 'Resource not found') {
    return this.error(message, 404);
  }

  static forbidden(message: string = 'Forbidden') {
    return this.error(message, 403);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return this.error(message, 401);
  }
}