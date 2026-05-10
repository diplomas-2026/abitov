package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.dto.NotificationDtos;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import com.github.danbel.abitovapi.service.NotificationService;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationDtos.NotificationResponse> list(HttpServletRequest request) {
        return notificationService.listNotifications(currentUser(request));
    }

    @PostMapping("/run-reminders")
    public NotificationDtos.ReminderRunResponse runReminders(HttpServletRequest request) {
        AuthenticatedUser user = currentUser(request);
        if (user == null || user.role() != Role.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        return notificationService.runReminderSweep();
    }

    @PostMapping("/courses/{id}/send")
    public NotificationDtos.BatchSendResponse sendByCourse(HttpServletRequest request, @org.springframework.web.bind.annotation.PathVariable Long id) {
        AuthenticatedUser user = currentUser(request);
        if (user == null || (user.role() != Role.ADMIN && user.role() != Role.METHODIST && user.role() != Role.TEACHER)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        return notificationService.sendCourseNotification(id, user);
    }

    @PostMapping("/enrollments/{id}/send")
    public NotificationDtos.BatchSendResponse sendByEnrollment(HttpServletRequest request, @org.springframework.web.bind.annotation.PathVariable Long id) {
        AuthenticatedUser user = currentUser(request);
        if (user == null || (user.role() != Role.ADMIN && user.role() != Role.METHODIST && user.role() != Role.TEACHER)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        return notificationService.sendEnrollmentNotification(id, user);
    }

    private AuthenticatedUser currentUser(HttpServletRequest request) {
        return (AuthenticatedUser) request.getAttribute(com.github.danbel.abitovapi.config.WebConfig.AuthInterceptor.ATTR);
    }
}
