package com.stitchbook.model

import jakarta.persistence.*

@Entity
@Table(name = "materials")
data class Material(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var type: String,
    var color: String = "",
    var colorHex: String = "#000000",
    var amount: String = "",
    var unit: String = "g",
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    var project: Project? = null
)
