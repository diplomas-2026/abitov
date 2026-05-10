package com.github.danbel.abitovapi.dto;

import com.github.danbel.abitovapi.domain.EnrollmentStatus;
import jakarta.validation.constraints.NotNull;

public final class EnrollmentDtos {

    private EnrollmentDtos() {
    }

    public record EnrollmentRequest(
        @NotNull Long clientId,
        @NotNull Long courseId,
        Long teacherId,
        String groupName,
        String notes
    ) {
    }

    public record EnrollmentCompletionRequest(
        String notes
    ) {
    }

    public record EnrollmentGroupRequest(
        String groupName
    ) {
    }

    public record EnrollmentResponse(
        Long id,
        AuthDtos.UserSummary client,
        AuthDtos.UserSummary teacher,
        CourseDtos.SimpleCourse course,
        String enrolledAt,
        String completedAt,
        String nextDueAt,
        EnrollmentStatus status,
        String groupName,
        String notes
    ) {
    }
}
