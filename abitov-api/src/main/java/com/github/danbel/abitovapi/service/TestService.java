package com.github.danbel.abitovapi.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.domain.TestAttempt;
import com.github.danbel.abitovapi.domain.TestOption;
import com.github.danbel.abitovapi.domain.TestQuestion;
import com.github.danbel.abitovapi.domain.TrainingTest;
import com.github.danbel.abitovapi.dto.LessonDtos;
import com.github.danbel.abitovapi.dto.TestDtos;
import com.github.danbel.abitovapi.repository.TestAttemptRepository;
import com.github.danbel.abitovapi.repository.TestOptionRepository;
import com.github.danbel.abitovapi.repository.TestQuestionRepository;
import com.github.danbel.abitovapi.repository.TrainingTestRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class TestService {

    private final TrainingTestRepository testRepository;
    private final TestQuestionRepository questionRepository;
    private final TestOptionRepository optionRepository;
    private final TestAttemptRepository attemptRepository;
    private final ProgramService programService;
    private final LessonService lessonService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public TestService(
        TrainingTestRepository testRepository,
        TestQuestionRepository questionRepository,
        TestOptionRepository optionRepository,
        TestAttemptRepository attemptRepository,
        ProgramService programService,
        LessonService lessonService,
        UserService userService,
        ObjectMapper objectMapper
    ) {
        this.testRepository = testRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.attemptRepository = attemptRepository;
        this.programService = programService;
        this.lessonService = lessonService;
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    public List<TestDtos.TestResponse> listTests(AuthenticatedUser currentUser) {
        return streamTests()
            .filter(test -> isVisible(currentUser, test))
            .sorted(Comparator
                .comparing(TrainingTest::getProgramId, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(TrainingTest::getId, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<TestDtos.TestAttemptResponse> listAttempts(AuthenticatedUser currentUser) {
        return StreamSupport.stream(attemptRepository.findAll().spliterator(), false)
            .filter(attempt -> canSeeAttempt(currentUser, attempt))
            .sorted(Comparator.comparing(TestAttempt::getTakenAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .map(attempt -> toAttemptResponse(attempt, questionRepository.findByTestIdOrderByPositionAscIdAsc(attempt.getTestId()).size()))
            .collect(Collectors.toList());
    }

    public TestDtos.TestDetailResponse getTest(Long id, AuthenticatedUser currentUser) {
        TrainingTest test = requireEntity(id);
        if (!isVisible(currentUser, test)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return new TestDtos.TestDetailResponse(
            toResponse(test),
            questionsFor(test.getId()),
            listAttemptsForTest(test.getId(), currentUser)
        );
    }

    @Transactional
    public TestDtos.TestResponse create(TestDtos.TestRequest request) {
        validateTestRequest(request);
        TrainingTest test = saveTest(null, request);
        saveQuestions(test.getId(), request.questions());
        return toResponse(test);
    }

    @Transactional
    public TestDtos.TestResponse update(Long id, TestDtos.TestRequest request) {
        validateTestRequest(request);
        TrainingTest existing = requireEntity(id);
        if (!Objects.equals(existing.getLessonId(), request.lessonId())) {
            clearQuestions(existing.getId());
        } else {
            clearQuestions(existing.getId());
        }
        TrainingTest saved = saveTest(existing, request);
        saveQuestions(saved.getId(), request.questions());
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        if (!attemptRepository.findByTestIdOrderByTakenAtDesc(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Нельзя удалить тест, у него уже есть попытки");
        }
        clearQuestions(id);
        testRepository.deleteById(id);
    }

    @Transactional
    public TestDtos.TestAttemptResponse submitAttempt(Long testId, AuthenticatedUser currentUser, TestDtos.TestAttemptSubmitRequest request) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        TrainingTest test = requireEntity(testId);
        if (!isVisible(currentUser, test) && currentUser.role() != Role.CLIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (currentUser.role() == Role.CLIENT && !test.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Тест недоступен");
        }
        List<TestAttempt> attempts = attemptRepository.findByTestIdOrderByTakenAtDesc(testId).stream()
            .filter(attempt -> attempt.getClientId() != null && attempt.getClientId().equals(currentUser.id()))
            .collect(Collectors.toList());
        if (attempts.size() >= test.getMaxAttempts()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Лимит попыток исчерпан");
        }

        Map<Long, Long> answers = (request == null || request.answers() == null ? List.<TestDtos.TestAnswerRequest>of() : request.answers()).stream()
            .collect(Collectors.toMap(TestDtos.TestAnswerRequest::questionId, TestDtos.TestAnswerRequest::optionId, (left, right) -> right));
        List<TestQuestion> questions = questionRepository.findByTestIdOrderByPositionAscIdAsc(testId);
        int score = 0;
        for (TestQuestion question : questions) {
            Long selectedOptionId = answers.get(question.getId());
            if (selectedOptionId == null) {
                continue;
            }
            TestOption option = optionRepository.findById(selectedOptionId).orElse(null);
            if (option != null && Objects.equals(option.getQuestionId(), question.getId()) && option.isCorrect()) {
                score++;
            }
        }

        TestAttempt attempt = TestAttempt.builder()
            .testId(testId)
            .clientId(currentUser.id())
            .attemptNo(attempts.size() + 1)
            .score(score)
            .passed(score >= test.getPassScore())
            .takenAt(Instant.now())
            .answersJson(writeAnswers(request))
            .build();
        attempt = attemptRepository.save(attempt);
        return toAttemptResponse(attempt, questions.size());
    }

    public List<TestDtos.TestAttemptResponse> listAttemptsForTest(Long testId, AuthenticatedUser currentUser) {
        return attemptRepository.findByTestIdOrderByTakenAtDesc(testId).stream()
            .filter(attempt -> canSeeAttempt(currentUser, attempt))
            .map(attempt -> toAttemptResponse(attempt, questionRepository.findByTestIdOrderByPositionAscIdAsc(testId).size()))
            .collect(Collectors.toList());
    }

    public TestDtos.TestResponse toResponse(TrainingTest test) {
        List<TestAttempt> attempts = attemptRepository.findByTestIdOrderByTakenAtDesc(test.getId());
        int questionCount = questionRepository.findByTestIdOrderByPositionAscIdAsc(test.getId()).size();
        int bestScore = attempts.stream().mapToInt(TestAttempt::getScore).max().orElse(0);
        Boolean bestPassed = attempts.isEmpty() ? null : attempts.stream().anyMatch(TestAttempt::isPassed);
        return new TestDtos.TestResponse(
            test.getId(),
            programService.toSummary(programService.requireEntity(test.getProgramId())),
            lessonSummary(test.getLessonId()),
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

    public TrainingTest requireEntity(Long id) {
        return testRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test not found"));
    }

    private TrainingTest saveTest(TrainingTest existing, TestDtos.TestRequest request) {
        programService.requireEntity(request.programId());
        lessonService.requireEntity(request.lessonId());
        if (existing != null) {
            existing.setProgramId(request.programId());
            existing.setLessonId(request.lessonId());
            existing.setTitle(request.title());
            existing.setPassScore(request.passScore());
            existing.setMaxAttempts(request.maxAttempts());
            existing.setActive(request.active());
            existing.setUpdatedAt(Instant.now());
            return testRepository.save(existing);
        }
        TrainingTest test = TrainingTest.builder()
            .programId(request.programId())
            .lessonId(request.lessonId())
            .title(request.title())
            .passScore(request.passScore())
            .maxAttempts(request.maxAttempts())
            .active(request.active())
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        return testRepository.save(test);
    }

    private void saveQuestions(Long testId, List<TestDtos.QuestionRequest> questions) {
        List<TestDtos.QuestionRequest> safeQuestions = questions == null ? List.of() : questions;
        int questionPosition = 1;
        for (TestDtos.QuestionRequest questionRequest : safeQuestions) {
            TestQuestion question = questionRepository.save(TestQuestion.builder()
                .testId(testId)
                .questionText(questionRequest.questionText())
                .position(questionRequest.position() > 0 ? questionRequest.position() : questionPosition++)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
            int optionPosition = 1;
            for (TestDtos.OptionRequest optionRequest : questionRequest.options() == null ? List.<TestDtos.OptionRequest>of() : questionRequest.options()) {
                optionRepository.save(TestOption.builder()
                    .questionId(question.getId())
                    .optionText(optionRequest.text())
                    .correct(optionRequest.correct())
                    .position(optionRequest.position() > 0 ? optionRequest.position() : optionPosition++)
                    .build());
            }
        }
    }

    private void clearQuestions(Long testId) {
        for (TestQuestion question : questionRepository.findByTestIdOrderByPositionAscIdAsc(testId)) {
            for (TestOption option : optionRepository.findByQuestionIdOrderByPositionAscIdAsc(question.getId())) {
                optionRepository.deleteById(option.getId());
            }
            questionRepository.deleteById(question.getId());
        }
    }

    private List<TestDtos.QuestionResponse> questionsFor(Long testId) {
        return questionRepository.findByTestIdOrderByPositionAscIdAsc(testId).stream()
            .map(question -> new TestDtos.QuestionResponse(
                question.getId(),
                question.getQuestionText(),
                question.getPosition(),
                optionRepository.findByQuestionIdOrderByPositionAscIdAsc(question.getId()).stream()
                    .map(option -> new TestDtos.OptionResponse(option.getId(), option.getOptionText(), option.isCorrect(), option.getPosition()))
                    .collect(Collectors.toList())
            ))
            .collect(Collectors.toList());
    }

    private TestDtos.TestAttemptResponse toAttemptResponse(TestAttempt attempt, int maxScore) {
        return new TestDtos.TestAttemptResponse(
            attempt.getId(),
            attempt.getTestId(),
            userService.toSummary(userService.requireEntity(attempt.getClientId())),
            attempt.getAttemptNo(),
            attempt.getScore(),
            attempt.isPassed(),
            maxScore,
            attempt.getTakenAt() == null ? null : attempt.getTakenAt().toString(),
            attempt.getAnswersJson()
        );
    }

    private LessonDtos.LessonSummary lessonSummary(Long lessonId) {
        return lessonService.requireEntity(lessonId) == null
            ? null
            : new LessonDtos.LessonSummary(
                lessonService.requireEntity(lessonId).getId(),
                lessonService.requireEntity(lessonId).getTitle(),
                lessonService.requireEntity(lessonId).getPosition()
            );
    }

    private String writeAnswers(TestDtos.TestAttemptSubmitRequest request) {
        return objectMapper.writeValueAsString(request == null || request.answers() == null ? List.of() : request.answers());
    }

    private boolean canSeeAttempt(AuthenticatedUser currentUser, TestAttempt attempt) {
        if (currentUser == null) {
            return false;
        }
        if (currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST || currentUser.role() == Role.TEACHER) {
            return true;
        }
        return Objects.equals(attempt.getClientId(), currentUser.id());
    }

    private boolean isVisible(AuthenticatedUser currentUser, TrainingTest test) {
        if (currentUser == null) {
            return test.isActive();
        }
        return currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST || test.isActive();
    }

    private void validateTestRequest(TestDtos.TestRequest request) {
        if (request.questions() == null || request.questions().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "У теста должен быть хотя бы один вопрос");
        }
        for (TestDtos.QuestionRequest question : request.questions()) {
            if (question.options() == null || question.options().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "У каждого вопроса должен быть хотя бы один вариант ответа");
            }
            boolean hasCorrectAnswer = question.options().stream().anyMatch(TestDtos.OptionRequest::correct);
            if (!hasCorrectAnswer) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "У каждого вопроса должен быть хотя бы один правильный ответ");
            }
        }
    }

    private java.util.stream.Stream<TrainingTest> streamTests() {
        return StreamSupport.stream(testRepository.findAll().spliterator(), false);
    }
}
