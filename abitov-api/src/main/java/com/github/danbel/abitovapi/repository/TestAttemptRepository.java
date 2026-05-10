package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.TestAttempt;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface TestAttemptRepository extends CrudRepository<TestAttempt, Long> {

    List<TestAttempt> findByTestIdOrderByTakenAtDesc(Long testId);

    List<TestAttempt> findByClientIdOrderByTakenAtDesc(Long clientId);
}
