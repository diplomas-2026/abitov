package com.github.danbel.abitovapi.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AppConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @ConfigurationProperties(prefix = "app.notification")
    public NotificationProperties notificationProperties() {
        return new NotificationProperties();
    }

    public static class NotificationProperties {
        private int reminderDays = 30;
        private int overdueDays = 0;
        private boolean bootstrap = true;

        public int getReminderDays() {
            return reminderDays;
        }

        public void setReminderDays(int reminderDays) {
            this.reminderDays = reminderDays;
        }

        public int getOverdueDays() {
            return overdueDays;
        }

        public void setOverdueDays(int overdueDays) {
            this.overdueDays = overdueDays;
        }

        public boolean isBootstrap() {
            return bootstrap;
        }

        public void setBootstrap(boolean bootstrap) {
            this.bootstrap = bootstrap;
        }
    }
}
