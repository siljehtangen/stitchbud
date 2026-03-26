package com.stitchbook.repository

import com.stitchbook.model.Project
import com.stitchbook.model.ProjectCategory
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<Project, Long> {
    fun findByCategory(category: ProjectCategory): List<Project>
    fun findByOrderByUpdatedAtDesc(): List<Project>
}
