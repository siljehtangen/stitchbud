package com.stitchbud.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.model.Friendship
import com.stitchbud.model.FriendshipStatus
import com.stitchbud.model.Project
import com.stitchbud.model.ProjectCategory
import com.stitchbud.model.UserProfile
import com.stitchbud.repository.FriendshipRepository
import com.stitchbud.repository.ProjectRepository
import com.stitchbud.repository.UserProfileRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FriendshipQueryServiceTest {

    private val friendshipRepo: FriendshipRepository = mock()
    private val userProfileRepo: UserProfileRepository = mock()
    private val projectRepo: ProjectRepository = mock()

    private lateinit var service: FriendshipService

    companion object {
        const val USER_A = "user-a"
        const val USER_B = "user-b"
        const val EMAIL_A = "a@test.com"
        const val EMAIL_B = "b@test.com"
    }

    @BeforeEach
    fun setUp() {
        service = FriendshipService(friendshipRepo, userProfileRepo, projectRepo, ProjectMapper(jacksonObjectMapper()))
    }

    // ──────── getFriends ────────

    @Test
    fun `getFriends returns empty list when user has no accepted friendships`() {
        whenever(friendshipRepo.findAcceptedFriendships(USER_A)).thenReturn(emptyList())

        assertTrue(service.getFriends(USER_A).isEmpty())
    }

    @Test
    fun `getFriends resolves friend ID from both sides of the friendship`() {
        val f1 = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        val f2 = Friendship(id = 2L, requesterId = "user-c", recipientId = USER_A, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findAcceptedFriendships(USER_A)).thenReturn(listOf(f1, f2))
        whenever(userProfileRepo.findById(USER_B)).thenReturn(Optional.of(UserProfile(USER_B, EMAIL_B)))
        whenever(userProfileRepo.findById("user-c")).thenReturn(Optional.of(UserProfile("user-c", "c@test.com")))

        val result = service.getFriends(USER_A)

        assertEquals(2, result.size)
        assertEquals(USER_B, result[0].userId)
        assertEquals("user-c", result[1].userId)
    }

    // ──────── getPendingRequests ────────

    @Test
    fun `getPendingRequests returns empty list when there are no pending requests`() {
        whenever(friendshipRepo.findByRecipientIdAndStatus(USER_A, FriendshipStatus.PENDING)).thenReturn(emptyList())

        assertTrue(service.getPendingRequests(USER_A).isEmpty())
    }

    @Test
    fun `getPendingRequests returns all pending incoming requests`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findByRecipientIdAndStatus(USER_B, FriendshipStatus.PENDING)).thenReturn(listOf(f))
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(USER_A, EMAIL_A, "Alice")))

        val result = service.getPendingRequests(USER_B)

        assertEquals(1, result.size)
        assertEquals(USER_A, result[0].requesterId)
        assertEquals("Alice", result[0].requesterDisplayName)
    }

    // ──────── getFriendPublicProjects / verifyFriendship ────────

    @Test
    fun `getFriendPublicProjects throws BadRequest when no friendship exists`() {
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.empty())

        assertThrows<BadRequestException> { service.getFriendPublicProjects(USER_A, USER_B) }
    }

    @Test
    fun `getFriendPublicProjects throws BadRequest when friendship is still pending`() {
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        ))

        assertThrows<BadRequestException> { service.getFriendPublicProjects(USER_A, USER_B) }
    }

    @Test
    fun `getFriendPublicProjects returns projects when friendship is accepted`() {
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        ))
        whenever(projectRepo.findPublicProjectsByUserId(USER_B)).thenReturn(emptyList())

        assertTrue(service.getFriendPublicProjects(USER_A, USER_B).isEmpty())
    }

    // ──────── getFriendProject ────────

    @Test
    fun `getFriendProject throws NotFoundException when project not found`() {
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        ))
        whenever(projectRepo.findById(10L)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> { service.getFriendProject(USER_A, USER_B, 10L) }
    }

    @Test
    fun `getFriendProject throws NotFoundException when project belongs to different user`() {
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        ))
        whenever(projectRepo.findById(10L)).thenReturn(Optional.of(
            Project(id = 10L, userId = "someone-else", name = "Other", category = ProjectCategory.KNITTING, isPublic = true)
        ))

        assertThrows<NotFoundException> { service.getFriendProject(USER_A, USER_B, 10L) }
    }

    @Test
    fun `getFriendProject throws BadRequest when project is not public`() {
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        ))
        whenever(projectRepo.findById(10L)).thenReturn(Optional.of(
            Project(id = 10L, userId = USER_B, name = "Secret", category = ProjectCategory.KNITTING, isPublic = false)
        ))

        assertThrows<BadRequestException> { service.getFriendProject(USER_A, USER_B, 10L) }
    }

    @Test
    fun `getFriendProject returns dto when project is public and friendship is accepted`() {
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        ))
        whenever(projectRepo.findById(10L)).thenReturn(Optional.of(
            Project(id = 10L, userId = USER_B, name = "Public Project", category = ProjectCategory.KNITTING, isPublic = true)
        ))

        val result = service.getFriendProject(USER_A, USER_B, 10L)

        assertEquals(10L, result.id)
        assertEquals("Public Project", result.name)
        assertTrue(result.isPublic)
    }
}
