package com.github.danbel.abitovapi.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("test_attempts")
public class TestAttempt {

    @Id
    private Long id;

    @Column("test_id")
    private Long testId;

    @Column("client_id")
    private Long clientId;

    @Column("attempt_no")
    private int attemptNo;

    @Column("score")
    private int score;

    @Column("passed")
    private boolean passed;

    @Column("taken_at")
    private Instant takenAt;

    @Column("answers_json")
    private String answersJson;
}
