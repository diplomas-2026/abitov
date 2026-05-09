package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.EnrollmentStatus;
import com.github.danbel.abitovapi.domain.NotificationStatus;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.AuthDtos;
import com.github.danbel.abitovapi.dto.CourseDtos;
import com.github.danbel.abitovapi.dto.DashboardDtos;
import com.github.danbel.abitovapi.dto.EnrollmentDtos;
import com.github.danbel.abitovapi.dto.NotificationDtos;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final UserService userService;
    private final CourseService courseService;
    private final EnrollmentService enrollmentService;
    private final NotificationService notificationService;
    private final AuthService authService;

    public DashboardService(
        UserService userService,
        CourseService courseService,
        EnrollmentService enrollmentService,
        NotificationService notificationService,
        AuthService authService
    ) {
        this.userService = userService;
        this.courseService = courseService;
        this.enrollmentService = enrollmentService;
        this.notificationService = notificationService;
        this.authService = authService;
    }

    public DashboardDtos.DashboardResponse dashboard(AuthenticatedUser currentUser) {
        boolean admin = currentUser == null || currentUser.role() == Role.ADMIN;
        List<CourseDtos.CourseResponse> courses = courseService.listCourses();
        List<EnrollmentDtos.EnrollmentResponse> enrollments = enrollmentService.listEnrollments(currentUser);
        List<NotificationDtos.NotificationResponse> notifications = notificationService.listNotifications(currentUser);
        long totalUsers = admin ? userService.listUsers(null).size() : 1;
        long totalClients = admin ? userService.listUsers(Role.CLIENT).size() : enrollments.stream()
            .map(EnrollmentDtos.EnrollmentResponse::client)
            .filter(java.util.Objects::nonNull)
            .map(AuthDtos.UserSummary::id)
            .distinct()
            .count();
        long totalTeachers = admin ? userService.listUsers(Role.TEACHER).size() : enrollments.stream()
            .map(EnrollmentDtos.EnrollmentResponse::teacher)
            .filter(java.util.Objects::nonNull)
            .map(AuthDtos.UserSummary::id)
            .distinct()
            .count();
        long totalCourses = courses.size();
        long activeEnrollments = enrollments.stream().filter(item -> item.status() == EnrollmentStatus.ACTIVE).count();
        long upcomingRepeats = enrollments.stream()
            .filter(item -> item.nextDueAt() != null)
            .filter(item -> item.status() != EnrollmentStatus.CANCELLED)
            .filter(item -> {
                java.time.LocalDate due = java.time.LocalDate.parse(item.nextDueAt());
                return !due.isAfter(java.time.LocalDate.now().plusDays(30));
            })
            .count();
        long sentNotifications = notifications.stream().filter(item -> item.status() == NotificationStatus.SENT).count();
        long pendingNotifications = notifications.stream().filter(item -> item.status() == NotificationStatus.PENDING).count();
        return new DashboardDtos.DashboardResponse(
            new DashboardDtos.Summary(totalUsers, totalClients, totalTeachers, totalCourses, activeEnrollments, upcomingRepeats, sentNotifications, pendingNotifications),
            courses,
            enrollments,
            notifications,
            authService.demoCredentials()
        );
    }
}
