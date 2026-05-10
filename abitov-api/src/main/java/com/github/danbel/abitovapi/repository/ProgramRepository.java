package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.Program;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface ProgramRepository extends CrudRepository<Program, Long> {

    List<Program> findByCourseIdOrderByPositionAscIdAsc(Long courseId);
}
