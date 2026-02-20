import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);

  /** Observable para que el componente escuche los cambios */
  notifications$ = this.notificationsSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  show(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
    duration: number = 3000
  ) {
    const id = this.generateId();
    const notification: Notification = {
      id,
      message,
      type,
      duration
    };

    this.notifications = [...this.notifications, notification];
    this.notificationsSubject.next(this.notifications);

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => this.remove(id));
      }, duration);
    });
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notificationsSubject.next(this.notifications);
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
