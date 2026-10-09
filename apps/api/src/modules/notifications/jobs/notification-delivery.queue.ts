export const NOTIFICATION_DELIVERY_QUEUE = 'notifications.delivery';
export const NOTIFICATION_DELIVERY_JOB = 'deliver';

export interface NotificationDeliveryJob {
  deliveryId: string;
  organizationId: string;
}
