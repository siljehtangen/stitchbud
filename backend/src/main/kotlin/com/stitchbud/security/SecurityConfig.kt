package com.stitchbud.security

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtTimestampValidator
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import java.time.Duration

@Configuration
@EnableWebSecurity
class SecurityConfig {

    private val log = LoggerFactory.getLogger(SecurityConfig::class.java)

    @Bean
    fun jwtDecoder(@Value("\${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") jwkSetUri: String): JwtDecoder {
        log.info("Configuring JwtDecoder with JWKS URI: $jwkSetUri")
        val nimbusDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
            .jwsAlgorithm(SignatureAlgorithm.ES256)
            .build()
        nimbusDecoder.setJwtValidator(JwtTimestampValidator(Duration.ofSeconds(60)))
        return JwtDecoder { token ->
            runCatching { nimbusDecoder.decode(token) }
                .onFailure { log.warn("JWT decode failed [${it::class.simpleName}]: ${it.message}") }
                .getOrThrow()
        }
    }

    @Bean
    fun filterChain(http: HttpSecurity, corsConfigurationSource: CorsConfigurationSource): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .cors { it.configurationSource(corsConfigurationSource) }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers("/api/library-images/**").permitAll()
                it.anyRequest().authenticated()
            }
            .oauth2ResourceServer { it.jwt { } }
        return http.build()
    }

    @Bean
    fun corsConfigurationSource(
        @Value("\${app.cors-origins:http://localhost:5173,http://localhost:5174,http://localhost:5176}") corsOrigins: String
    ): CorsConfigurationSource = UrlBasedCorsConfigurationSource().apply {
        registerCorsConfiguration("/**", CorsConfiguration().apply {
            allowedOrigins = corsOrigins.split(",").map { it.trim() }
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
            allowCredentials = true
        })
    }
}
