package com.stitchbud.controller

import com.stitchbud.dto.*
import com.stitchbud.service.FriendshipService
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import kotlin.test.assertEquals

class FriendshipControllerTest {

    private val service: FriendshipService = mock()
    private val controller = FriendshipController(service)

    companion object {
        const val USER_ID = "user-1"
        const val FRIEND_ID = "user-2"
    }

    @BeforeEach
    fun setUpSecurity() {
        val auth = mock<Authentication>()
        whenever(auth.name).thenReturn(USER_ID)
        SecurityContextHolder.getContext().authentication = auth
    }

    @AfterEach
    fun clearSecurity() = SecurityContextHolder.clearContext()

    private fun makeFriendDto() = FriendDto(
        friendshipId = 1L,
        userId = FRIEND_ID,
        displayName = "Friend",
        email = "friend@test.com",
    )

    private fun makeFriendRequestDto() = FriendRequestDto(
        friendshipId = 2L,
        requesterId = FRIEND_ID,
        requesterDisplayName = "Friend",
        requesterEmail = "friend@test.com",
        createdAt = 0L,
    )

    private fun makeProjectDto(id: Long = 1L) = ProjectDto(
        id = id,
        name = "Public Project",
        category = com.stitchbud.model.ProjectCategory.KNITTING,
        isPublic = true,
        createdAt = 0,
        updatedAt = 0,
        userId = FRIEND_ID,
    )

    // ──────── getFriends ────────

    @Test
    fun `getFriends delegates to service with current user id`() {
        whenever(service.getFriends(USER_ID)).thenReturn(listOf(makeFriendDto()))

        val result = controller.getFriends()

        verify(service).getFriends(USER_ID)
        assertEquals(1, result.size)
        assertEquals(FRIEND_ID, result[0].userId)
    }

    // ──────── getPendingRequests ────────

    @Test
    fun `getPendingRequests delegates to service`() {
        whenever(service.getPendingRequests(USER_ID)).thenReturn(listOf(makeFriendRequestDto()))

        val result = controller.getPendingRequests()

        verify(service).getPendingRequests(USER_ID)
        assertEquals(1, result.size)
        assertEquals(FRIEND_ID, result[0].requesterId)
    }

    // ──────── sendRequest ────────

    @Test
    fun `sendRequest trims whitespace from email before delegating`() {
        val body = SendFriendRequestBody(email = "  friend@test.com  ")
        whenever(service.sendFriendRequest(USER_ID, "friend@test.com")).thenReturn(makeFriendDto())

        controller.sendRequest(body)

        verify(service).sendFriendRequest(USER_ID, "friend@test.com")
    }

    @Test
    fun `sendRequest delegates to service`() {
        val body = SendFriendRequestBody(email = "friend@test.com")
        whenever(service.sendFriendRequest(USER_ID, "friend@test.com")).thenReturn(makeFriendDto())

        val result = controller.sendRequest(body)

        verify(service).sendFriendRequest(USER_ID, "friend@test.com")
        assertEquals(FRIEND_ID, result.userId)
    }

    // ──────── accept ────────

    @Test
    fun `accept delegates to service with friendship id and current user`() {
        whenever(service.acceptFriendRequest(10L, USER_ID)).thenReturn(makeFriendDto())

        val result = controller.accept(10L)

        verify(service).acceptFriendRequest(10L, USER_ID)
        assertEquals(FRIEND_ID, result.userId)
    }

    // ──────── remove ────────

    @Test
    fun `remove delegates to service and returns 204`() {
        val response = controller.remove(10L)

        verify(service).removeFriendship(10L, USER_ID)
        assertEquals(HttpStatus.NO_CONTENT, response.statusCode)
    }

    // ──────── getFriendProjects ────────

    @Test
    fun `getFriendProjects delegates to service with both user ids`() {
        whenever(service.getFriendPublicProjects(USER_ID, FRIEND_ID)).thenReturn(listOf(makeProjectDto()))

        val result = controller.getFriendProjects(FRIEND_ID)

        verify(service).getFriendPublicProjects(USER_ID, FRIEND_ID)
        assertEquals(1, result.size)
    }

    // ──────── getFriendProject ────────

    @Test
    fun `getFriendProject delegates to service with both user ids and project id`() {
        whenever(service.getFriendProject(USER_ID, FRIEND_ID, 5L)).thenReturn(makeProjectDto(id = 5L))

        val result = controller.getFriendProject(FRIEND_ID, 5L)

        verify(service).getFriendProject(USER_ID, FRIEND_ID, 5L)
        assertEquals(5L, result.id)
    }
}
