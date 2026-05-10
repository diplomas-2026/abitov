package com.github.danbel.abitovapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class LessonDtos {

    private LessonDtos() {
    }

    public record LessonRequest(
        @NotNull Long programId,
        @NotBlank String title,
        String body,
        int position,
        boolean active
    ) {
    }

    public record LessonResponse(
        Long id,
        ProgramDtos.ProgramSummary program,
        String title,
        String body,
        int position,
        boolean active,
        int testCount
    ) {
    }

    public record LessonSummary(
        Long id,
        String title,
        int position
    ) {
    }
}
