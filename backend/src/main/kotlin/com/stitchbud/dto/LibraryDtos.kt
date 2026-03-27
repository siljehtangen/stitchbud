package com.stitchbud.dto

data class LibraryItemDto(
    val id: Long = 0,
    val itemType: String,
    val name: String,
    val imageUrl: String? = null,
    val yarnMaterial: String? = null,
    val yarnBrand: String? = null,
    val yarnAmountG: Int? = null,
    val yarnAmountM: Int? = null,
    val fabricWidthCm: Int? = null,
    val fabricLengthCm: Int? = null,
    val needleSizeMm: String? = null,
    val circularLengthCm: Int? = null,
    val hookSizeMm: String? = null,
    val createdAt: Long = 0
)

data class CreateLibraryItemRequest(
    val itemType: String,
    val name: String,
    val yarnMaterial: String? = null,
    val yarnBrand: String? = null,
    val yarnAmountG: Int? = null,
    val yarnAmountM: Int? = null,
    val fabricWidthCm: Int? = null,
    val fabricLengthCm: Int? = null,
    val needleSizeMm: String? = null,
    val circularLengthCm: Int? = null,
    val hookSizeMm: String? = null
)
