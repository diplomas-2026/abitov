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
@Table("test_questions")
public class TestQuestion {

    @Id
    private Long id;

    @Column("test_id")
    private Long testId;

    @Column("question_text")
    private String questionText;

    @Column("position")
    private int position;

    @Column("created_at")
    private Instant createdAt;

    @Column("updated_at")
    private Instant updatedAt;
}
