package com.stitchbud.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.model.Friendship
import com.stitchbud.model.FriendshipStatus
import com.stitchbud.model.UserProfile
import com.stitchbud.repository.FriendshipRepository
import com.stitchbud.repository.ProjectRepository
import com.stitchbud.repository.UserProfileRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import kotlin.test.assertEquals

class FriendshipProfileServiceTest {

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

    // ──────── upsertProfile ────────

    @Test
    fun `upsertProfile creates new profile when none exists`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.empty())
        whenever(userProfileRepo.save(any<UserProfile>())).thenReturn(UserProfile(userId = USER_A, email = EMAIL_A, displayName = "Alice"))

        val result = service.upsertProfile(USER_A, EMAIL_A, "Alice")

        assertEquals(USER_A, result.userId)
        assertEquals(EMAIL_A, result.email)
        assertEquals("Alice", result.displayName)
    }

    @Test
    fun `upsertProfile updates email and displayName on existing profile`() {
        val existing = UserProfile(userId = USER_A, email = "old@test.com", displayName = "Old")
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(existing))
        whenever(userProfileRepo.save(any<UserProfile>())).doAnswer { it.arguments[0] as UserProfile }

        val result = service.upsertProfile(USER_A, EMAIL_A, "New Name")

        assertEquals(EMAIL_A, result.email)
        assertEquals("New Name", result.displayName)
    }

    @Test
    fun `upsertProfile preserves existing displayName when null is passed`() {
        val existing = UserProfile(userId = USER_A, email = EMAIL_A, displayName = "Preserved")
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(existing))
        whenever(userProfileRepo.save(any<UserProfile>())).doAnswer { it.arguments[0] as UserProfile }

        assertEquals("Preserved", service.upsertProfile(USER_A, EMAIL_A, null).displayName)
    }

    // ──────── sendFriendRequest ────────

    @Test
    fun `sendFriendRequest throws BadRequest when requester profile not registered`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.empty())

        assertThrows<BadRequestException> { service.sendFriendRequest(USER_A, EMAIL_B) }
    }

    @Test
    fun `sendFriendRequest throws BadRequest when sending to own email`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A)))

        assertThrows<BadRequestException> { service.sendFriendRequest(USER_A, EMAIL_A) }
    }

    @Test
    fun `sendFriendRequest is case-insensitive for self-check`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A)))

        assertThrows<BadRequestException> { service.sendFriendRequest(USER_A, EMAIL_A.uppercase()) }
    }

    @Test
    fun `sendFriendRequest throws NotFoundException when target user not found`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A)))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> { service.sendFriendRequest(USER_A, EMAIL_B) }
    }

    @Test
    fun `sendFriendRequest throws BadRequest when already friends`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A)))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(UserProfile(userId = USER_B, email = EMAIL_B)))
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        ))

        assertThrows<BadRequestException> { service.sendFriendRequest(USER_A, EMAIL_B) }
    }

    @Test
    fun `sendFriendRequest throws BadRequest when request already sent by same user`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A)))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(UserProfile(userId = USER_B, email = EMAIL_B)))
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(
            Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        ))

        assertThrows<BadRequestException> { service.sendFriendRequest(USER_A, EMAIL_B) }
    }

    @Test
    fun `sendFriendRequest auto-accepts when target already sent a request to requester`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A)))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(UserProfile(userId = USER_B, email = EMAIL_B)))
        val existing = Friendship(id = 1L, requesterId = USER_B, recipientId = USER_A, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(existing))
        whenever(friendshipRepo.save(existing)).thenReturn(existing)

        val result = service.sendFriendRequest(USER_A, EMAIL_B)

        assertEquals(FriendshipStatus.ACCEPTED, existing.status)
        assertEquals(USER_B, result.userId)
    }

    @Test
    fun `sendFriendRequest creates new pending friendship when none exists`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A)))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(UserProfile(userId = USER_B, email = EMAIL_B)))
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.empty())
        whenever(friendshipRepo.save(any<Friendship>())).thenReturn(
            Friendship(id = 5L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        )

        val result = service.sendFriendRequest(USER_A, EMAIL_B)

        assertEquals(USER_B, result.userId)
        assertEquals(5L, result.friendshipId)
    }

    // ──────── acceptFriendRequest ────────

    @Test
    fun `acceptFriendRequest throws NotFoundException when friendship not found`() {
        whenever(friendshipRepo.findById(99L)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> { service.acceptFriendRequest(99L, USER_A) }
    }

    @Test
    fun `acceptFriendRequest throws BadRequest when user is not the recipient`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        assertThrows<BadRequestException> { service.acceptFriendRequest(1L, USER_A) }
    }

    @Test
    fun `acceptFriendRequest throws BadRequest when already accepted`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        assertThrows<BadRequestException> { service.acceptFriendRequest(1L, USER_B) }
    }

    @Test
    fun `acceptFriendRequest sets status to ACCEPTED and returns FriendDto`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))
        whenever(friendshipRepo.save(f)).thenReturn(f)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(UserProfile(userId = USER_A, email = EMAIL_A, displayName = "Alice")))

        val result = service.acceptFriendRequest(1L, USER_B)

        assertEquals(FriendshipStatus.ACCEPTED, f.status)
        assertEquals(USER_A, result.userId)
        assertEquals("Alice", result.displayName)
        assertEquals(EMAIL_A, result.email)
    }

    // ──────── removeFriendship ────────

    @Test
    fun `removeFriendship throws NotFoundException when not found`() {
        whenever(friendshipRepo.findById(99L)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> { service.removeFriendship(99L, USER_A) }
    }

    @Test
    fun `removeFriendship throws BadRequest when user is not involved`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        assertThrows<BadRequestException> { service.removeFriendship(1L, "uninvolved-user") }
    }

    @Test
    fun `removeFriendship deletes when called by requester`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        service.removeFriendship(1L, USER_A)

        verify(friendshipRepo).deleteById(1L)
    }

    @Test
    fun `removeFriendship deletes when called by recipient`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        service.removeFriendship(1L, USER_B)

        verify(friendshipRepo).deleteById(1L)
    }
}
