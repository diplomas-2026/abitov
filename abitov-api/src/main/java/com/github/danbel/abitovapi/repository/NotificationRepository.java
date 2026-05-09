package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.NotificationRecord;
import com.github.danbel.abitovapi.domain.NotificationStatus;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface NotificationRepository extends CrudRepository<NotificationRecord, Long> {

    List<NotificationRecord> findByStatusOrderByCreatedAtDesc(NotificationStatus status);
}
