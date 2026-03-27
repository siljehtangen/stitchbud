package com.stitchbud.repository

import com.stitchbud.model.Material
import org.springframework.data.jpa.repository.JpaRepository

interface MaterialRepository : JpaRepository<Material, Long>
