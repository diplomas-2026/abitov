package com.github.danbel.abitovapi.controller;

import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.UserDtos;
import com.github.danbel.abitovapi.service.AuthenticatedUser;
import com.github.danbel.abitovapi.service.UserService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserDtos.UserResponse> list(HttpServletRequest request, @RequestParam(required = false) Role role) {
        AuthenticatedUser currentUser = currentUser(request);
        if (currentUser != null && currentUser.role() == Role.ADMIN) {
            return userService.listUsers(role);
        }
        return List.of(userService.toResponse(userService.requireEntity(currentUser.id())));
    }

    @GetMapping("/{id}")
    public UserDtos.UserResponse get(HttpServletRequest request, @PathVariable Long id) {
        requireAdmin(request);
        return userService.getUser(id);
    }

    @PostMapping
    public UserDtos.UserResponse create(HttpServletRequest request, @Valid @RequestBody UserDtos.UserRequest body) {
        requireAdmin(request);
        return userService.create(body);
    }

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

    @PutMapping("/me")
    public UserDtos.UserResponse updateMe(HttpServletRequest request, @Valid @RequestBody UserDtos.UserProfileRequest body) {
        AuthenticatedUser currentUser = currentUser(request);
        if (currentUser == null || currentUser.role() != Role.TEACHER) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        return userService.updateProfile(currentUser.id(), body);
    }

    @DeleteMapping("/{id}")
    public void delete(HttpServletRequest request, @PathVariable Long id) {
        requireAdmin(request);
        userService.delete(id);
    }

    private AuthenticatedUser currentUser(HttpServletRequest request) {
        return (AuthenticatedUser) request.getAttribute(com.github.danbel.abitovapi.config.WebConfig.AuthInterceptor.ATTR);
    }

    private void requireAdmin(HttpServletRequest request) {
        AuthenticatedUser user = currentUser(request);
        if (user == null || user.role() != Role.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
    }
}
