package com.stitchbud.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.*
import com.stitchbud.model.Friendship
import com.stitchbud.model.FriendshipStatus
import com.stitchbud.model.ProjectImage
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
    private val objectMapper: ObjectMapper
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
            .orElseThrow { BadRequestException("Profilen din er ikke registrert. Prøv igjen.") }

        if (requester.email.equals(targetEmail, ignoreCase = true))
            throw BadRequestException("Du kan ikke legge til deg selv som venn.")

        val target = userProfileRepository.findByEmail(targetEmail)
            .orElseThrow { NotFoundException("Ingen bruker funnet med e-posten $targetEmail") }

        val existing = friendshipRepository.findBetween(requesterId, target.userId)
        if (existing.isPresent) {
            val f = existing.get()
            if (f.status == FriendshipStatus.ACCEPTED) throw BadRequestException("Dere er allerede venner.")
            if (f.requesterId == requesterId) throw BadRequestException("Du har allerede sendt en venneforespørsel til denne personen.")
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
            .orElseThrow { NotFoundException("Venneforespørselen finnes ikke.") }
        if (friendship.recipientId != userId) throw BadRequestException("Du kan ikke godta denne forespørselen.")
        if (friendship.status == FriendshipStatus.ACCEPTED) throw BadRequestException("Allerede akseptert.")
        friendship.status = FriendshipStatus.ACCEPTED
        friendshipRepository.save(friendship)
        val profile = userProfileRepository.findById(friendship.requesterId).orElse(null)
        return FriendDto(friendship.id, friendship.requesterId, profile?.displayName, profile?.email ?: "")
    }

    fun removeFriendship(friendshipId: Long, userId: String) {
        val friendship = friendshipRepository.findById(friendshipId)
            .orElseThrow { NotFoundException("Vennskapet finnes ikke.") }
        if (friendship.requesterId != userId && friendship.recipientId != userId)
            throw BadRequestException("Du har ikke tilgang.")
        friendshipRepository.deleteById(friendshipId)
    }

    @Transactional(readOnly = true)
    fun getFriendPublicProjects(requesterId: String, friendUserId: String): List<ProjectDto> {
        verifyFriendship(requesterId, friendUserId)
        return projectRepository.findPublicProjectsByUserId(friendUserId).map { it.toPublicDto() }
    }

    @Transactional(readOnly = true)
    fun getFriendProject(requesterId: String, friendUserId: String, projectId: Long): ProjectDto {
        verifyFriendship(requesterId, friendUserId)
        val project = projectRepository.findById(projectId)
            .orElseThrow { NotFoundException("Prosjektet finnes ikke.") }
        if (project.userId != friendUserId) throw NotFoundException("Prosjektet finnes ikke.")
        if (!project.isPublic) throw BadRequestException("Prosjektet er ikke offentlig.")
        return project.toPublicDto()
    }

    private fun verifyFriendship(requesterId: String, friendUserId: String) {
        val friendship = friendshipRepository.findBetween(requesterId, friendUserId)
            .orElseThrow { BadRequestException("Dere er ikke venner.") }
        if (friendship.status != FriendshipStatus.ACCEPTED) throw BadRequestException("Vennskapet er ikke akseptert.")
    }

    private fun com.stitchbud.model.Project.toPublicDto(): ProjectDto {
        fun toImgDto(img: ProjectImage) =
            ProjectImageDto(img.id, img.storedName, img.originalName, img.section, img.materialId, img.isMain, id)
        val coverImages = images.filter { it.section == "cover" }.sortedBy { it.id }.map(::toImgDto)
        val materialImagesByMatId = images.filter { it.section == "material" }.groupBy { it.materialId }
        return ProjectDto(
            id = id, name = name, description = description, category = category,
            tags = tags, notes = "", recipeText = recipeText,
            pinterestBoardUrls = runCatching { objectMapper.readValue<List<String>>(pinterestBoardUrls) }.getOrDefault(emptyList()),
            craftDetails = craftDetails,
            coverImages = coverImages,
            materials = materials.map { m ->
                val matImages = (materialImagesByMatId[m.id] ?: emptyList()).sortedBy { it.id }
                MaterialDto(m.id, m.name, m.type, m.itemType, m.color, m.colorHex, m.amount, m.unit,
                    images = matImages.map(::toImgDto))
            },
            files = files.map { ProjectFileDto(it.id, it.originalName, it.storedName, it.mimeType, it.fileType, it.uploadedAt, id) },
            rowCounter = rowCounter?.let { RowCounterDto(it.id, it.stitchesPerRound, it.totalRounds, it.checkedStitches) },
            patternGrids = patternGrids.sortedBy { it.id }.map { PatternGridDto(it.id, it.rows, it.cols, it.cellData) },
            startDate = startDate, endDate = endDate,
            isPublic = isPublic,
            createdAt = createdAt, updatedAt = updatedAt,
            userId = userId
        )
    }
}
