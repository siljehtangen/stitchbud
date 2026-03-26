package com.stitchbook.repository

import com.stitchbook.model.ProjectFile
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectFileRepository : JpaRepository<ProjectFile, Long>
