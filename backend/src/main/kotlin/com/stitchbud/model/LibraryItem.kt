package com.stitchbud.model

import com.stitchbud.util.StringListConverter
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
    @Enumerated(EnumType.STRING)
    var itemType: LibraryItemType,
    var name: String = "",
    var imageStoredName: String? = null,
    var yarnMaterial: String? = null,
    var yarnBrand: String? = null,
    var yarnAmountG: Int? = null,
    var yarnAmountM: Int? = null,
    var fabricWidthCm: Int? = null,
    var fabricLengthCm: Int? = null,
    var needleSizeMm: String? = null,
    var circularLengthCm: Int? = null,
    var hookSizeMm: String? = null,
    @Convert(converter = StringListConverter::class)
    var colors: List<String> = emptyList(),
    @OneToMany(mappedBy = "libraryItem", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    var images: MutableList<LibraryItemImage> = mutableListOf(),
    var createdAt: Long = System.currentTimeMillis()
)
