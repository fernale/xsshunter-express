// NotificationPlugin/index.js
import Notifications from './Notifications.vue';

const NotificationStore = {
  state: [], // notifications array
  settings: {
    overlap: false,
    verticalAlign: 'top',
    horizontalAlign: 'right',
    type: 'info',
    timeout: 5000,
    closeOnClick: true,
    showClose: true,
  },
  setOptions(options) {
    this.settings = Object.assign(this.settings, options);
  },
  removeNotification(timestamp) {
    const indexToDelete = this.state.findIndex(n => n.timestamp === timestamp);
    if (indexToDelete !== -1) {
      this.state.splice(indexToDelete, 1);
    }
  },
  addNotification(notification) {
    if (typeof notification === 'string' || notification instanceof String) {
      notification = { message: notification };
    }
    notification.timestamp = new Date();
    notification.timestamp.setMilliseconds(
      notification.timestamp.getMilliseconds() + this.state.length
    );
    notification = Object.assign({}, this.settings, notification);
    this.state.push(notification);
  },
  notify(notification) {
    if (Array.isArray(notification)) {
      notification.forEach(notificationInstance => {
        this.addNotification(notificationInstance);
      });
    } else {
      this.addNotification(notification);
    }
  }
};

const NotificationsPlugin = {
  install(app, options) {
    // Provide global properties accessible via this.$notify and this.$notifications
    app.config.globalProperties.$notify = NotificationStore.notify.bind(NotificationStore);
    app.config.globalProperties.$notifications = NotificationStore;

    // Optionally set config options
    if (options) {
      NotificationStore.setOptions(options);
    }

    // Register component globally
    app.component('Notifications', Notifications);
  }
};

export default NotificationsPlugin;
