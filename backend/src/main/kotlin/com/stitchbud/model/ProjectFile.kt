package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.OnDelete
import org.hibernate.annotations.OnDeleteAction

@Entity
@Table(name = "project_files")
class ProjectFile(
    var originalName: String = "",
    var storedName: String = "",
    var mimeType: String = "application/octet-stream",
    var fileType: String = "other",
    var uploadedAt: Long = System.currentTimeMillis(),
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    var project: Project? = null
) : BaseEntity()
