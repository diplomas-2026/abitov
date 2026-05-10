package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.Lesson;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.LessonDtos;
import com.github.danbel.abitovapi.repository.LessonRepository;
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
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ProgramService programService;
    private final TrainingTestRepository testRepository;

    public LessonService(LessonRepository lessonRepository, ProgramService programService, TrainingTestRepository testRepository) {
        this.lessonRepository = lessonRepository;
        this.programService = programService;
        this.testRepository = testRepository;
    }

    public List<LessonDtos.LessonResponse> listLessons(AuthenticatedUser currentUser) {
        return streamLessons()
            .filter(lesson -> isVisible(currentUser, lesson))
            .sorted(Comparator
                .comparing(Lesson::getProgramId, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Lesson::getPosition)
                .thenComparing(Lesson::getId, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public LessonDtos.LessonResponse getLesson(Long id, AuthenticatedUser currentUser) {
        Lesson lesson = requireEntity(id);
        if (!isVisible(currentUser, lesson)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return toResponse(lesson);
    }

    @Transactional
    public LessonDtos.LessonResponse create(LessonDtos.LessonRequest request) {
        programService.requireEntity(request.programId());
        Lesson lesson = Lesson.builder()
            .programId(request.programId())
            .title(request.title())
            .body(request.body())
            .position(request.position())
            .active(request.active())
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        return toResponse(lessonRepository.save(lesson));
    }

    @Transactional
    public LessonDtos.LessonResponse update(Long id, LessonDtos.LessonRequest request) {
        Lesson existing = requireEntity(id);
        programService.requireEntity(request.programId());
        existing.setProgramId(request.programId());
        existing.setTitle(request.title());
        existing.setBody(request.body());
        existing.setPosition(request.position());
        existing.setActive(request.active());
        existing.setUpdatedAt(Instant.now());
        return toResponse(lessonRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        if (!testRepository.findByLessonIdOrderByIdAsc(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Нельзя удалить лекцию, к ней уже привязан тест");
        }
        lessonRepository.deleteById(id);
    }

    public Lesson requireEntity(Long id) {
        return lessonRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found"));
    }

    public LessonDtos.LessonResponse toResponse(Lesson lesson) {
        return new LessonDtos.LessonResponse(
            lesson.getId(),
            programService.toSummary(programService.requireEntity(lesson.getProgramId())),
            lesson.getTitle(),
            lesson.getBody(),
            lesson.getPosition(),
            lesson.isActive(),
            testRepository.findByLessonIdOrderByIdAsc(lesson.getId()).size()
        );
    }

    private boolean isVisible(AuthenticatedUser currentUser, Lesson lesson) {
        if (currentUser == null) {
            return lesson.isActive();
        }
        return currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST || lesson.isActive();
    }

    private java.util.stream.Stream<Lesson> streamLessons() {
        return StreamSupport.stream(lessonRepository.findAll().spliterator(), false);
    }
}
