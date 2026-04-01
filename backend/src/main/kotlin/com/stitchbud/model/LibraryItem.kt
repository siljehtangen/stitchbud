package com.stitchbud.model

import jakarta.persistence.*

@Entity
@Table(name = "library_items")
data class LibraryItem(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var userId: String = "",
    var itemType: String = "",
    var name: String = "",
    var imageStoredName: String? = null,
    var imageUrl: String? = null,
    // Yarn
    var yarnMaterial: String? = null,
    var yarnBrand: String? = null,
    var yarnAmountG: Int? = null,
    var yarnAmountM: Int? = null,
    // Fabric
    var fabricWidthCm: Int? = null,
    var fabricLengthCm: Int? = null,
    // Knitting needle
    var needleSizeMm: String? = null,
    var circularLengthCm: Int? = null,
    // Crochet hook
    var hookSizeMm: String? = null,
    // Colors (comma-separated list, applicable for YARN and FABRIC)
    var colors: String? = null,
    var createdAt: Long = System.currentTimeMillis()
)
