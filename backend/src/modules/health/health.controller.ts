import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    let dbStatus = 'disconnected';
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          database: 'disconnected',
          message: error?.message || 'Database connection error',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
