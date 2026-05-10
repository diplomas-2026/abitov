package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.AppUser;
import com.github.danbel.abitovapi.domain.Role;
import com.github.danbel.abitovapi.dto.AuthDtos;
import com.github.danbel.abitovapi.repository.AppUserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenStore tokenStore;

    public AuthService(AppUserRepository userRepository, PasswordEncoder passwordEncoder, TokenStore tokenStore) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenStore = tokenStore;
    }

    public Optional<AuthDtos.UserSummary> login(String email, String password) {
        return userRepository.findByEmailIgnoreCase(email)
            .filter(AppUser::isActive)
            .filter(user -> passwordEncoder.matches(password, user.getPasswordHash()))
            .map(user -> {
                user.setLastLoginAt(Instant.now());
                userRepository.save(user);
                return new AuthDtos.UserSummary(
                    user.getId(),
                    fullName(user),
                    user.getEmail(),
                    user.getRole(),
                    user.getMaxContact()
                );
            });
    }

    public AuthenticatedUser createSession(AuthDtos.UserSummary summary) {
        return tokenStore.createSession(new AuthenticatedUser(
            summary.id(),
            summary.email(),
            summary.fullName(),
            summary.role(),
            null,
            null
        ));
    }

    public AuthenticatedUser refreshSession(String token, AuthDtos.UserSummary summary) {
        return tokenStore.refreshSession(token, new AuthenticatedUser(
            summary.id(),
            summary.email(),
            summary.fullName(),
            summary.role(),
            token,
            Instant.now()
        ));
    }

    public AuthenticatedUser requireUserByToken(String token) {
        return tokenStore.resolve(token);
    }

    public void invalidate(String token) {
        tokenStore.invalidate(token);
    }

    public List<AuthDtos.DemoCredential> demoCredentials() {
        return List.of(
            new AuthDtos.DemoCredential("admin@abitov.local", "admin123", Role.ADMIN, "Администратор"),
            new AuthDtos.DemoCredential("methodist@abitov.local", "teacher123", Role.METHODIST, "Методист"),
            new AuthDtos.DemoCredential("teacher@abitov.local", "teacher123", Role.TEACHER, "Преподаватель"),
            new AuthDtos.DemoCredential("client1@abitov.local", "client123", Role.CLIENT, "Клиент 1"),
            new AuthDtos.DemoCredential("client2@abitov.local", "client123", Role.CLIENT, "Клиент 2"),
            new AuthDtos.DemoCredential("client3@abitov.local", "client123", Role.CLIENT, "Клиент 3")
        );
    }

    public static String fullName(AppUser user) {
        return user.getLastName() + " " + user.getFirstName();
    }
}
