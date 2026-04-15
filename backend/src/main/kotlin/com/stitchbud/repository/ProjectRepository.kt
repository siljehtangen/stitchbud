package com.stitchbud.repository

import com.stitchbud.model.Project
import com.stitchbud.model.ProjectCategory
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.util.Optional

interface ProjectRepository : JpaRepository<Project, Long> {
    fun findByUserIdOrderByUpdatedAtDesc(userId: String): List<Project>
    fun findByUserIdAndCategory(userId: String, category: ProjectCategory): List<Project>
    fun findByIdAndUserId(id: Long, userId: String): Optional<Project>

    @Query("SELECT p FROM Project p WHERE p.userId = :userId AND p.isPublic = true ORDER BY p.updatedAt DESC")
    fun findPublicProjectsByUserId(userId: String): List<Project>

    @Modifying
    @Query("DELETE FROM Project p WHERE p.userId = :userId")
    fun deleteAllByUserId(userId: String)
}
