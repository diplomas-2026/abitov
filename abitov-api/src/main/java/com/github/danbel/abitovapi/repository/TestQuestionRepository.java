package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.TestQuestion;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface TestQuestionRepository extends CrudRepository<TestQuestion, Long> {

    List<TestQuestion> findByTestIdOrderByPositionAscIdAsc(Long testId);
}
