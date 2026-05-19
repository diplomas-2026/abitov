package com.github.danbel.abitovapi.config;

import com.github.danbel.abitovapi.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthService authService;

    public WebConfig(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOriginPatterns("*")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .exposedHeaders("Authorization")
            .allowCredentials(false);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor(authService))
            .addPathPatterns("/**")
            .excludePathPatterns(
                "/auth/login",
                "/auth/demo-users",
                "/swagger-ui/**",
                "/swagger-ui.html",
                "/v3/api-docs/**",
                "/health",
                "/error",
                "/h2-console/**"
            );
    }

    public static final class AuthInterceptor implements HandlerInterceptor {

        public static final String ATTR = AuthInterceptor.class.getName() + ".CURRENT_USER";
        private final AuthService authService;

        public AuthInterceptor(AuthService authService) {
            this.authService = authService;
        }

        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                return true;
            }
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                writeUnauthorized(response);
                return false;
            }

            var user = authService.requireUserByToken(authHeader.substring(7).trim());
            if (user == null) {
                writeUnauthorized(response);
                return false;
            }

            if (user.tokenIssuedAt() != null && user.tokenIssuedAt().isBefore(Instant.now().minusSeconds(60L * 60L * 24L))) {
                authService.invalidate(user.token());
                writeUnauthorized(response);
                return false;
            }

            request.setAttribute(ATTR, user);
            return true;
        }

        private static void writeUnauthorized(HttpServletResponse response) throws IOException {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"Unauthorized\"}");
        }
    }
}
