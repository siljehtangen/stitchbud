package com.stitchbud.dto

import com.stitchbud.model.ProjectCategory

data class ProjectImageDto(
    val id: Long = 0,
    val storedName: String,
    val originalName: String,
    val section: String,
    val materialId: Long?,
    val isMain: Boolean,
    val projectId: Long
)

data class MaterialDto(
    val id: Long = 0,
    val name: String,
    val type: String,
    val itemType: String? = null,
    val color: String = "",
    val colorHex: String = "#000000",
    val amount: String = "",
    val unit: String = "g",
    val imageUrl: String? = null,
    val images: List<ProjectImageDto> = emptyList()
)

data class RowCounterDto(
    val id: Long = 0,
    val stitchesPerRound: Int = 0,
    val totalRounds: Int = 0,
    val checkedStitches: String = "[]"
)

data class PatternGridDto(
    val id: Long = 0,
    val rows: Int = 10,
    val cols: Int = 10,
    val cellData: String = "[]"
)

data class ProjectFileDto(
    val id: Long = 0,
    val originalName: String,
    val storedName: String,
    val mimeType: String,
    val fileType: String,
    val uploadedAt: Long,
    val projectId: Long
)

data class ProjectDto(
    val id: Long = 0,
    val name: String,
    val description: String = "",
    val category: ProjectCategory,
    val tags: String = "",
    val imageUrl: String? = null,
    val notes: String = "",
    val recipeText: String = "",
    val craftDetails: String = "{}",
    val coverImages: List<ProjectImageDto> = emptyList(),
    val materials: List<MaterialDto> = emptyList(),
    val files: List<ProjectFileDto> = emptyList(),
    val rowCounter: RowCounterDto? = null,
    val patternGrids: List<PatternGridDto> = emptyList(),
    val startDate: Long? = null,
    val endDate: Long? = null,
    val createdAt: Long = 0,
    val updatedAt: Long = 0
)

data class CreateProjectRequest(
    val name: String,
    val startDate: Long,
    val category: ProjectCategory,
    val description: String = "",
    val tags: String = ""
)

data class UpdateProjectRequest(
    val name: String? = null,
    val description: String? = null,
    val tags: String? = null,
    val imageUrl: String? = null,
    val notes: String? = null,
    val recipeText: String? = null,
    val craftDetails: String? = null,
    val startDate: Long? = null,
    val endDate: Long? = null,
    val clearEndDate: Boolean = false
)

data class UpdateRowCounterRequest(
    val stitchesPerRound: Int,
    val totalRounds: Int,
    val checkedStitches: String
)

data class UpdatePatternGridRequest(
    val rows: Int,
    val cols: Int,
    val cellData: String
)

data class RegisterProjectFileRequest(
    val originalName: String,
    val fileUrl: String,
    val mimeType: String
)

data class AddMaterialRequest(
    val name: String,
    val type: String,
    val itemType: String? = null,
    val color: String = "",
    val colorHex: String = "#000000",
    val amount: String = "",
    val unit: String = "g",
    val imageUrl: String? = null
)

data class RegisterProjectImageRequest(
    val originalName: String,
    val fileUrl: String,
    val materialId: Long? = null
)
