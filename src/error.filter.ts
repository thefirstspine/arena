import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { LogService } from './@shared/log-shared/log.service';
import { Response } from 'express';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  constructor(
    private readonly logService: LogService,
  ) {}

  catch(exception: HttpException & Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let status: number = 500;
    if ( typeof exception.getStatus === 'function') {
      status = exception.getStatus();
    }
    if (status >= 500) {
      this.logService.error(
        `Global error with status ${status}`, {
          message: exception.message,
          name: exception.name,
          stack: exception.stack,
        });
    } else {
      this.logService.warning(
        `Global warning with status ${status}`, {
          message: exception.message,
          name: exception.name,
          stack: exception.stack,
        });
    }

    response
      .status(status)
      .json({
        message: status < 500 ? exception.message : undefined,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
  }
}
