package com.stitchbud.repository

import com.stitchbud.model.UserProfile
import org.springframework.data.jpa.repository.JpaRepository

interface UserProfileRepository : JpaRepository<UserProfile, String> {
    fun findByEmail(email: String): UserProfile?
}
