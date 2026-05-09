insert into app_users (id, first_name, last_name, email, password_hash, role, active, phone, created_at, last_login_at)
values
    (1, 'Андрей', 'Смирнов', 'admin@abitov.local', '$2y$05$7lZLmoWePE8vJZe5OXKpcenAf5/KEtoW5h0ClYey0YR0OGgqdUVeq', 'ADMIN', true, null, current_timestamp, null),
    (2, 'Марина', 'Иванова', 'teacher@abitov.local', '$2y$05$11RH0tcFS0fuownVedtXLOWkCnko7RiXEh28dK2Ufla1fQ3IqviuG', 'TEACHER', true, null, current_timestamp, null),
    (3, 'Илья', 'Петров', 'client1@abitov.local', '$2y$05$BH4n08Dvgwg9ZQMmc4FZgu8Vrmzff8gFnMfjHRS1QbzCtaf.bdyWq', 'CLIENT', true, null, current_timestamp, null),
    (4, 'Анна', 'Соколова', 'client2@abitov.local', '$2y$05$BH4n08Dvgwg9ZQMmc4FZgu8Vrmzff8gFnMfjHRS1QbzCtaf.bdyWq', 'CLIENT', true, null, current_timestamp, null),
    (5, 'Денис', 'Козлов', 'client3@abitov.local', '$2y$05$BH4n08Dvgwg9ZQMmc4FZgu8Vrmzff8gFnMfjHRS1QbzCtaf.bdyWq', 'CLIENT', true, null, current_timestamp, null);

insert into courses (id, title, description, repeat_months, training_format, active, created_at, updated_at)
values
    (1, 'Охрана труда', 'Базовая программа по охране труда с последующим повторным обучением раз в год.', 12, 'Очный курс', true, current_timestamp, current_timestamp),
    (2, 'Пожарная безопасность', 'Подготовка сотрудников с ежегодным подтверждением знаний.', 12, 'Смешанный формат', true, current_timestamp, current_timestamp),
    (3, 'Первая помощь', 'Курс по оказанию первой помощи пострадавшим.', 24, 'Практика + тестирование', true, current_timestamp, current_timestamp);

insert into enrollments (id, client_id, course_id, teacher_id, enrolled_at, completed_at, next_due_at, status, notes, created_at, updated_at)
values
    (1, 3, 1, 2, date '2025-05-10', date '2025-06-10', date '2026-05-20', 'COMPLETED', 'Повторный инструктаж требуется в ближайшие две недели.', current_timestamp, current_timestamp),
    (2, 4, 2, 2, date '2024-02-15', date '2024-03-15', date '2026-05-05', 'COMPLETED', 'Просрочен срок повторного обучения.', current_timestamp, current_timestamp),
    (3, 5, 3, 2, date '2026-03-01', null, date '2028-01-01', 'ACTIVE', 'Группа в работе.', current_timestamp, current_timestamp);

insert into notifications (id, enrollment_id, client_id, recipient_email, notification_type, subject, message, due_at, created_at, sent_at, status, delivery_channel, failure_reason)
values
    (1, 1, 3, 'client1@abitov.local', 'REPEAT_REMINDER', 'Напоминание о повторном обучении: Охрана труда', 'Здравствуйте, Илья. Напоминаем о необходимости повторного обучения.', date '2026-05-20', current_timestamp, current_timestamp, 'SENT', 'EMAIL', null);

alter table app_users alter column id restart with 6;
alter table courses alter column id restart with 4;
alter table enrollments alter column id restart with 4;
alter table notifications alter column id restart with 2;
