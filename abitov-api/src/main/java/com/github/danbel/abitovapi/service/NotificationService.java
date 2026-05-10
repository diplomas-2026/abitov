package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.DeliveryChannel;
import com.github.danbel.abitovapi.domain.Enrollment;
import com.github.danbel.abitovapi.domain.EnrollmentStatus;
import com.github.danbel.abitovapi.domain.NotificationRecord;
import com.github.danbel.abitovapi.domain.NotificationStatus;
import com.github.danbel.abitovapi.domain.NotificationType;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.NotificationDtos;
import com.github.danbel.abitovapi.repository.NotificationRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EnrollmentService enrollmentService;
    private final CourseService courseService;
    private final UserService userService;
    private final EmailGateway emailGateway;
    private final int reminderDays;

    public NotificationService(
        NotificationRepository notificationRepository,
        EnrollmentService enrollmentService,
        CourseService courseService,
        UserService userService,
        EmailGateway emailGateway,
        @Value("${app.notification.reminder-days:30}") int reminderDays
    ) {
        this.notificationRepository = notificationRepository;
        this.enrollmentService = enrollmentService;
        this.courseService = courseService;
        this.userService = userService;
        this.emailGateway = emailGateway;
        this.reminderDays = reminderDays;
    }

    public List<NotificationDtos.NotificationResponse> listNotifications() {
        return streamNotifications()
            .sorted(Comparator.comparing(NotificationRecord::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<NotificationDtos.NotificationResponse> listNotifications(AuthenticatedUser currentUser) {
        return streamNotifications()
            .filter(notification -> isVisibleTo(currentUser, notification))
            .sorted(Comparator.comparing(NotificationRecord::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<NotificationRecord> allNotifications() {
        return streamNotifications().collect(Collectors.toList());
    }

    @Transactional
    public NotificationDtos.ReminderRunResponse runReminderSweep() {
        List<NotificationDtos.NotificationResponse> created = new ArrayList<>();
        int sent = 0;
        int failed = 0;
        LocalDate today = LocalDate.now();
        LocalDate limit = today.plusDays(reminderDays);

        for (Enrollment enrollment : enrollmentService.allEnrollments()) {
            if (enrollment.getNextDueAt() == null || enrollment.getStatus() == EnrollmentStatus.CANCELLED) {
                continue;
            }
            if (enrollment.getNextDueAt().isAfter(limit)) {
                continue;
            }
            if (alreadyHasReminder(enrollment.getId(), enrollment.getNextDueAt())) {
                continue;
            }

            var client = userService.requireEntity(enrollment.getClientId());
            var course = courseService.requireEntity(enrollment.getCourseId());
            String subject = "Напоминание о повторном обучении: " + course.getTitle();
            String message = buildMessage(client.getFirstName(), course.getTitle(), enrollment.getNextDueAt());
            NotificationRecord record = NotificationRecord.builder()
                .enrollmentId(enrollment.getId())
                .clientId(client.getId())
                .recipientEmail(client.getEmail())
                .type(NotificationType.REPEAT_REMINDER)
                .subject(subject)
                .message(message)
                .dueAt(enrollment.getNextDueAt())
                .createdAt(Instant.now())
                .status(NotificationStatus.PENDING)
                .deliveryChannel(DeliveryChannel.EMAIL)
                .build();
            record = notificationRepository.save(record);
            created.add(toResponse(record));
            try {
                emailGateway.send(client.getEmail(), subject, message);
                record.setStatus(NotificationStatus.SENT);
                record.setSentAt(Instant.now());
                notificationRepository.save(record);
                sent++;
            } catch (Exception ex) {
                record.setStatus(NotificationStatus.FAILED);
                record.setFailureReason(ex.getMessage());
                notificationRepository.save(record);
                failed++;
            }
        }

        return new NotificationDtos.ReminderRunResponse(created.size(), sent, failed, created);
    }

    @Transactional
    public NotificationDtos.BatchSendResponse sendCourseNotification(Long courseId, AuthenticatedUser currentUser, NotificationDtos.NotificationComposeRequest request) {
        var course = courseService.requireEntity(courseId);
        List<Enrollment> targets = enrollmentService.allEnrollments().stream()
            .filter(enrollment -> courseId.equals(enrollment.getCourseId()))
            .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.CANCELLED)
            .filter(enrollment -> canSendCourseBroadcast(currentUser, enrollment))
            .collect(Collectors.toList());
        return sendBatch(targets, NotificationType.COURSE_ASSIGNMENT, enrollment -> {
            return new MessageParts(request.subject(), request.message());
        });
    }

    @Transactional
    public NotificationDtos.BatchSendResponse sendEnrollmentNotification(Long enrollmentId, AuthenticatedUser currentUser, NotificationDtos.NotificationComposeRequest request) {
        Enrollment enrollment = enrollmentService.requireEntity(enrollmentId);
        if (!canSendEnrollmentNotification(currentUser, enrollment)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        return sendBatch(List.of(enrollment), NotificationType.SYSTEM_ALERT, item -> {
            return new MessageParts(request.subject(), request.message());
        });
    }

    public NotificationDtos.NotificationResponse toResponse(NotificationRecord notification) {
        var enrollment = enrollmentService.allEnrollments().stream()
            .filter(item -> item.getId().equals(notification.getEnrollmentId()))
            .findFirst()
            .orElse(null);
        var client = notification.getClientId() == null ? null : userService.requireEntity(notification.getClientId());
        var course = enrollment == null ? null : courseService.requireEntity(enrollment.getCourseId());
        return new NotificationDtos.NotificationResponse(
            notification.getId(),
            notification.getEnrollmentId(),
            client == null ? null : userService.toSummary(client),
            course == null ? null : courseService.toSimple(course),
            notification.getRecipientEmail(),
            notification.getType(),
            notification.getSubject(),
            notification.getMessage(),
            notification.getDueAt() == null ? null : notification.getDueAt().toString(),
            notification.getCreatedAt() == null ? null : notification.getCreatedAt().toString(),
            notification.getSentAt() == null ? null : notification.getSentAt().toString(),
            notification.getStatus(),
            notification.getDeliveryChannel(),
            notification.getFailureReason()
        );
    }

    private boolean alreadyHasReminder(Long enrollmentId, LocalDate dueAt) {
        return streamNotifications()
            .anyMatch(notification ->
                notification.getEnrollmentId() != null
                    && notification.getEnrollmentId().equals(enrollmentId)
                    && dueAt.equals(notification.getDueAt())
                    && notification.getType() == NotificationType.REPEAT_REMINDER
            );
    }

    private NotificationDtos.BatchSendResponse sendBatch(List<Enrollment> enrollments, NotificationType type, java.util.function.Function<Enrollment, MessageParts> messageFactory) {
        List<NotificationDtos.NotificationResponse> created = new ArrayList<>();
        int sent = 0;
        int failed = 0;

        for (Enrollment enrollment : enrollments) {
            var client = userService.requireEntity(enrollment.getClientId());
            MessageParts parts = messageFactory.apply(enrollment);
            NotificationRecord record = NotificationRecord.builder()
                .enrollmentId(enrollment.getId())
                .clientId(client.getId())
                .recipientEmail(client.getEmail())
                .type(type)
                .subject(parts.subject())
                .message(parts.message())
                .dueAt(enrollment.getNextDueAt() == null ? LocalDate.now() : enrollment.getNextDueAt())
                .createdAt(Instant.now())
                .status(NotificationStatus.PENDING)
                .deliveryChannel(DeliveryChannel.EMAIL)
                .build();
            record = notificationRepository.save(record);
            created.add(toResponse(record));
            try {
                emailGateway.send(client.getEmail(), parts.subject(), parts.message());
                record.setStatus(NotificationStatus.SENT);
                record.setSentAt(Instant.now());
                notificationRepository.save(record);
                sent++;
            } catch (Exception ex) {
                record.setStatus(NotificationStatus.FAILED);
                record.setFailureReason(ex.getMessage());
                notificationRepository.save(record);
                failed++;
            }
        }

        return new NotificationDtos.BatchSendResponse(created.size(), sent, failed, created);
    }

    private boolean canSendCourseBroadcast(AuthenticatedUser currentUser, Enrollment enrollment) {
        if (currentUser == null) {
            return false;
        }
        if (currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST) {
            return true;
        }
        return currentUser.role() == Role.TEACHER
            && enrollment.getTeacherId() != null
            && enrollment.getTeacherId().equals(currentUser.id());
    }

    private boolean canSendEnrollmentNotification(AuthenticatedUser currentUser, Enrollment enrollment) {
        if (currentUser == null) {
            return false;
        }
        if (currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST) {
            return true;
        }
        return currentUser.role() == Role.TEACHER
            && enrollment.getTeacherId() != null
            && enrollment.getTeacherId().equals(currentUser.id());
    }

    private boolean isVisibleTo(AuthenticatedUser currentUser, NotificationRecord notification) {
        if (currentUser == null || currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST) {
            return true;
        }
        if (currentUser.role() == Role.TEACHER) {
            var enrollment = enrollmentService.allEnrollments().stream()
                .filter(item -> item.getId().equals(notification.getEnrollmentId()))
                .findFirst()
                .orElse(null);
            return enrollment != null && enrollment.getTeacherId() != null && enrollment.getTeacherId().equals(currentUser.id());
        }
        return notification.getClientId() != null && notification.getClientId().equals(currentUser.id());
    }

    private String buildMessage(String firstName, String courseTitle, LocalDate dueAt) {
        return "Здравствуйте, " + firstName + ". Напоминаем, что для курса \"" + courseTitle
            + "\" требуется повторное обучение до " + dueAt.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
            + ". Пожалуйста, свяжитесь с учебным центром для записи на ближайшую группу.";
    }

    private record MessageParts(String subject, String message) {
    }

    private java.util.stream.Stream<NotificationRecord> streamNotifications() {
        return StreamSupport.stream(notificationRepository.findAll().spliterator(), false);
    }
}
