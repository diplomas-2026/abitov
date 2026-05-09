package com.github.danbel.abitovapi.domain;

import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("notifications")
public class NotificationRecord {

    @Id
    private Long id;

    @Column("enrollment_id")
    private Long enrollmentId;

    @Column("client_id")
    private Long clientId;

    @Column("recipient_email")
    private String recipientEmail;

    @Column("notification_type")
    private NotificationType type;

    @Column("subject")
    private String subject;

    @Column("message")
    private String message;

    @Column("due_at")
    private LocalDate dueAt;

    @Column("created_at")
    private Instant createdAt;

    @Column("sent_at")
    private Instant sentAt;

    @Column("status")
    private NotificationStatus status;

    @Column("delivery_channel")
    private DeliveryChannel deliveryChannel;

    @Column("failure_reason")
    private String failureReason;
}
