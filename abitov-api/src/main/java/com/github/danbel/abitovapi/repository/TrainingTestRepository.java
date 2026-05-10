package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.TrainingTest;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface TrainingTestRepository extends CrudRepository<TrainingTest, Long> {

    List<TrainingTest> findByProgramIdOrderByIdAsc(Long programId);

    List<TrainingTest> findByLessonIdOrderByIdAsc(Long lessonId);
}
