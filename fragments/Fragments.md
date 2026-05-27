### Рисунок 2.30 - Фрагмент кода авторизации пользователя

### [Скрин кода](./img_1.png)

```java
@PostMapping("/login")
public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
    AuthDtos.UserSummary user = authService.login(request.email(), request.password())
        .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    var session = authService.createSession(user);
    return new AuthDtos.LoginResponse(session.token(), user);
}
```

### Рисунок 2.31 - Фрагмент кода контроллера пользователей

### [Скрин кода](./img_2.png)

```java
@PutMapping("/{id}")
public UserDtos.UserResponse update(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody UserDtos.UserRequest body) {
    AuthenticatedUser currentUser = currentUser(request);
    if (currentUser != null && currentUser.role() == Role.ADMIN) {
        return userService.update(id, body);
    }
    if (currentUser != null && currentUser.role() == Role.TEACHER && currentUser.id().equals(id)) {
        return userService.updateProfile(id, new UserDtos.UserProfileRequest(
            body.firstName(),
            body.lastName(),
            body.email(),
            body.phone(),
            body.maxContact(),
            body.password()
        ));
    }
    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
}
```

### Рисунок 2.32 - Фрагмент кода контроллера курсов

### [Скрин кода](./img_3.png)

```java
@PostMapping
public CourseDtos.CourseResponse create(HttpServletRequest servletRequest, @Valid @RequestBody CourseDtos.CourseRequest request) {
    requireManager(servletRequest);
    return courseService.create(request);
}

@PutMapping("/{id}")
public CourseDtos.CourseResponse update(HttpServletRequest servletRequest, @PathVariable Long id, @Valid @RequestBody CourseDtos.CourseRequest request) {
    requireManager(servletRequest);
    return courseService.update(id, request);
}
```

### Рисунок 2.33 - Фрагмент кода сервиса записей на обучение

### [Скрин кода](./img_4.png)

```java
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
```

### Рисунок 2.34 - Фрагмент кода обработки результатов тестирования

### [Скрин кода](./img_5.png)

```java
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
```

### Рисунок 2.35 - Фрагмент кода отправки email-уведомлений

### [Скрин кода](./img_6.png)

```java
@Transactional
public NotificationDtos.BatchSendResponse sendCourseNotification(Long courseId, AuthenticatedUser currentUser, NotificationDtos.NotificationComposeRequest request) {
    var course = courseService.requireEntity(courseId);
    List<Enrollment> targets = enrollmentService.allEnrollments().stream()
        .filter(enrollment -> courseId.equals(enrollment.getCourseId()))
        .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.CANCELLED)
        .filter(enrollment -> canSendCourseBroadcast(currentUser, enrollment))
        .collect(Collectors.toList());
    return sendBatch(targets, NotificationType.COURSE_ASSIGNMENT, enrollment -> {
        return new MessageParts(request.subject(), request.message());
    });
}
```

### Рисунок 2.36 - Фрагмент кода учета уведомлений и статусов отправки

### [Скрин кода](./img_7.png)

```java
private NotificationDtos.BatchSendResponse sendBatch(List<Enrollment> enrollments, NotificationType type, java.util.function.Function<Enrollment, MessageParts> messageFactory) {
    List<NotificationDtos.NotificationResponse> created = new ArrayList<>();
    int sent = 0;
    int failed = 0;

    for (Enrollment enrollment : enrollments) {
        var client = userService.requireEntity(enrollment.getClientId());
        MessageParts parts = messageFactory.apply(enrollment);
        NotificationRecord record = NotificationRecord.builder()
            .enrollmentId(enrollment.getId())
            .clientId(client.getId())
            .recipientEmail(client.getEmail())
            .type(type)
            .subject(parts.subject())
            .message(parts.message())
            .dueAt(enrollment.getNextDueAt() == null ? LocalDate.now() : enrollment.getNextDueAt())
            .createdAt(Instant.now())
            .status(NotificationStatus.PENDING)
            .deliveryChannel(DeliveryChannel.EMAIL)
            .build();
        record = notificationRepository.save(record);
        created.add(toResponse(record));
        try {
            emailGateway.send(client.getEmail(), parts.subject(), parts.message());
            record.setStatus(NotificationStatus.SENT);
            record.setSentAt(Instant.now());
            notificationRepository.save(record);
            sent++;
        } catch (Exception ex) {
            record.setStatus(NotificationStatus.FAILED);
            record.setFailureReason(ex.getMessage());
            notificationRepository.save(record);
            failed++;
        }
    }

    return new NotificationDtos.BatchSendResponse(created.size(), sent, failed, created);
}
```

