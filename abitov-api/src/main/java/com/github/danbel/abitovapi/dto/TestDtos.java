package com.github.danbel.abitovapi.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public final class TestDtos {

    private TestDtos() {
    }

    public record OptionRequest(
        @NotBlank String text,
        boolean correct,
        int position
    ) {
    }

    public record QuestionRequest(
        @NotBlank String questionText,
        int position,
        List<OptionRequest> options
    ) {
    }

    public record TestRequest(
        @NotNull Long programId,
        @NotNull Long lessonId,
        @NotBlank String title,
        @Min(1) int passScore,
        @Min(1) int maxAttempts,
        boolean active,
        List<QuestionRequest> questions
    ) {
    }

    public record TestResponse(
        Long id,
        ProgramDtos.ProgramSummary program,
        LessonDtos.LessonSummary lesson,
        String title,
        int passScore,
        int maxAttempts,
        boolean active,
        int questionCount,
        int attemptCount,
        int bestScore,
        Boolean bestPassed
    ) {
    }

    public record OptionResponse(
        Long id,
        String text,
        boolean correct,
        int position
    ) {
    }

    public record QuestionResponse(
        Long id,
        String questionText,
        int position,
        List<OptionResponse> options
    ) {
    }

    public record TestDetailResponse(
        TestResponse test,
        List<QuestionResponse> questions,
        List<TestAttemptResponse> attempts
    ) {
    }

    public record TestAnswerRequest(
        @NotNull Long questionId,
        @NotNull Long optionId
    ) {
    }

    public record TestAttemptSubmitRequest(
        List<TestAnswerRequest> answers
    ) {
    }

    public record TestAttemptResponse(
        Long id,
        Long testId,
        AuthDtos.UserSummary client,
        int attemptNo,
        int score,
        boolean passed,
        int maxScore,
        String takenAt,
        String answersJson
    ) {
    }
}
