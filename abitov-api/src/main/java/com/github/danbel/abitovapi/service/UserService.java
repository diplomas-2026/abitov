package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.AppUser;
import com.github.danbel.abitovapi.domain.Enrollment;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.AuthDtos;
import com.github.danbel.abitovapi.dto.UserDtos;
import com.github.danbel.abitovapi.repository.AppUserRepository;
import com.github.danbel.abitovapi.repository.EnrollmentRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class UserService {

    private final AppUserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(AppUserRepository userRepository, EnrollmentRepository enrollmentRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserDtos.UserResponse> listUsers(Role role) {
        return streamUsers()
            .filter(user -> role == null || user.getRole() == role)
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public UserDtos.UserResponse getUser(Long id) {
        return userRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
    }

    @Transactional
    public UserDtos.UserResponse create(UserDtos.UserRequest request) {
        userRepository.findByEmailIgnoreCase(request.email())
            .ifPresent(user -> {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Email already exists");
            });
        AppUser user = AppUser.builder()
            .firstName(request.firstName())
            .lastName(request.lastName())
            .email(request.email().toLowerCase(Locale.ROOT))
            .phone(request.phone())
            .maxContact(request.maxContact())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role(request.role())
            .active(request.active())
            .createdAt(Instant.now())
            .build();
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserDtos.UserResponse update(Long id, UserDtos.UserRequest request) {
        AppUser existing = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        userRepository.findByEmailIgnoreCase(request.email())
            .filter(other -> !Objects.equals(other.getId(), existing.getId()))
            .ifPresent(other -> {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Email already exists");
            });
        existing.setFirstName(request.firstName());
        existing.setLastName(request.lastName());
        existing.setEmail(request.email().toLowerCase(Locale.ROOT));
        existing.setPhone(request.phone());
        existing.setMaxContact(request.maxContact());
        existing.setPasswordHash(passwordEncoder.encode(request.password()));
        existing.setRole(request.role());
        existing.setActive(request.active());
        return toResponse(userRepository.save(existing));
    }

    @Transactional
    public UserDtos.UserResponse updateProfile(Long id, UserDtos.UserProfileRequest request) {
        AppUser existing = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        userRepository.findByEmailIgnoreCase(request.email())
            .filter(other -> !Objects.equals(other.getId(), existing.getId()))
            .ifPresent(other -> {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Email already exists");
            });
        existing.setFirstName(request.firstName());
        existing.setLastName(request.lastName());
        existing.setEmail(request.email().toLowerCase(Locale.ROOT));
        existing.setPhone(request.phone());
        existing.setMaxContact(request.maxContact());
        if (request.password() != null && !request.password().isBlank()) {
            existing.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        return toResponse(userRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        boolean linked = StreamSupport.stream(enrollmentRepository.findAll().spliterator(), false)
            .anyMatch(enrollment ->
                (enrollment.getClientId() != null && enrollment.getClientId().equals(id))
                    || (enrollment.getTeacherId() != null && enrollment.getTeacherId().equals(id))
            );
        if (linked) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT,
                "Нельзя удалить пользователя, он связан с записями на обучение"
            );
        }
        userRepository.deleteById(id);
    }

    public AuthDtos.UserSummary toSummary(AppUser user) {
        return new AuthDtos.UserSummary(user.getId(), AuthService.fullName(user), user.getEmail(), user.getRole(), user.getMaxContact());
    }

    public UserDtos.UserResponse toResponse(AppUser user) {
        return new UserDtos.UserResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            AuthService.fullName(user),
            user.getEmail(),
            user.getPhone(),
            user.getMaxContact(),
            user.getRole(),
            user.isActive(),
            user.getCreatedAt() == null ? null : user.getCreatedAt().toString(),
            user.getLastLoginAt() == null ? null : user.getLastLoginAt().toString()
        );
    }

    public AppUser requireEntity(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
    }

    private java.util.stream.Stream<AppUser> streamUsers() {
        return StreamSupport.stream(userRepository.findAll().spliterator(), false);
    }
}
