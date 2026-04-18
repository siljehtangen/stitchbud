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
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class FriendshipServiceTest {

    private val friendshipRepo: FriendshipRepository = mock()
    private val userProfileRepo: UserProfileRepository = mock()
    private val projectRepo: ProjectRepository = mock()
    private val objectMapper = jacksonObjectMapper()

    private lateinit var service: FriendshipService

    companion object {
        const val USER_A = "user-a"
        const val USER_B = "user-b"
        const val EMAIL_A = "a@test.com"
        const val EMAIL_B = "b@test.com"
    }

    @BeforeEach
    fun setUp() {
        service = FriendshipService(friendshipRepo, userProfileRepo, projectRepo, objectMapper)
    }

    // ──────── upsertProfile ────────

    @Test
    fun `upsertProfile creates new profile when none exists`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.empty())
        val savedProfile = UserProfile(userId = USER_A, email = EMAIL_A, displayName = "Alice")
        whenever(userProfileRepo.save(any<UserProfile>())).thenReturn(savedProfile)

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

        val result = service.upsertProfile(USER_A, EMAIL_A, null)

        assertEquals("Preserved", result.displayName)
    }

    // ──────── sendFriendRequest ────────

    @Test
    fun `sendFriendRequest throws BadRequest when requester profile not registered`() {
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.empty())

        assertThrows<BadRequestException> {
            service.sendFriendRequest(USER_A, EMAIL_B)
        }
    }

    @Test
    fun `sendFriendRequest throws BadRequest when sending to own email`() {
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))

        assertThrows<BadRequestException> {
            service.sendFriendRequest(USER_A, EMAIL_A)
        }
    }

    @Test
    fun `sendFriendRequest is case-insensitive for self-check`() {
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))

        assertThrows<BadRequestException> {
            service.sendFriendRequest(USER_A, EMAIL_A.uppercase())
        }
    }

    @Test
    fun `sendFriendRequest throws NotFoundException when target user not found`() {
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> {
            service.sendFriendRequest(USER_A, EMAIL_B)
        }
    }

    @Test
    fun `sendFriendRequest throws BadRequest when already friends`() {
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A)
        val profileB = UserProfile(userId = USER_B, email = EMAIL_B)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(profileB))
        val existing = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(existing))

        assertThrows<BadRequestException> {
            service.sendFriendRequest(USER_A, EMAIL_B)
        }
    }

    @Test
    fun `sendFriendRequest throws BadRequest when request already sent by same user`() {
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A)
        val profileB = UserProfile(userId = USER_B, email = EMAIL_B)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(profileB))
        // USER_A already sent a pending request to USER_B
        val existing = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(existing))

        assertThrows<BadRequestException> {
            service.sendFriendRequest(USER_A, EMAIL_B)
        }
    }

    @Test
    fun `sendFriendRequest auto-accepts when target already sent a request to requester`() {
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A)
        val profileB = UserProfile(userId = USER_B, email = EMAIL_B)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(profileB))
        // USER_B sent a pending request to USER_A; now USER_A sends to USER_B → auto-accept
        val existing = Friendship(id = 1L, requesterId = USER_B, recipientId = USER_A, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(existing))
        whenever(friendshipRepo.save(existing)).thenReturn(existing)

        val result = service.sendFriendRequest(USER_A, EMAIL_B)

        assertEquals(FriendshipStatus.ACCEPTED, existing.status)
        assertEquals(USER_B, result.userId)
    }

    @Test
    fun `sendFriendRequest creates new pending friendship when none exists`() {
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A)
        val profileB = UserProfile(userId = USER_B, email = EMAIL_B)
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))
        whenever(userProfileRepo.findByEmail(EMAIL_B)).thenReturn(Optional.of(profileB))
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.empty())
        val saved = Friendship(id = 5L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.save(any<Friendship>())).thenReturn(saved)

        val result = service.sendFriendRequest(USER_A, EMAIL_B)

        assertEquals(USER_B, result.userId)
        assertEquals(5L, result.friendshipId)
    }

    // ──────── acceptFriendRequest ────────

    @Test
    fun `acceptFriendRequest throws NotFoundException when friendship not found`() {
        whenever(friendshipRepo.findById(99L)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> {
            service.acceptFriendRequest(99L, USER_A)
        }
    }

    @Test
    fun `acceptFriendRequest throws BadRequest when user is not the recipient`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        // USER_A is the requester, not the recipient — cannot accept own request
        assertThrows<BadRequestException> {
            service.acceptFriendRequest(1L, USER_A)
        }
    }

    @Test
    fun `acceptFriendRequest throws BadRequest when already accepted`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        assertThrows<BadRequestException> {
            service.acceptFriendRequest(1L, USER_B)
        }
    }

    @Test
    fun `acceptFriendRequest sets status to ACCEPTED and returns FriendDto`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))
        whenever(friendshipRepo.save(f)).thenReturn(f)
        val profileA = UserProfile(userId = USER_A, email = EMAIL_A, displayName = "Alice")
        whenever(userProfileRepo.findById(USER_A)).thenReturn(Optional.of(profileA))

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

        assertThrows<NotFoundException> {
            service.removeFriendship(99L, USER_A)
        }
    }

    @Test
    fun `removeFriendship throws BadRequest when user is not involved`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B)
        whenever(friendshipRepo.findById(1L)).thenReturn(Optional.of(f))

        assertThrows<BadRequestException> {
            service.removeFriendship(1L, "uninvolved-user")
        }
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

    // ──────── getFriends ────────

    @Test
    fun `getFriends resolves friend ID from both sides of the friendship`() {
        val f1 = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        val f2 = Friendship(id = 2L, requesterId = "user-c", recipientId = USER_A, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findAcceptedFriendships(USER_A)).thenReturn(listOf(f1, f2))
        whenever(userProfileRepo.findById(USER_B)).thenReturn(Optional.of(UserProfile(USER_B, EMAIL_B)))
        whenever(userProfileRepo.findById("user-c")).thenReturn(Optional.of(UserProfile("user-c", "c@test.com")))

        val result = service.getFriends(USER_A)

        assertEquals(2, result.size)
        assertEquals(USER_B, result[0].userId)    // USER_A was requester → friend is recipient
        assertEquals("user-c", result[1].userId)  // USER_A was recipient → friend is requester
    }

    // ──────── getPendingRequests ────────

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

        assertThrows<BadRequestException> {
            service.getFriendPublicProjects(USER_A, USER_B)
        }
    }

    @Test
    fun `getFriendPublicProjects throws BadRequest when friendship is still pending`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.PENDING)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(f))

        assertThrows<BadRequestException> {
            service.getFriendPublicProjects(USER_A, USER_B)
        }
    }

    @Test
    fun `getFriendPublicProjects returns projects when friendship is accepted`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(f))
        whenever(projectRepo.findPublicProjectsByUserId(USER_B)).thenReturn(emptyList())

        val result = service.getFriendPublicProjects(USER_A, USER_B)

        assertTrue(result.isEmpty())
    }

    // ──────── getFriendProject ────────

    @Test
    fun `getFriendProject throws NotFoundException when project belongs to different user`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(f))
        val project = Project(id = 10L, userId = "someone-else", name = "Other", category = ProjectCategory.KNITTING, isPublic = true)
        whenever(projectRepo.findById(10L)).thenReturn(Optional.of(project))

        assertThrows<NotFoundException> {
            service.getFriendProject(USER_A, USER_B, 10L)
        }
    }

    @Test
    fun `getFriendProject throws BadRequest when project is not public`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(f))
        val project = Project(id = 10L, userId = USER_B, name = "Secret", category = ProjectCategory.KNITTING, isPublic = false)
        whenever(projectRepo.findById(10L)).thenReturn(Optional.of(project))

        assertThrows<BadRequestException> {
            service.getFriendProject(USER_A, USER_B, 10L)
        }
    }

    @Test
    fun `getFriendProject throws NotFoundException when project not found`() {
        val f = Friendship(id = 1L, requesterId = USER_A, recipientId = USER_B, status = FriendshipStatus.ACCEPTED)
        whenever(friendshipRepo.findBetween(USER_A, USER_B)).thenReturn(Optional.of(f))
        whenever(projectRepo.findById(10L)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> {
            service.getFriendProject(USER_A, USER_B, 10L)
        }
    }
}
