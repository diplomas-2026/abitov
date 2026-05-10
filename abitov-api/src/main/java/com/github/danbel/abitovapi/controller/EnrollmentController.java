package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.dto.EnrollmentDtos;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import com.github.danbel.abitovapi.service.EnrollmentService;
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
@RequestMapping("/enrollments")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    public EnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @GetMapping
    public List<EnrollmentDtos.EnrollmentResponse> list(HttpServletRequest request) {
        return enrollmentService.listEnrollments(currentUser(request));
    }

    @GetMapping("/{id}")
    public EnrollmentDtos.EnrollmentResponse get(HttpServletRequest request, @PathVariable Long id) {
        return enrollmentService.getEnrollment(id, currentUser(request));
    }

    @GetMapping("/upcoming")
    public List<EnrollmentDtos.EnrollmentResponse> upcoming(HttpServletRequest request, @org.springframework.web.bind.annotation.RequestParam(defaultValue = "30") int days) {
        return enrollmentService.upcoming(days, currentUser(request));
    }

    @PostMapping
    public EnrollmentDtos.EnrollmentResponse create(HttpServletRequest servletRequest, @Valid @RequestBody EnrollmentDtos.EnrollmentRequest request) {
        requireManager(servletRequest);
        return enrollmentService.create(request);
    }

    @PutMapping("/{id}/teacher/{teacherId}")
    public EnrollmentDtos.EnrollmentResponse updateTeacher(HttpServletRequest servletRequest, @PathVariable Long id, @PathVariable Long teacherId) {
        requireManager(servletRequest);
        return enrollmentService.updateTeacher(id, teacherId);
    }

    @PutMapping("/{id}/group")
    public EnrollmentDtos.EnrollmentResponse updateGroup(HttpServletRequest servletRequest, @PathVariable Long id, @Valid @RequestBody EnrollmentDtos.EnrollmentGroupRequest request) {
        requireTeacherOrAdminForGroupUpdate(servletRequest, id);
        return enrollmentService.updateGroup(id, request);
    }

    @PostMapping("/{id}/complete")
    public EnrollmentDtos.EnrollmentResponse complete(HttpServletRequest servletRequest, @PathVariable Long id, @RequestBody(required = false) EnrollmentDtos.EnrollmentCompletionRequest request) {
        requireManager(servletRequest);
        return enrollmentService.complete(id, request == null ? new EnrollmentDtos.EnrollmentCompletionRequest(null) : request);
    }

    private AuthenticatedUser currentUser(HttpServletRequest request) {
        return (AuthenticatedUser) request.getAttribute(com.github.danbel.abitovapi.config.WebConfig.AuthInterceptor.ATTR);
    }

    private void requireManager(HttpServletRequest request) {
        AuthenticatedUser user = currentUser(request);
        if (user == null || (user.role() != Role.TEACHER && user.role() != Role.ADMIN && user.role() != Role.METHODIST)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
    }

    private void requireTeacherOrAdminForGroupUpdate(HttpServletRequest request, Long enrollmentId) {
        AuthenticatedUser user = currentUser(request);
        if (user == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        if (user.role() == Role.ADMIN || user.role() == Role.METHODIST) {
            return;
        }
        if (user.role() == Role.TEACHER) {
            EnrollmentDtos.EnrollmentResponse enrollment = enrollmentService.getEnrollment(enrollmentId);
            if (enrollment.teacher() != null && user.id().equals(enrollment.teacher().id())) {
                return;
            }
        }
        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
    }
}
