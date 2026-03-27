package com.stitchbud.repository

import com.stitchbud.model.Project
import com.stitchbud.model.ProjectCategory
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<Project, Long> {
    fun findByCategory(category: ProjectCategory): List<Project>
    fun findByOrderByUpdatedAtDesc(): List<Project>
}
