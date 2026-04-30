package com.stitchbud.controller

import com.stitchbud.dto.SendFriendRequestBody
import com.stitchbud.dto.UserProfileDto
import com.stitchbud.service.FriendshipService
import com.stitchbud.util.currentUserId
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
class UserController(private val friendshipService: FriendshipService) {

    private val jwtToken: JwtAuthenticationToken?
        get() = SecurityContextHolder.getContext().authentication as? JwtAuthenticationToken

    private fun jwtClaim(claim: String): String? = jwtToken?.token?.getClaim(claim)

    private fun displayName(): String? =
        jwtToken?.token?.getClaim<Any?>("user_metadata")
            ?.let { it as? Map<*, *> }
            ?.let { (it["full_name"] as? String) ?: (it["name"] as? String) }

    @PutMapping("/me")
    fun upsertMe(): UserProfileDto {
        val email = jwtClaim("email") ?: ""
        return friendshipService.upsertProfile(currentUserId(), email, displayName())
    }
}

@RestController
@RequestMapping("/api/friends")
class FriendshipController(private val friendshipService: FriendshipService) {

    @GetMapping
    fun getFriends() = friendshipService.getFriends(currentUserId())

    @GetMapping("/requests")
    fun getPendingRequests() = friendshipService.getPendingRequests(currentUserId())

    @PostMapping("/request")
    fun sendRequest(@RequestBody body: SendFriendRequestBody) =
        friendshipService.sendFriendRequest(currentUserId(), body.email.trim())

    @PutMapping("/{id}/accept")
    fun accept(@PathVariable id: Long) =
        friendshipService.acceptFriendRequest(id, currentUserId())

    @DeleteMapping("/{id}")
    fun remove(@PathVariable id: Long): ResponseEntity<Unit> {
        friendshipService.removeFriendship(id, currentUserId())
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{friendUserId}/projects")
    fun getFriendProjects(@PathVariable friendUserId: String) =
        friendshipService.getFriendPublicProjects(currentUserId(), friendUserId)

    @GetMapping("/{friendUserId}/projects/{projectId}")
    fun getFriendProject(@PathVariable friendUserId: String, @PathVariable projectId: Long) =
        friendshipService.getFriendProject(currentUserId(), friendUserId, projectId)
}
