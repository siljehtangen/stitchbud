package com.stitchbud.security

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(
    @Value("\${supabase.jwt-secret}") private val jwtSecret: String
) : OncePerRequestFilter() {

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val token = request.getHeader("Authorization")?.removePrefix("Bearer ")
        if (token != null) {
            try {
                val key = Keys.hmacShaKeyFor(jwtSecret.toByteArray(Charsets.UTF_8))
                val claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload
                val userId = claims.subject
                if (userId != null) {
                    SecurityContextHolder.getContext().authentication =
                        UsernamePasswordAuthenticationToken(userId, null, emptyList())
                }
            } catch (_: Exception) {
                // Invalid token — leave unauthenticated, security config will reject
            }
        }
        chain.doFilter(request, response)
    }
}
