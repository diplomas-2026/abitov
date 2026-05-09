package com.github.danbel.abitovapi.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class CourseDtos {

    private CourseDtos() {
    }

    public record CourseRequest(
        @NotBlank String title,
        String description,
        @Min(1) int repeatMonths,
        @NotBlank String trainingFormat,
        boolean active
    ) {
    }

    public record CourseResponse(
        Long id,
        String title,
        String description,
        int repeatMonths,
        String trainingFormat,
        boolean active,
        int enrollmentCount,
        int activeEnrollmentCount
    ) {
    }

    public record SimpleCourse(
        Long id,
        String title
    ) {
    }
}
