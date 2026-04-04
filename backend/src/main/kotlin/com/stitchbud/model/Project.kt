package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.BatchSize

@Entity
@Table(
    name = "projects",
    indexes = [
        Index(name = "idx_projects_user_id", columnList = "userId"),
        Index(name = "idx_projects_user_updated", columnList = "userId, updatedAt"),
    ]
)
data class Project(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var userId: String = "",
    var name: String,
    var description: String = "",
    @Enumerated(EnumType.STRING)
    var category: ProjectCategory,
    var tags: String = "",
    var notes: String = "",
    var recipeText: String = "",
    @Column(columnDefinition = "TEXT")
    var craftDetails: String = "{}",
    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    var materials: MutableList<Material> = mutableListOf(),
    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    var files: MutableList<ProjectFile> = mutableListOf(),
    @OneToOne(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    var rowCounter: RowCounter? = null,
    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    var patternGrids: MutableList<PatternGrid> = mutableListOf(),
    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    var images: MutableList<ProjectImage> = mutableListOf(),
    var startDate: Long? = null,
    var endDate: Long? = null,
    var createdAt: Long = System.currentTimeMillis(),
    var updatedAt: Long = System.currentTimeMillis()
)

enum class ProjectCategory { KNITTING, CROCHET, SEWING }
