alter table app_users add column if not exists max_contact varchar(255);
alter table enrollments add column if not exists group_name varchar(255);

update app_users
set max_contact = '@marina.ivanova'
where id = 2;

update app_users
set max_contact = '@olga.nikitina'
where id = 6;

update enrollments
set group_name = 'MAX Охрана труда - Группа 1'
where id = 1;

update enrollments
set group_name = 'MAX Пожарная безопасность - Группа 2'
where id = 2;

update enrollments
set group_name = 'MAX Первая помощь - Группа 3'
where id = 3;
