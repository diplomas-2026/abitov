package com.github.danbel.abitovapi.repository;

import com.github.danbel.abitovapi.domain.AppUser;
import com.github.danbel.abitovapi.domain.Role;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;

public interface AppUserRepository extends CrudRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    List<AppUser> findByRoleOrderByLastNameAscFirstNameAsc(Role role);
}
