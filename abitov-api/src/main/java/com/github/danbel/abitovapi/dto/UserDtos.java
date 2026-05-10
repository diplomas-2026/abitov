package com.github.danbel.abitovapi.dto;

import com.github.danbel.abitovapi.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Email @NotBlank String email,
        String phone,
        String maxContact,
        @NotBlank String password,
        @NotNull Role role,
        boolean active
    ) {
    }

    public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phone,
        String maxContact,
        Role role,
        boolean active,
        String createdAt,
        String lastLoginAt
    ) {
    }
}
