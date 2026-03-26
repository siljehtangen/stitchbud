package com.stitchbook.repository

import com.stitchbook.model.Material
import org.springframework.data.jpa.repository.JpaRepository

interface MaterialRepository : JpaRepository<Material, Long>
