package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.AppUser;
import com.github.danbel.abitovapi.domain.Course;
import com.github.danbel.abitovapi.domain.Enrollment;
import com.github.danbel.abitovapi.domain.EnrollmentStatus;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.EnrollmentDtos;
import com.github.danbel.abitovapi.repository.EnrollmentRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Comparator;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final UserService userService;
    private final CourseService courseService;

    public EnrollmentService(EnrollmentRepository enrollmentRepository, UserService userService, CourseService courseService) {
        this.enrollmentRepository = enrollmentRepository;
        this.userService = userService;
        this.courseService = courseService;
    }

    public List<EnrollmentDtos.EnrollmentResponse> listEnrollments() {
        return streamEnrollments()
            .sorted(Comparator.comparing(Enrollment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<EnrollmentDtos.EnrollmentResponse> listEnrollments(AuthenticatedUser currentUser) {
        return streamEnrollments()
            .filter(enrollment -> isVisibleTo(currentUser, enrollment))
            .sorted(Comparator.comparing(Enrollment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<Enrollment> allEnrollments() {
        return streamEnrollments().collect(Collectors.toList());
    }

    public EnrollmentDtos.EnrollmentResponse getEnrollment(Long id) {
        return enrollmentRepository.findById(id).map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Enrollment not found"));
    }

    public EnrollmentDtos.EnrollmentResponse getEnrollment(Long id, AuthenticatedUser currentUser) {
        Enrollment enrollment = enrollmentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Enrollment not found"));
        if (!isVisibleTo(currentUser, enrollment)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        return toResponse(enrollment);
    }

    @Transactional
    public EnrollmentDtos.EnrollmentResponse create(EnrollmentDtos.EnrollmentRequest request) {
        AppUser client = userService.requireEntity(request.clientId());
        Course course = courseService.requireEntity(request.courseId());
        AppUser teacher = request.teacherId() == null ? null : userService.requireEntity(request.teacherId());
        LocalDate now = LocalDate.now();
        Enrollment enrollment = Enrollment.builder()
            .clientId(client.getId())
            .courseId(course.getId())
            .teacherId(teacher == null ? null : teacher.getId())
            .enrolledAt(now)
            .status(EnrollmentStatus.ACTIVE)
            .notes(request.notes())
            .groupName(request.groupName())
            .nextDueAt(now.plusMonths(course.getRepeatMonths()))
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        return toResponse(enrollmentRepository.save(enrollment));
    }

    @Transactional
    public EnrollmentDtos.EnrollmentResponse complete(Long id, EnrollmentDtos.EnrollmentCompletionRequest request) {
        Enrollment enrollment = enrollmentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Enrollment not found"));
        Course course = courseService.requireEntity(enrollment.getCourseId());
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setCompletedAt(LocalDate.now());
        enrollment.setNextDueAt(LocalDate.now().plusMonths(course.getRepeatMonths()));
        enrollment.setNotes(mergeNotes(enrollment.getNotes(), request.notes()));
        enrollment.setUpdatedAt(Instant.now());
        return toResponse(enrollmentRepository.save(enrollment));
    }

    @Transactional
    public EnrollmentDtos.EnrollmentResponse updateTeacher(Long id, Long teacherId) {
        Enrollment enrollment = enrollmentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Enrollment not found"));
        enrollment.setTeacherId(teacherId);
        enrollment.setUpdatedAt(Instant.now());
        return toResponse(enrollmentRepository.save(enrollment));
    }

    @Transactional
    public EnrollmentDtos.EnrollmentResponse updateGroup(Long id, EnrollmentDtos.EnrollmentGroupRequest request) {
        Enrollment enrollment = enrollmentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Enrollment not found"));
        enrollment.setGroupName(request.groupName());
        enrollment.setUpdatedAt(Instant.now());
        return toResponse(enrollmentRepository.save(enrollment));
    }

    public List<EnrollmentDtos.EnrollmentResponse> upcoming(int days) {
        LocalDate today = LocalDate.now();
        LocalDate end = today.plusDays(days);
        return streamEnrollments()
            .filter(enrollment -> enrollment.getNextDueAt() != null)
            .filter(enrollment -> !enrollment.getNextDueAt().isBefore(today))
            .filter(enrollment -> !enrollment.getNextDueAt().isAfter(end))
            .sorted(Comparator.comparing(Enrollment::getNextDueAt))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<EnrollmentDtos.EnrollmentResponse> upcoming(int days, AuthenticatedUser currentUser) {
        LocalDate today = LocalDate.now();
        LocalDate end = today.plusDays(days);
        return streamEnrollments()
            .filter(enrollment -> isVisibleTo(currentUser, enrollment))
            .filter(enrollment -> enrollment.getNextDueAt() != null)
            .filter(enrollment -> !enrollment.getNextDueAt().isBefore(today))
            .filter(enrollment -> !enrollment.getNextDueAt().isAfter(end))
            .sorted(Comparator.comparing(Enrollment::getNextDueAt))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public EnrollmentDtos.EnrollmentResponse toResponse(Enrollment enrollment) {
        AppUser client = userService.requireEntity(enrollment.getClientId());
        Course course = courseService.requireEntity(enrollment.getCourseId());
        AppUser teacher = enrollment.getTeacherId() == null ? null : userService.requireEntity(enrollment.getTeacherId());
        return new EnrollmentDtos.EnrollmentResponse(
            enrollment.getId(),
            userService.toSummary(client),
            teacher == null ? null : userService.toSummary(teacher),
            courseService.toSimple(course),
            enrollment.getEnrolledAt() == null ? null : enrollment.getEnrolledAt().toString(),
            enrollment.getCompletedAt() == null ? null : enrollment.getCompletedAt().toString(),
            enrollment.getNextDueAt() == null ? null : enrollment.getNextDueAt().toString(),
            enrollment.getStatus(),
            enrollment.getGroupName(),
            enrollment.getNotes()
        );
    }

    private String mergeNotes(String existing, String extra) {
        if (extra == null || extra.isBlank()) {
            return existing;
        }
        if (existing == null || existing.isBlank()) {
            return extra;
        }
        return existing + "\n" + extra;
    }

    private boolean isVisibleTo(AuthenticatedUser currentUser, Enrollment enrollment) {
        if (currentUser == null || currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST) {
            return true;
        }
        if (currentUser.role() == Role.TEACHER) {
            return enrollment.getTeacherId() != null && enrollment.getTeacherId().equals(currentUser.id());
        }
        return enrollment.getClientId() != null && enrollment.getClientId().equals(currentUser.id());
    }

    private java.util.stream.Stream<Enrollment> streamEnrollments() {
        return StreamSupport.stream(enrollmentRepository.findAll().spliterator(), false);
    }
}
