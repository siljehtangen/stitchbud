package com.stitchbud.repository

import com.stitchbud.model.ProjectImage
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectImageRepository : JpaRepository<ProjectImage, Long>
