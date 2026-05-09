package com.github.danbel.abitovapi.dto;

import com.github.danbel.abitovapi.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
    ) {
    }

    public record LoginResponse(
        String token,
        UserSummary user
    ) {
    }

    public record DemoCredential(
        String email,
        String password,
        Role role,
        String label
    ) {
    }

    public record UserSummary(
        Long id,
        String fullName,
        String email,
        Role role
    ) {
    }
}
