package com.stitchbud.service

import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.*
import com.stitchbud.model.Friendship
import com.stitchbud.model.FriendshipStatus
import com.stitchbud.model.UserProfile
import com.stitchbud.repository.FriendshipRepository
import com.stitchbud.repository.ProjectRepository
import com.stitchbud.repository.UserProfileRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class FriendshipService(
    private val friendshipRepository: FriendshipRepository,
    private val userProfileRepository: UserProfileRepository,
    private val projectRepository: ProjectRepository,
    private val projectMapper: ProjectMapper
) {
    fun upsertProfile(userId: String, email: String, displayName: String?): UserProfileDto {
        val profile = userProfileRepository.findById(userId).orElse(
            UserProfile(userId = userId, email = email)
        )
        profile.email = email
        if (displayName != null) profile.displayName = displayName
        profile.updatedAt = System.currentTimeMillis()
        val saved = userProfileRepository.save(profile)
        return UserProfileDto(saved.userId, saved.email, saved.displayName)
    }

    fun sendFriendRequest(requesterId: String, targetEmail: String): FriendDto {
        val requester = userProfileRepository.findById(requesterId)
            .orElseThrow { BadRequestException("Profile not found. Please try again.") }

        if (requester.email.equals(targetEmail, ignoreCase = true))
            throw BadRequestException("You cannot add yourself as a friend.")

        val target = userProfileRepository.findByEmail(targetEmail)
            .orElseThrow { NotFoundException("No user found with email $targetEmail") }

        val existing = friendshipRepository.findBetween(requesterId, target.userId)
        if (existing.isPresent) {
            val f = existing.get()
            if (f.status == FriendshipStatus.ACCEPTED) throw BadRequestException("You are already friends.")
            if (f.requesterId == requesterId) throw BadRequestException("You have already sent a friend request to this person.")
            // The other person sent a request to us — auto-accept
            f.status = FriendshipStatus.ACCEPTED
            friendshipRepository.save(f)
            return FriendDto(f.id, target.userId, target.displayName, target.email)
        }

        val friendship = Friendship(requesterId = requesterId, recipientId = target.userId)
        val saved = friendshipRepository.save(friendship)
        return FriendDto(saved.id, target.userId, target.displayName, target.email)
    }

    @Transactional(readOnly = true)
    fun getFriends(userId: String): List<FriendDto> {
        return friendshipRepository.findAcceptedFriendships(userId).map { f ->
            val friendId = if (f.requesterId == userId) f.recipientId else f.requesterId
            val profile = userProfileRepository.findById(friendId).orElse(null)
            FriendDto(f.id, friendId, profile?.displayName, profile?.email ?: "")
        }
    }

    @Transactional(readOnly = true)
    fun getPendingRequests(userId: String): List<FriendRequestDto> {
        return friendshipRepository.findByRecipientIdAndStatus(userId, FriendshipStatus.PENDING).map { f ->
            val profile = userProfileRepository.findById(f.requesterId).orElse(null)
            FriendRequestDto(f.id, f.requesterId, profile?.displayName, profile?.email ?: "", f.createdAt)
        }
    }

    fun acceptFriendRequest(friendshipId: Long, userId: String): FriendDto {
        val friendship = friendshipRepository.findById(friendshipId)
            .orElseThrow { NotFoundException("Friend request not found.") }
        if (friendship.recipientId != userId) throw BadRequestException("You cannot accept this request.")
        if (friendship.status == FriendshipStatus.ACCEPTED) throw BadRequestException("Already accepted.")
        friendship.status = FriendshipStatus.ACCEPTED
        friendshipRepository.save(friendship)
        val profile = userProfileRepository.findById(friendship.requesterId).orElse(null)
        return FriendDto(friendship.id, friendship.requesterId, profile?.displayName, profile?.email ?: "")
    }

    fun removeFriendship(friendshipId: Long, userId: String) {
        val friendship = friendshipRepository.findById(friendshipId)
            .orElseThrow { NotFoundException("Friendship not found.") }
        if (friendship.requesterId != userId && friendship.recipientId != userId)
            throw BadRequestException("Access denied.")
        friendshipRepository.deleteById(friendshipId)
    }

    @Transactional(readOnly = true)
    fun getFriendPublicProjects(requesterId: String, friendUserId: String): List<ProjectDto> {
        verifyFriendship(requesterId, friendUserId)
        return projectRepository.findPublicProjectsByUserId(friendUserId).map { projectMapper.toDto(it, includeNotes = false) }
    }

    @Transactional(readOnly = true)
    fun getFriendProject(requesterId: String, friendUserId: String, projectId: Long): ProjectDto {
        verifyFriendship(requesterId, friendUserId)
        val project = projectRepository.findById(projectId)
            .orElseThrow { NotFoundException("Project not found.") }
        if (project.userId != friendUserId) throw NotFoundException("Project not found.")
        if (!project.isPublic) throw BadRequestException("This project is not public.")
        return projectMapper.toDto(project, includeNotes = false)
    }

    private fun verifyFriendship(requesterId: String, friendUserId: String) {
        val friendship = friendshipRepository.findBetween(requesterId, friendUserId)
            .orElseThrow { BadRequestException("You are not friends.") }
        if (friendship.status != FriendshipStatus.ACCEPTED) throw BadRequestException("Friendship is not accepted.")
    }
}
