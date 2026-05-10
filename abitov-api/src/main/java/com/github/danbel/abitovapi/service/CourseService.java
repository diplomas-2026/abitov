package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.Course;
import com.github.danbel.abitovapi.domain.Enrollment;
import com.github.danbel.abitovapi.domain.Program;
import com.github.danbel.abitovapi.dto.CourseDtos;
import com.github.danbel.abitovapi.repository.CourseRepository;
import com.github.danbel.abitovapi.repository.EnrollmentRepository;
import com.github.danbel.abitovapi.repository.ProgramRepository;
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
    private final ProgramRepository programRepository;

    public CourseService(CourseRepository courseRepository, EnrollmentRepository enrollmentRepository, ProgramRepository programRepository) {
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.programRepository = programRepository;
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
        boolean linkedEnrollments = streamEnrollments().anyMatch(enrollment -> enrollment.getCourseId() != null && enrollment.getCourseId().equals(id));
        boolean linkedPrograms = streamPrograms().anyMatch(program -> program.getCourseId() != null && program.getCourseId().equals(id));
        if (linkedEnrollments || linkedPrograms) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT,
                "Нельзя удалить курс, к нему уже привязаны программы или записи на обучение"
            );
        }
        courseRepository.deleteById(id);
    }

    public Course requireEntity(Long id) {
        return courseRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Course not found"));
    }

    public CourseDtos.CourseResponse toResponse(Course course) {
        int programCount = 0;
        int activeProgramCount = 0;
        int enrollmentCount = 0;
        int activeEnrollmentCount = 0;
        for (var program : programRepository.findAll()) {
            if (program.getCourseId() != null && program.getCourseId().equals(course.getId())) {
                programCount++;
                if (program.isActive()) {
                    activeProgramCount++;
                }
            }
        }
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
            programCount,
            activeProgramCount,
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

    private java.util.stream.Stream<Program> streamPrograms() {
        return StreamSupport.stream(programRepository.findAll().spliterator(), false);
    }
}
