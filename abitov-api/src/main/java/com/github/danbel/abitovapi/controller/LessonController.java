package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.LessonDtos;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import com.github.danbel.abitovapi.service.LessonService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/lessons")
public class LessonController {

    private final LessonService lessonService;

    public LessonController(LessonService lessonService) {
        this.lessonService = lessonService;
    }

    @GetMapping
    public List<LessonDtos.LessonResponse> list(HttpServletRequest request) {
        return lessonService.listLessons(currentUser(request));
    }

    @GetMapping("/{id}")
    public LessonDtos.LessonResponse get(HttpServletRequest request, @PathVariable Long id) {
        return lessonService.getLesson(id, currentUser(request));
    }

    @PostMapping
    public LessonDtos.LessonResponse create(HttpServletRequest request, @Valid @RequestBody LessonDtos.LessonRequest body) {
        requireManager(request);
        return lessonService.create(body);
    }

    @PutMapping("/{id}")
    public LessonDtos.LessonResponse update(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody LessonDtos.LessonRequest body) {
        requireManager(request);
        return lessonService.update(id, body);
    }

    @DeleteMapping("/{id}")
    public void delete(HttpServletRequest request, @PathVariable Long id) {
        requireManager(request);
        lessonService.delete(id);
    }

    private AuthenticatedUser currentUser(HttpServletRequest request) {
        return (AuthenticatedUser) request.getAttribute(com.github.danbel.abitovapi.config.WebConfig.AuthInterceptor.ATTR);
    }

    private void requireManager(HttpServletRequest request) {
        AuthenticatedUser user = currentUser(request);
        if (user == null || (user.role() != Role.ADMIN && user.role() != Role.METHODIST)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
    }
}
