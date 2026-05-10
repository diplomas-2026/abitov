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
@Table("lessons")
public class Lesson {

    @Id
    private Long id;

    @Column("program_id")
    private Long programId;

    @Column("title")
    private String title;

    @Column("body")
    private String body;

    @Column("position")
    private int position;

    @Column("active")
    private boolean active;

    @Column("created_at")
    private Instant createdAt;

    @Column("updated_at")
    private Instant updatedAt;
}
