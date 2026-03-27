package com.stitchbud.repository

import com.stitchbud.model.ProjectFile
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectFileRepository : JpaRepository<ProjectFile, Long>
