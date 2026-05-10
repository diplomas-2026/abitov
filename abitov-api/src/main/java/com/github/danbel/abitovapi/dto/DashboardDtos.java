package com.github.danbel.abitovapi.dto;

import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record DashboardResponse(
        Summary summary,
        List<CourseDtos.CourseResponse> courses,
        List<ProgramDtos.ProgramResponse> programs,
        List<LessonDtos.LessonResponse> lessons,
        List<TestDtos.TestResponse> tests,
        List<EnrollmentDtos.EnrollmentResponse> enrollments,
        List<TestDtos.TestAttemptResponse> attempts,
        List<NotificationDtos.NotificationResponse> notifications,
        List<AuthDtos.DemoCredential> demoCredentials
    ) {
    }

    public record Summary(
        long totalUsers,
        long totalClients,
        long totalTeachers,
        long totalCourses,
        long totalPrograms,
        long totalLessons,
        long totalTests,
        long totalAttempts,
        long activeEnrollments,
        long upcomingRepeats,
        long sentNotifications,
        long pendingNotifications
    ) {
    }
}