### Рисунок 2.37 - Фрагмент кода получения дашборда

### [Скрин кода](./img_8.png)

```java
public DashboardDtos.DashboardResponse dashboard(AuthenticatedUser currentUser) {
    boolean admin = currentUser == null || currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST;
    List<CourseDtos.CourseResponse> courses = courseService.listCourses();
    List<ProgramDtos.ProgramResponse> programs = programService.listPrograms(currentUser);
    List<LessonDtos.LessonResponse> lessons = lessonService.listLessons(currentUser);
    List<TestDtos.TestResponse> tests = testService.listTests(currentUser);
    List<EnrollmentDtos.EnrollmentResponse> enrollments = enrollmentService.listEnrollments(currentUser);
    List<TestDtos.TestAttemptResponse> attempts = testService.listAttempts(currentUser);
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
    long totalPrograms = programs.size();
    long totalLessons = lessons.size();
    long totalTests = tests.size();
    long totalAttempts = attempts.size();
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
        new DashboardDtos.Summary(totalUsers, totalClients, totalTeachers, totalCourses, totalPrograms, totalLessons, totalTests, totalAttempts, activeEnrollments, upcomingRepeats, sentNotifications, pendingNotifications),
        courses,
        programs,
        lessons,
        tests,
        enrollments,
        attempts,
        notifications,
        authService.demoCredentials()
    );
}
```

### Листинг кода программного продукта страниц на 3-4.

