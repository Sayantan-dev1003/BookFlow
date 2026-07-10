import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log the error for internal debugging
    if (status >= 500) {
      this.logger.error(
        `Status: ${status} Error: ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : '',
      );
    }

    const errorResponse = {
      statusCode: status,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
      error:
        typeof message === 'string'
          ? HttpStatus[status]
          : (message as any).error || HttpStatus[status],
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
