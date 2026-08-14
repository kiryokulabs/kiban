import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  readonly active = signal(false);

  start(): void {
    this.counter++;
    this.active.set(true);
  }

  stop(): void {
    this.counter = Math.max(0, this.counter - 1);
    if (this.counter === 0) {
      this.active.set(false);
    }
  }
}
