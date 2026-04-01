package com.stitchbud.model

import jakarta.persistence.*

@Entity
@Table(name = "project_images")
data class ProjectImage(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var storedName: String = "",
    var originalName: String = "",
    var section: String = "cover",  // "cover" | "material"
    var materialId: Long? = null,
    var isMain: Boolean = false,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    var project: Project? = null
)
