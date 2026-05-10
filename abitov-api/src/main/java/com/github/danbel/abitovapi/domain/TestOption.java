package com.github.danbel.abitovapi.domain;

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
@Table("test_options")
public class TestOption {

    @Id
    private Long id;

    @Column("question_id")
    private Long questionId;

    @Column("option_text")
    private String optionText;

    @Column("is_correct")
    private boolean correct;

    @Column("position")
    private int position;
}
