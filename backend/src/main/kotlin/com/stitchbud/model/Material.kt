package com.stitchbud.model

import jakarta.persistence.*

@Entity
@Table(name = "materials")
data class Material(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var name: String,
    var type: String,
    var itemType: String? = null,
    var color: String = "",
    var colorHex: String = "#000000",
    var amount: String = "",
    var unit: String = "g",
    var imageUrl: String? = null,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    var project: Project? = null
)
