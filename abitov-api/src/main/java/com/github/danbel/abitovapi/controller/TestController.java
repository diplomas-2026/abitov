package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.TestDtos;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import com.github.danbel.abitovapi.service.TestService;
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
@RequestMapping("/tests")
public class TestController {

    private final TestService testService;

    public TestController(TestService testService) {
        this.testService = testService;
    }

    @GetMapping
    public List<TestDtos.TestResponse> list(HttpServletRequest request) {
        return testService.listTests(currentUser(request));
    }

    @GetMapping("/{id}")
    public TestDtos.TestDetailResponse get(HttpServletRequest request, @PathVariable Long id) {
        return testService.getTest(id, currentUser(request));
    }

    @PostMapping
    public TestDtos.TestResponse create(HttpServletRequest request, @Valid @RequestBody TestDtos.TestRequest body) {
        requireManager(request);
        return testService.create(body);
    }

    @PutMapping("/{id}")
    public TestDtos.TestResponse update(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody TestDtos.TestRequest body) {
        requireManager(request);
        return testService.update(id, body);
    }

    @DeleteMapping("/{id}")
    public void delete(HttpServletRequest request, @PathVariable Long id) {
        requireManager(request);
        testService.delete(id);
    }

    @GetMapping("/{id}/attempts")
    public List<TestDtos.TestAttemptResponse> attempts(HttpServletRequest request, @PathVariable Long id) {
        return testService.listAttemptsForTest(id, currentUser(request));
    }

    @PostMapping("/{id}/attempts")
    public TestDtos.TestAttemptResponse submit(HttpServletRequest request, @PathVariable Long id, @RequestBody(required = false) TestDtos.TestAttemptSubmitRequest body) {
        return testService.submitAttempt(id, currentUser(request), body);
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
