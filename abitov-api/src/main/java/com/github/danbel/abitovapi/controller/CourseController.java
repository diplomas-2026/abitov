package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.dto.CourseDtos;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import com.github.danbel.abitovapi.service.CourseService;
import jakarta.validation.Valid;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/courses")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public List<CourseDtos.CourseResponse> list() {
        return courseService.listCourses();
    }

    @GetMapping("/{id}")
    public CourseDtos.CourseResponse get(@PathVariable Long id) {
        return courseService.getCourse(id);
    }

    @PostMapping
    public CourseDtos.CourseResponse create(HttpServletRequest servletRequest, @Valid @RequestBody CourseDtos.CourseRequest request) {
        requireAdmin(servletRequest);
        return courseService.create(request);
    }

    @PutMapping("/{id}")
    public CourseDtos.CourseResponse update(HttpServletRequest servletRequest, @PathVariable Long id, @Valid @RequestBody CourseDtos.CourseRequest request) {
        requireAdmin(servletRequest);
        return courseService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(HttpServletRequest servletRequest, @PathVariable Long id) {
        requireAdmin(servletRequest);
        courseService.delete(id);
    }

    private void requireAdmin(HttpServletRequest servletRequest) {
        AuthenticatedUser currentUser = (AuthenticatedUser) servletRequest.getAttribute(com.github.danbel.abitovapi.config.WebConfig.AuthInterceptor.ATTR);
        if (currentUser == null || currentUser.role() != com.github.danbel.abitovapi.domain.Role.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
    }
}
