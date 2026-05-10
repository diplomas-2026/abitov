package com.github.danbel.abitovapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public final class ProgramDtos {

    private ProgramDtos() {
    }

    public record ProgramRequest(
        @NotNull Long courseId,
        @NotBlank String title,
        String description,
        int position,
        boolean active
    ) {
    }

    public record ProgramResponse(
        Long id,
        CourseDtos.SimpleCourse course,
        String title,
        String description,
        int position,
        boolean active,
        int lessonCount,
        int testCount
    ) {
    }

    public record ProgramSummary(
        Long id,
        String title,
        int position
    ) {
    }

    public record ProgramDetailResponse(
        ProgramResponse program,
        List<LessonDtos.LessonResponse> lessons,
        List<TestDtos.TestResponse> tests
    ) {
    }
}
