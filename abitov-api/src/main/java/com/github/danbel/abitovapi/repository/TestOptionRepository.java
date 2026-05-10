package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.TestOption;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface TestOptionRepository extends CrudRepository<TestOption, Long> {

    List<TestOption> findByQuestionIdOrderByPositionAscIdAsc(Long questionId);
}
