package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.BatchSize

@Entity
@Table(
    name = "library_items",
    indexes = [
        Index(name = "idx_library_items_user_id", columnList = "userId"),
    ]
)
data class LibraryItem(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var userId: String = "",
    var itemType: String = "",
    var name: String = "",
    var imageStoredName: String? = null,
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
    @OneToMany(mappedBy = "libraryItem", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    var images: MutableList<LibraryItemImage> = mutableListOf(),
    var createdAt: Long = System.currentTimeMillis()
)
