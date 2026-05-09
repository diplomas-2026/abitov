package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.Course;
import com.github.danbel.abitovapi.domain.Enrollment;
import com.github.danbel.abitovapi.dto.CourseDtos;
import com.github.danbel.abitovapi.repository.CourseRepository;
import com.github.danbel.abitovapi.repository.EnrollmentRepository;
import java.time.Instant;
import java.util.List;
import java.util.Comparator;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    public CourseService(CourseRepository courseRepository, EnrollmentRepository enrollmentRepository) {
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    public List<CourseDtos.CourseResponse> listCourses() {
        return streamCourses()
            .sorted(Comparator.comparing(Course::getTitle, String.CASE_INSENSITIVE_ORDER))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public CourseDtos.CourseResponse getCourse(Long id) {
        return courseRepository.findById(id).map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Course not found"));
    }

    @Transactional
    public CourseDtos.CourseResponse create(CourseDtos.CourseRequest request) {
        Course course = Course.builder()
            .title(request.title())
            .description(request.description())
            .repeatMonths(request.repeatMonths())
            .trainingFormat(request.trainingFormat())
            .active(request.active())
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        return toResponse(courseRepository.save(course));
    }

    @Transactional
    public CourseDtos.CourseResponse update(Long id, CourseDtos.CourseRequest request) {
        Course existing = courseRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Course not found"));
        existing.setTitle(request.title());
        existing.setDescription(request.description());
        existing.setRepeatMonths(request.repeatMonths());
        existing.setTrainingFormat(request.trainingFormat());
        existing.setActive(request.active());
        existing.setUpdatedAt(Instant.now());
        return toResponse(courseRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        boolean linked = streamEnrollments().anyMatch(enrollment -> enrollment.getCourseId() != null && enrollment.getCourseId().equals(id));
        if (linked) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT,
                "Нельзя удалить курс, к нему уже привязаны записи на обучение"
            );
        }
        courseRepository.deleteById(id);
    }

    public Course requireEntity(Long id) {
        return courseRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Course not found"));
    }

    public CourseDtos.CourseResponse toResponse(Course course) {
        int enrollmentCount = 0;
        int activeEnrollmentCount = 0;
        for (var enrollment : enrollmentRepository.findAll()) {
            if (enrollment.getCourseId() != null && enrollment.getCourseId().equals(course.getId())) {
                enrollmentCount++;
                if (enrollment.getStatus() == com.github.danbel.abitovapi.domain.EnrollmentStatus.ACTIVE) {
                    activeEnrollmentCount++;
                }
            }
        }
        return new CourseDtos.CourseResponse(
            course.getId(),
            course.getTitle(),
            course.getDescription(),
            course.getRepeatMonths(),
            course.getTrainingFormat(),
            course.isActive(),
            enrollmentCount,
            activeEnrollmentCount
        );
    }

    public CourseDtos.SimpleCourse toSimple(Course course) {
        return new CourseDtos.SimpleCourse(course.getId(), course.getTitle());
    }

    private java.util.stream.Stream<Course> streamCourses() {
        return StreamSupport.stream(courseRepository.findAll().spliterator(), false);
    }

    private java.util.stream.Stream<Enrollment> streamEnrollments() {
        return StreamSupport.stream(enrollmentRepository.findAll().spliterator(), false);
    }
}
