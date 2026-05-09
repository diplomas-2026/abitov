package com.github.danbel.abitovapi.service;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationScheduler {

    private final NotificationService notificationService;

    public NotificationScheduler(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        notificationService.runReminderSweep();
    }

    @Scheduled(cron = "${app.notification.cron:0 0 8 * * *}")
    public void sweepDaily() {
        notificationService.runReminderSweep();
    }
}
