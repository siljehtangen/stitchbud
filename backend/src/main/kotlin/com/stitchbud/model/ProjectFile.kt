package com.stitchbud.model

import jakarta.persistence.*

@Entity
@Table(name = "project_files")
data class ProjectFile(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var originalName: String = "",
    var storedName: String = "",
    var mimeType: String = "application/octet-stream",
    var fileType: String = "other",
    var uploadedAt: Long = System.currentTimeMillis(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    var project: Project? = null
)
