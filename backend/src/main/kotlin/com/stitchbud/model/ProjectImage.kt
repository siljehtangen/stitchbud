package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.OnDelete
import org.hibernate.annotations.OnDeleteAction

@Entity
@Table(name = "project_images")
class ProjectImage(
    var storedName: String = "",
    var originalName: String = "",
    var section: String = "cover",
    var materialId: Long? = null,
    var isMain: Boolean = false,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    var project: Project? = null
) : BaseEntity() {
    companion object {
        const val COVER = "cover"
        const val MATERIAL = "material"
    }
}
