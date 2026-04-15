package com.stitchbud.controller

import com.stitchbud.dto.SendFriendRequestBody
import com.stitchbud.dto.UserProfileDto
import com.stitchbud.service.FriendshipService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
class UserController(private val friendshipService: FriendshipService) {

    private fun userId() = SecurityContextHolder.getContext().authentication.name

    private fun jwtClaim(claim: String): String? {
        val auth = SecurityContextHolder.getContext().authentication
        return if (auth is JwtAuthenticationToken) auth.token.getClaim(claim) else null
    }

    private fun displayName(): String? {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth !is JwtAuthenticationToken) return null
        val meta = auth.token.getClaim<Any?>("user_metadata") ?: return null
        @Suppress("UNCHECKED_CAST")
        val map = meta as? Map<String, Any?> ?: return null
        return (map["full_name"] as? String) ?: (map["name"] as? String)
    }

    @PutMapping("/me")
    fun upsertMe(): UserProfileDto {
        val email = jwtClaim("email") ?: ""
        return friendshipService.upsertProfile(userId(), email, displayName())
    }
}

@RestController
@RequestMapping("/api/friends")
class FriendshipController(private val friendshipService: FriendshipService) {

    private fun userId() = SecurityContextHolder.getContext().authentication.name

    @GetMapping
    fun getFriends() = friendshipService.getFriends(userId())

    @GetMapping("/requests")
    fun getPendingRequests() = friendshipService.getPendingRequests(userId())

    @PostMapping("/request")
    fun sendRequest(@RequestBody body: SendFriendRequestBody) =
        friendshipService.sendFriendRequest(userId(), body.email.trim())

    @PutMapping("/{id}/accept")
    fun accept(@PathVariable id: Long) =
        friendshipService.acceptFriendRequest(id, userId())

    @DeleteMapping("/{id}")
    fun remove(@PathVariable id: Long): ResponseEntity<Unit> {
        friendshipService.removeFriendship(id, userId())
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{friendUserId}/projects")
    fun getFriendProjects(@PathVariable friendUserId: String) =
        friendshipService.getFriendPublicProjects(userId(), friendUserId)
}
