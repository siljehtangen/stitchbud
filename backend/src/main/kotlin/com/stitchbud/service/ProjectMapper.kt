package com.stitchbud.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.stitchbud.dto.*
import com.stitchbud.model.Project
import com.stitchbud.model.ProjectImage
import org.springframework.stereotype.Component

@Component
class ProjectMapper(private val objectMapper: ObjectMapper) {

    fun toDto(project: Project, includeNotes: Boolean = true): ProjectDto = with(project) {
        fun toImgDto(img: ProjectImage) =
            ProjectImageDto(img.id, img.storedName, img.originalName, img.section, img.materialId, img.isMain, id)
        val coverRows = images.filter { it.section == ProjectImage.COVER }.sortedBy { it.id }
        // Group material images once (O(M)) so the per-material lookup is O(1) instead of O(M) each
        val materialImagesByMatId = images.filter { it.section == ProjectImage.MATERIAL }.groupBy { it.materialId }
        ProjectDto(
            id = id, name = name, description = description, category = category,
            tags = tags, notes = if (includeNotes) notes else "",
            recipeText = recipeText,
            pinterestBoardUrls = runCatching { objectMapper.readValue<List<String>>(pinterestBoardUrls) }.getOrDefault(emptyList()),
            craftDetails = craftDetails,
            coverImages = coverRows.map(::toImgDto),
            materials = materials.map { m ->
                val matImages = (materialImagesByMatId[m.id] ?: emptyList()).sortedBy { it.id }
                MaterialDto(m.id, m.name, m.type, m.itemType, m.color, m.colorHex, m.amount, m.unit,
                    images = matImages.map(::toImgDto))
            },
            files = files.map { ProjectFileDto(it.id, it.originalName, it.storedName, it.mimeType, it.fileType, it.uploadedAt, id) },
            rowCounter = rowCounter?.let { RowCounterDto(it.id, it.stitchesPerRound, it.totalRounds, it.checkedStitches) },
            patternGrids = patternGrids.sortedBy { it.id }.map { PatternGridDto(it.id, it.rows, it.cols, it.cellData) },
            startDate = startDate, endDate = endDate,
            isPublic = isPublic,
            createdAt = createdAt, updatedAt = updatedAt,
            userId = userId
        )
    }
}
