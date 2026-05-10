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
@Table("enrollments")
public class Enrollment {

    @Id
    private Long id;

    @Column("client_id")
    private Long clientId;

    @Column("course_id")
    private Long courseId;

    @Column("teacher_id")
    private Long teacherId;

    @Column("enrolled_at")
    private LocalDate enrolledAt;

    @Column("completed_at")
    private LocalDate completedAt;

    @Column("next_due_at")
    private LocalDate nextDueAt;

    @Column("status")
    private EnrollmentStatus status;

    @Column("notes")
    private String notes;

    @Column("group_name")
    private String groupName;

    @Column("created_at")
    private Instant createdAt;

    @Column("updated_at")
    private Instant updatedAt;
}
