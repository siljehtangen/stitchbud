package com.stitchbud.dto

import com.stitchbud.model.LibraryItemType

data class LibraryItemImageDto(
    val id: Long = 0,
    val storedName: String,
    val originalName: String,
    val isMain: Boolean,
    val libraryItemId: Long
)

data class LibraryItemDto(
    val id: Long = 0,
    val itemType: LibraryItemType,
    val name: String,
    val images: List<LibraryItemImageDto> = emptyList(),
    val colors: List<String> = emptyList(),
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

data class UpdateLibraryItemRequest(
    val name: String? = null,
    val colors: List<String>? = null,
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

data class CreateLibraryItemRequest(
    val itemType: LibraryItemType,
    val name: String,
    val colors: List<String> = emptyList(),
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

data class RegisterLibraryImageRequest(
    val originalName: String,
    val fileUrl: String
)
