package com.stitchbud.dto

data class FriendDto(
    val friendshipId: Long,
    val userId: String,
    val displayName: String?,
    val email: String
)

data class FriendRequestDto(
    val friendshipId: Long,
    val requesterId: String,
    val requesterDisplayName: String?,
    val requesterEmail: String,
    val createdAt: Long
)

data class SendFriendRequestBody(
    val email: String
)

data class UserProfileDto(
    val userId: String,
    val email: String,
    val displayName: String?
)
