package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.Enrollment;
import com.github.danbel.abitovapi.domain.EnrollmentStatus;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface EnrollmentRepository extends CrudRepository<Enrollment, Long> {

    List<Enrollment> findByStatusOrderByCreatedAtDesc(EnrollmentStatus status);
}
