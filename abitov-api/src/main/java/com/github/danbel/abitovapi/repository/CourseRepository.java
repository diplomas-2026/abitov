package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.Course;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface CourseRepository extends CrudRepository<Course, Long> {

    List<Course> findByActiveTrueOrderByTitleAsc();
}
