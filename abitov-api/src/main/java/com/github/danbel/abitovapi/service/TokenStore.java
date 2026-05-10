package com.github.danbel.abitovapi.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class TokenStore {

    private final Map<String, AuthenticatedUser> sessions = new ConcurrentHashMap<>();

    public AuthenticatedUser createSession(AuthenticatedUser user) {
        String token = UUID.randomUUID().toString();
        AuthenticatedUser session = new AuthenticatedUser(
            user.id(),
            user.email(),
            user.fullName(),
            user.role(),
            token,
            Instant.now()
        );
        sessions.put(token, session);
        return session;
    }

    public AuthenticatedUser refreshSession(String token, AuthenticatedUser user) {
        AuthenticatedUser session = new AuthenticatedUser(
            user.id(),
            user.email(),
            user.fullName(),
            user.role(),
            token,
            user.tokenIssuedAt() == null ? Instant.now() : user.tokenIssuedAt()
        );
        sessions.put(token, session);
        return session;
    }

    public AuthenticatedUser resolve(String token) {
        return sessions.get(token);
    }

    public void invalidate(String token) {
        sessions.remove(token);
    }
}
