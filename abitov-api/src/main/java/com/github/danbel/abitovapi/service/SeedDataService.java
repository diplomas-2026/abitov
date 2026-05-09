package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.Course;
import com.github.danbel.abitovapi.domain.Enrollment;
import com.github.danbel.abitovapi.domain.EnrollmentStatus;
import com.github.danbel.abitovapi.domain.NotificationRecord;
import com.github.danbel.abitovapi.domain.NotificationStatus;
import com.github.danbel.abitovapi.domain.NotificationType;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.repository.AppUserRepository;
import com.github.danbel.abitovapi.repository.CourseRepository;
import com.github.danbel.abitovapi.repository.EnrollmentRepository;
import com.github.danbel.abitovapi.repository.NotificationRepository;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SeedDataService {

    @Bean
    CommandLineRunner seed(
        AppUserRepository userRepository,
        CourseRepository courseRepository,
        EnrollmentRepository enrollmentRepository,
        NotificationRepository notificationRepository,
        PasswordEncoder passwordEncoder
    ) {
        return args -> {
            if (userRepository.count() > 0) {
                return;
            }

            userRepository.save(user("Смирнов", "Андрей", "admin@abitov.local", "admin123", Role.ADMIN, passwordEncoder));
            var teacher = userRepository.save(user("Иванова", "Марина", "teacher@abitov.local", "teacher123", Role.TEACHER, passwordEncoder));
            var client1 = userRepository.save(user("Петров", "Илья", "client1@abitov.local", "client123", Role.CLIENT, passwordEncoder));
            var client2 = userRepository.save(user("Соколова", "Анна", "client2@abitov.local", "client123", Role.CLIENT, passwordEncoder));
            var client3 = userRepository.save(user("Козлов", "Денис", "client3@abitov.local", "client123", Role.CLIENT, passwordEncoder));

            var course1 = courseRepository.save(Course.builder()
                .title("Охрана труда")
                .description("Базовая программа по охране труда с последующим повторным обучением раз в год.")
                .repeatMonths(12)
                .trainingFormat("Очный курс")
                .active(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
            var course2 = courseRepository.save(Course.builder()
                .title("Пожарная безопасность")
                .description("Подготовка сотрудников с ежегодным подтверждением знаний.")
                .repeatMonths(12)
                .trainingFormat("Смешанный формат")
                .active(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
            var course3 = courseRepository.save(Course.builder()
                .title("Первая помощь")
                .description("Курс по оказанию первой помощи пострадавшим.")
                .repeatMonths(24)
                .trainingFormat("Практика + тестирование")
                .active(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

            var seededEnrollment = enrollmentRepository.save(Enrollment.builder()
                .clientId(client1.getId())
                .courseId(course1.getId())
                .teacherId(teacher.getId())
                .enrolledAt(LocalDate.now().minusMonths(12))
                .completedAt(LocalDate.now().minusMonths(11))
                .nextDueAt(LocalDate.now().plusDays(10))
                .status(EnrollmentStatus.COMPLETED)
                .notes("Повторный инструктаж требуется в ближайшие две недели.")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

            enrollmentRepository.save(Enrollment.builder()
                .clientId(client2.getId())
                .courseId(course2.getId())
                .teacherId(teacher.getId())
                .enrolledAt(LocalDate.now().minusMonths(15))
                .completedAt(LocalDate.now().minusMonths(14))
                .nextDueAt(LocalDate.now().minusDays(5))
                .status(EnrollmentStatus.COMPLETED)
                .notes("Просрочен срок повторного обучения.")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

            enrollmentRepository.save(Enrollment.builder()
                .clientId(client3.getId())
                .courseId(course3.getId())
                .teacherId(teacher.getId())
                .enrolledAt(LocalDate.now().minusMonths(2))
                .completedAt(null)
                .nextDueAt(LocalDate.now().plusMonths(22))
                .status(EnrollmentStatus.ACTIVE)
                .notes("Группа в работе.")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

            notificationRepository.save(NotificationRecord.builder()
                .enrollmentId(seededEnrollment.getId())
                .clientId(client1.getId())
                .recipientEmail(client1.getEmail())
                .type(NotificationType.REPEAT_REMINDER)
                .subject("Напоминание о повторном обучении: Охрана труда")
                .message("Здравствуйте, Илья. Напоминаем о необходимости повторного обучения.")
                .dueAt(LocalDate.now().plusDays(10))
                .createdAt(Instant.now())
                .sentAt(Instant.now())
                .status(NotificationStatus.SENT)
                .deliveryChannel(com.github.danbel.abitovapi.domain.DeliveryChannel.EMAIL)
                .build());
        };
    }

    private com.github.danbel.abitovapi.domain.AppUser user(
        String lastName,
        String firstName,
        String email,
        String password,
        Role role,
        PasswordEncoder passwordEncoder
    ) {
        return com.github.danbel.abitovapi.domain.AppUser.builder()
            .firstName(firstName)
            .lastName(lastName)
            .email(email)
            .passwordHash(passwordEncoder.encode(password))
            .role(role)
            .active(true)
            .createdAt(Instant.now())
            .build();
    }
}
