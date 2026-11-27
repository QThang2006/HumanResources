import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OffboardingService } from './offboarding.service';

/** A last working date remains active for the whole Vietnam calendar day. */
@Injectable()
export class OffboardingLifecycleWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OffboardingLifecycleWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;

  constructor(private readonly offboarding: OffboardingService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.running) {
        this.running = this.offboarding.finalizeOverdue().then(() => undefined).catch(() => {
          this.logger.warn('Offboarding closure check failed; pending cases will be checked again.');
        }).finally(() => { this.running = undefined; });
      }
    }, 60_000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running;
  }
}
