package com.stitchbud.repository

import com.stitchbud.model.UserProfile
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface UserProfileRepository : JpaRepository<UserProfile, String> {
    fun findByEmail(email: String): Optional<UserProfile>
}
