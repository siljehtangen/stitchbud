package com.stitchbud.repository

import com.stitchbud.model.Friendship
import com.stitchbud.model.FriendshipStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.Optional

interface FriendshipRepository : JpaRepository<Friendship, Long> {
    // All accepted friendships for a user (either side)
    @Query("SELECT f FROM Friendship f WHERE (f.requesterId = :userId OR f.recipientId = :userId) AND f.status = 'ACCEPTED'")
    fun findAcceptedFriendships(userId: String): List<Friendship>

    // Pending requests sent TO a user
    fun findByRecipientIdAndStatus(recipientId: String, status: FriendshipStatus): List<Friendship>

    // Check if a friendship already exists between two users (either direction)
    @Query("SELECT f FROM Friendship f WHERE (f.requesterId = :a AND f.recipientId = :b) OR (f.requesterId = :b AND f.recipientId = :a)")
    fun findBetween(a: String, b: String): Optional<Friendship>
}
