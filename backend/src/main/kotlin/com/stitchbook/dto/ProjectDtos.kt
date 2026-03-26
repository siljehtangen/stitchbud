package com.stitchbook.dto

import com.stitchbook.model.ProjectCategory

data class MaterialDto(
    val id: Long = 0,
    val type: String,
    val color: String = "",
    val colorHex: String = "#000000",
    val amount: String = "",
    val unit: String = "g"
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
    val materials: List<MaterialDto> = emptyList(),
    val files: List<ProjectFileDto> = emptyList(),
    val rowCounter: RowCounterDto? = null,
    val patternGrid: PatternGridDto? = null,
    val createdAt: Long = 0,
    val updatedAt: Long = 0
)

data class CreateProjectRequest(
    val name: String,
    val description: String = "",
    val category: ProjectCategory,
    val tags: String = ""
)

data class UpdateProjectRequest(
    val name: String? = null,
    val description: String? = null,
    val tags: String? = null,
    val imageUrl: String? = null,
    val notes: String? = null,
    val recipeText: String? = null
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

data class AddMaterialRequest(
    val type: String,
    val color: String = "",
    val colorHex: String = "#000000",
    val amount: String = "",
    val unit: String = "g"
)
