package com.github.danbel.abitovapi.dto;

import com.github.danbel.abitovapi.domain.DeliveryChannel;
import com.github.danbel.abitovapi.domain.NotificationStatus;
import com.github.danbel.abitovapi.domain.NotificationType;
import java.util.List;

public final class NotificationDtos {

    private NotificationDtos() {
    }

    public record NotificationResponse(
        Long id,
        Long enrollmentId,
        AuthDtos.UserSummary client,
        CourseDtos.SimpleCourse course,
        String recipientEmail,
        NotificationType type,
        String subject,
        String message,
        String dueAt,
        String createdAt,
        String sentAt,
        NotificationStatus status,
        DeliveryChannel deliveryChannel,
        String failureReason
    ) {
    }

    public record ReminderRunResponse(
        int generated,
        int sent,
        int failed,
        List<NotificationResponse> notifications
    ) {
    }

    public record BatchSendResponse(
        int generated,
        int sent,
        int failed,
        List<NotificationResponse> notifications
    ) {
    }

    public record NotificationComposeRequest(
        @jakarta.validation.constraints.NotBlank String subject,
        @jakarta.validation.constraints.NotBlank String message
    ) {
    }
}
