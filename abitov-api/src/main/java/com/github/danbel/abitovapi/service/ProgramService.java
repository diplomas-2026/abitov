package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.Program;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.domain.Lesson;
import com.github.danbel.abitovapi.domain.TrainingTest;
import com.github.danbel.abitovapi.dto.LessonDtos;
import com.github.danbel.abitovapi.dto.ProgramDtos;
import com.github.danbel.abitovapi.dto.TestDtos;
import com.github.danbel.abitovapi.repository.LessonRepository;
import com.github.danbel.abitovapi.repository.TestAttemptRepository;
import com.github.danbel.abitovapi.repository.ProgramRepository;
import com.github.danbel.abitovapi.repository.TestQuestionRepository;
import com.github.danbel.abitovapi.repository.TrainingTestRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProgramService {

    private final ProgramRepository programRepository;
    private final CourseService courseService;
    private final LessonRepository lessonRepository;
    private final TrainingTestRepository testRepository;
    private final TestQuestionRepository questionRepository;
    private final TestAttemptRepository attemptRepository;

    public ProgramService(
        ProgramRepository programRepository,
        CourseService courseService,
        LessonRepository lessonRepository,
        TrainingTestRepository testRepository,
        TestQuestionRepository questionRepository,
        TestAttemptRepository attemptRepository
    ) {
        this.programRepository = programRepository;
        this.courseService = courseService;
        this.lessonRepository = lessonRepository;
        this.testRepository = testRepository;
        this.questionRepository = questionRepository;
        this.attemptRepository = attemptRepository;
    }

    public List<ProgramDtos.ProgramResponse> listPrograms(AuthenticatedUser currentUser) {
        return streamPrograms()
            .filter(program -> isVisible(currentUser, program))
            .sorted(Comparator
                .comparing(Program::getCourseId, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Program::getPosition)
                .thenComparing(Program::getId, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public ProgramDtos.ProgramResponse getProgram(Long id, AuthenticatedUser currentUser) {
        Program program = requireEntity(id);
        if (!isVisible(currentUser, program)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return toResponse(program);
    }

    public ProgramDtos.ProgramDetailResponse getProgramDetail(Long id, AuthenticatedUser currentUser) {
        Program program = requireEntity(id);
        if (!isVisible(currentUser, program)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        var lessons = lessonRepository.findByProgramIdOrderByPositionAscIdAsc(id).stream()
            .filter(lesson -> isVisible(currentUser, lesson))
            .map(this::toLessonResponse)
            .collect(Collectors.toList());
        var tests = testRepository.findByProgramIdOrderByIdAsc(id).stream()
            .filter(test -> isVisible(currentUser, test))
            .map(this::toTestResponse)
            .collect(Collectors.toList());
        return new ProgramDtos.ProgramDetailResponse(toResponse(program), lessons, tests);
    }

    @Transactional
    public ProgramDtos.ProgramResponse create(ProgramDtos.ProgramRequest request) {
        courseService.requireEntity(request.courseId());
        Program program = Program.builder()
            .courseId(request.courseId())
            .title(request.title())
            .description(request.description())
            .position(request.position())
            .active(request.active())
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        return toResponse(programRepository.save(program));
    }

    @Transactional
    public ProgramDtos.ProgramResponse update(Long id, ProgramDtos.ProgramRequest request) {
        Program existing = requireEntity(id);
        courseService.requireEntity(request.courseId());
        existing.setCourseId(request.courseId());
        existing.setTitle(request.title());
        existing.setDescription(request.description());
        existing.setPosition(request.position());
        existing.setActive(request.active());
        existing.setUpdatedAt(Instant.now());
        return toResponse(programRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        if (lessonRepository.findByProgramIdOrderByPositionAscIdAsc(id).size() > 0 || testRepository.findByProgramIdOrderByIdAsc(id).size() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Нельзя удалить программу, к ней уже привязаны лекции или тесты");
        }
        programRepository.deleteById(id);
    }

    public Program requireEntity(Long id) {
        return programRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Program not found"));
    }

    public ProgramDtos.ProgramResponse toResponse(Program program) {
        int lessonCount = 0;
        int testCount = 0;
        for (Lesson lesson : lessonRepository.findByProgramIdOrderByPositionAscIdAsc(program.getId())) {
            lessonCount++;
        }
        for (TrainingTest test : testRepository.findByProgramIdOrderByIdAsc(program.getId())) {
            testCount++;
        }
        return new ProgramDtos.ProgramResponse(
            program.getId(),
            courseService.toSimple(courseService.requireEntity(program.getCourseId())),
            program.getTitle(),
            program.getDescription(),
            program.getPosition(),
            program.isActive(),
            lessonCount,
            testCount
        );
    }

    public ProgramDtos.ProgramSummary toSummary(Program program) {
        return new ProgramDtos.ProgramSummary(program.getId(), program.getTitle(), program.getPosition());
    }

    private LessonDtos.LessonResponse toLessonResponse(Lesson lesson) {
        return new LessonDtos.LessonResponse(
            lesson.getId(),
            toSummary(requireEntity(lesson.getProgramId())),
            lesson.getTitle(),
            lesson.getBody(),
            lesson.getPosition(),
            lesson.isActive(),
            testRepository.findByLessonIdOrderByIdAsc(lesson.getId()).size()
        );
    }

    private TestDtos.TestResponse toTestResponse(TrainingTest test) {
        var lesson = lessonRepository.findById(test.getLessonId()).orElse(null);
        Program program = lesson == null ? null : requireEntity(lesson.getProgramId());
        int questionCount = questionRepository.findByTestIdOrderByPositionAscIdAsc(test.getId()).size();
        var attempts = attemptRepository.findByTestIdOrderByTakenAtDesc(test.getId());
        int bestScore = attempts.stream().mapToInt(item -> item.getScore()).max().orElse(0);
        Boolean bestPassed = attempts.isEmpty() ? null : attempts.stream().anyMatch(item -> item.isPassed());
        return new TestDtos.TestResponse(
            test.getId(),
            program == null ? null : toSummary(program),
            lesson == null ? null : new LessonDtos.LessonSummary(lesson.getId(), lesson.getTitle(), lesson.getPosition()),
            test.getTitle(),
            test.getPassScore(),
            test.getMaxAttempts(),
            test.isActive(),
            questionCount,
            attempts.size(),
            bestScore,
            bestPassed
        );
    }

    private boolean isVisible(AuthenticatedUser currentUser, Program program) {
        if (currentUser == null) {
            return program.isActive();
        }
        return currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST || program.isActive();
    }

    private boolean isVisible(AuthenticatedUser currentUser, Lesson lesson) {
        if (currentUser == null) {
            return lesson.isActive();
        }
        return currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST || lesson.isActive();
    }

    private boolean isVisible(AuthenticatedUser currentUser, TrainingTest test) {
        if (currentUser == null) {
            return test.isActive();
        }
        return currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST || test.isActive();
    }

    private java.util.stream.Stream<Program> streamPrograms() {
        return StreamSupport.stream(programRepository.findAll().spliterator(), false);
    }
}
