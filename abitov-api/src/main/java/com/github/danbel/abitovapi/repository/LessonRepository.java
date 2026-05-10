package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.Lesson;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface LessonRepository extends CrudRepository<Lesson, Long> {

    List<Lesson> findByProgramIdOrderByPositionAscIdAsc(Long programId);
}
