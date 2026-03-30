package com.stitchbud.repository

import com.stitchbud.model.Project
import com.stitchbud.model.ProjectCategory
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional

interface ProjectRepository : JpaRepository<Project, Long> {
    fun findByUserIdOrderByUpdatedAtDesc(userId: String): List<Project>
    fun findByUserIdAndCategory(userId: String, category: ProjectCategory): List<Project>
    fun findByIdAndUserId(id: Long, userId: String): Optional<Project>
}