```java
public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
    AuthDtos.UserSummary user = authService.login(request.email(), request.password())
        .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    var session = authService.createSession(user);
    return new AuthDtos.LoginResponse(session.token(), user);
}

public UserDtos.UserResponse update(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody UserDtos.UserRequest body) {
    AuthenticatedUser currentUser = currentUser(request);
    if (currentUser != null && currentUser.role() == Role.ADMIN) {
        return userService.update(id, body);
    }
    if (currentUser != null && currentUser.role() == Role.TEACHER && currentUser.id().equals(id)) {
        return userService.updateProfile(id, new UserDtos.UserProfileRequest(
            body.firstName(),
            body.lastName(),
            body.email(),
            body.phone(),
            body.maxContact(),
            body.password()
        ));
    }
    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
}

public CourseDtos.CourseResponse create(HttpServletRequest servletRequest, @Valid @RequestBody CourseDtos.CourseRequest request) {
    requireManager(servletRequest);
    return courseService.create(request);
}

public CourseDtos.CourseResponse update(HttpServletRequest servletRequest, @PathVariable Long id, @Valid @RequestBody CourseDtos.CourseRequest request) {
    requireManager(servletRequest);
    return courseService.update(id, request);
}

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

public NotificationDtos.BatchSendResponse sendCourseNotification(Long courseId, AuthenticatedUser currentUser, NotificationDtos.NotificationComposeRequest request) {
    var course = courseService.requireEntity(courseId);
    List<Enrollment> targets = enrollmentService.allEnrollments().stream()
        .filter(enrollment -> courseId.equals(enrollment.getCourseId()))
        .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.CANCELLED)
        .filter(enrollment -> canSendCourseBroadcast(currentUser, enrollment))
        .collect(Collectors.toList());
    return sendBatch(targets, NotificationType.COURSE_ASSIGNMENT, enrollment -> {
        return new MessageParts(request.subject(), request.message());
    });
}

public NotificationDtos.BatchSendResponse sendEnrollmentNotification(Long enrollmentId, AuthenticatedUser currentUser, NotificationDtos.NotificationComposeRequest request) {
    Enrollment enrollment = enrollmentService.requireEntity(enrollmentId);
    if (!canSendEnrollmentNotification(currentUser, enrollment)) {
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
    return sendBatch(List.of(enrollment), NotificationType.SYSTEM_ALERT, item -> {
        return new MessageParts(request.subject(), request.message());
    });
}

public NotificationDtos.ReminderRunResponse runReminderSweep() {
    List<NotificationDtos.NotificationResponse> created = new ArrayList<>();
    int sent = 0;
    int failed = 0;
    LocalDate today = LocalDate.now();
    LocalDate limit = today.plusDays(reminderDays);

    for (Enrollment enrollment : enrollmentService.allEnrollments()) {
        if (enrollment.getNextDueAt() == null || enrollment.getStatus() == EnrollmentStatus.CANCELLED) {
            continue;
        }
        if (enrollment.getNextDueAt().isAfter(limit)) {
            continue;
        }
        if (alreadyHasReminder(enrollment.getId(), enrollment.getNextDueAt())) {
            continue;
        }

        var client = userService.requireEntity(enrollment.getClientId());
        var course = courseService.requireEntity(enrollment.getCourseId());
        String subject = "Напоминание о повторном обучении: " + course.getTitle();
        String message = buildMessage(client.getFirstName(), course.getTitle(), enrollment.getNextDueAt());
        NotificationRecord record = NotificationRecord.builder()
            .enrollmentId(enrollment.getId())
            .clientId(client.getId())
            .recipientEmail(client.getEmail())
            .type(NotificationType.REPEAT_REMINDER)
            .subject(subject)
            .message(message)
            .dueAt(enrollment.getNextDueAt())
            .createdAt(Instant.now())
            .status(NotificationStatus.PENDING)
            .deliveryChannel(DeliveryChannel.EMAIL)
            .build();
        record = notificationRepository.save(record);
        created.add(toResponse(record));
        try {
            emailGateway.send(client.getEmail(), subject, message);
            record.setStatus(NotificationStatus.SENT);
            record.setSentAt(Instant.now());
            notificationRepository.save(record);
            sent++;
        } catch (Exception ex) {
            record.setStatus(NotificationStatus.FAILED);
            record.setFailureReason(ex.getMessage());
            notificationRepository.save(record);
            failed++;
        }
    }

    return new NotificationDtos.ReminderRunResponse(created.size(), sent, failed, created);
}

public DashboardDtos.DashboardResponse dashboard(AuthenticatedUser currentUser) {
    boolean admin = currentUser == null || currentUser.role() == Role.ADMIN || currentUser.role() == Role.METHODIST;
    List<CourseDtos.CourseResponse> courses = courseService.listCourses();
    List<ProgramDtos.ProgramResponse> programs = programService.listPrograms(currentUser);
    List<LessonDtos.LessonResponse> lessons = lessonService.listLessons(currentUser);
    List<TestDtos.TestResponse> tests = testService.listTests(currentUser);
    List<EnrollmentDtos.EnrollmentResponse> enrollments = enrollmentService.listEnrollments(currentUser);
    List<TestDtos.TestAttemptResponse> attempts = testService.listAttempts(currentUser);
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
    long totalPrograms = programs.size();
    long totalLessons = lessons.size();
    long totalTests = tests.size();
    long totalAttempts = attempts.size();
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
        new DashboardDtos.Summary(totalUsers, totalClients, totalTeachers, totalCourses, totalPrograms, totalLessons, totalTests, totalAttempts, activeEnrollments, upcomingRepeats, sentNotifications, pendingNotifications),
        courses,
        programs,
        lessons,
        tests,
        enrollments,
        attempts,
        notifications,
        authService.demoCredentials()
    );
}
```
