package com.github.danbel.abitovapi.service;

import com.github.danbel.abitovapi.domain.Role;
import java.time.Instant;

public record AuthenticatedUser(
    Long id,
    String email,
    String fullName,
    Role role,
    String token,
    Instant tokenIssuedAt
) {
}
