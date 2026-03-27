package com.stitchbook.model

import jakarta.persistence.*

@Entity
@Table(name = "projects")
data class Project(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var name: String,
    var description: String = "",
    @Enumerated(EnumType.STRING)
    var category: ProjectCategory,
    var tags: String = "",
    var imageUrl: String? = null,
    var notes: String = "",
    var recipeText: String = "",
    @Column(columnDefinition = "TEXT")
    var craftDetails: String = "{}",
    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var materials: MutableList<Material> = mutableListOf(),
    @OneToMany(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var files: MutableList<ProjectFile> = mutableListOf(),
    @OneToOne(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var rowCounter: RowCounter? = null,
    @OneToOne(mappedBy = "project", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var patternGrid: PatternGrid? = null,
    var createdAt: Long = System.currentTimeMillis(),
    var updatedAt: Long = System.currentTimeMillis()
)

enum class ProjectCategory { KNITTING, CROCHET, SEWING }
