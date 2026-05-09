package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.dto.AuthDtos;
import com.github.danbel.abitovapi.service.AuthService;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import jakarta.validation.Valid;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        AuthDtos.UserSummary user = authService.login(request.email(), request.password())
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        var session = authService.createSession(user);
        return new AuthDtos.LoginResponse(session.token(), user);
    }

    @GetMapping("/demo-users")
    public List<AuthDtos.DemoCredential> demoUsers() {
        return authService.demoCredentials();
    }

    @GetMapping("/me")
    public AuthenticatedUser me(HttpServletRequest request) {
        return (AuthenticatedUser) request.getAttribute(com.github.danbel.abitovapi.config.WebConfig.AuthInterceptor.ATTR);
    }
}
