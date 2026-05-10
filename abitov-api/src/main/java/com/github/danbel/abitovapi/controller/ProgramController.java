package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.ProgramDtos;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import com.github.danbel.abitovapi.service.ProgramService;
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
@RequestMapping("/programs")
public class ProgramController {

    private final ProgramService programService;

    public ProgramController(ProgramService programService) {
        this.programService = programService;
    }

    @GetMapping
    public List<ProgramDtos.ProgramResponse> list(HttpServletRequest request) {
        return programService.listPrograms(currentUser(request));
    }

    @GetMapping("/{id}")
    public ProgramDtos.ProgramDetailResponse get(HttpServletRequest request, @PathVariable Long id) {
        return programService.getProgramDetail(id, currentUser(request));
    }

    @GetMapping("/course/{courseId}")
    public List<ProgramDtos.ProgramResponse> listByCourse(HttpServletRequest request, @PathVariable Long courseId) {
        return programService.listPrograms(currentUser(request)).stream()
            .filter(program -> program.course() != null && courseId.equals(program.course().id()))
            .toList();
    }

    @PostMapping
    public ProgramDtos.ProgramResponse create(HttpServletRequest request, @Valid @RequestBody ProgramDtos.ProgramRequest body) {
        requireManager(request);
        return programService.create(body);
    }

    @PutMapping("/{id}")
    public ProgramDtos.ProgramResponse update(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody ProgramDtos.ProgramRequest body) {
        requireManager(request);
        return programService.update(id, body);
    }

    @DeleteMapping("/{id}")
    public void delete(HttpServletRequest request, @PathVariable Long id) {
        requireManager(request);
        programService.delete(id);
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
