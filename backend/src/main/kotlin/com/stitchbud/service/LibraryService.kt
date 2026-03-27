package com.stitchbud.service

import com.stitchbud.dto.CreateLibraryItemRequest
import com.stitchbud.dto.LibraryItemDto
import com.stitchbud.model.LibraryItem
import com.stitchbud.repository.LibraryItemRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Paths
import java.util.UUID

@Service
@Transactional
class LibraryService(
    private val libraryItemRepository: LibraryItemRepository,
    @Value("\${app.upload-dir:./uploads}") private val uploadDir: String
) {
    fun getAll(): List<LibraryItemDto> =
        libraryItemRepository.findByOrderByCreatedAtDesc().map { it.toDto() }

    fun create(req: CreateLibraryItemRequest): LibraryItemDto {
        val item = LibraryItem(
            itemType = req.itemType,
            name = req.name,
            yarnMaterial = req.yarnMaterial,
            yarnBrand = req.yarnBrand,
            yarnAmountG = req.yarnAmountG,
            yarnAmountM = req.yarnAmountM,
            fabricWidthCm = req.fabricWidthCm,
            fabricLengthCm = req.fabricLengthCm,
            needleSizeMm = req.needleSizeMm,
            circularLengthCm = req.circularLengthCm,
            hookSizeMm = req.hookSizeMm
        )
        return libraryItemRepository.save(item).toDto()
    }

    fun uploadImage(id: Long, file: MultipartFile): LibraryItemDto {
        val item = libraryItemRepository.findById(id).orElseThrow { RuntimeException("Item not found") }
        item.imageStoredName?.let { deleteImageFromDisk(it) }
        val ext = file.originalFilename?.substringAfterLast('.', "") ?: ""
        val storedName = "${UUID.randomUUID()}${if (ext.isNotEmpty()) ".$ext" else ""}"
        val dir = Paths.get(uploadDir, "library")
        Files.createDirectories(dir)
        file.transferTo(dir.resolve(storedName).toFile())
        item.imageStoredName = storedName
        return libraryItemRepository.save(item).toDto()
    }

    fun delete(id: Long) {
        val item = libraryItemRepository.findById(id).orElseThrow { RuntimeException("Item not found") }
        item.imageStoredName?.let { deleteImageFromDisk(it) }
        libraryItemRepository.deleteById(id)
    }

    fun getImageFile(storedName: String): java.io.File =
        Paths.get(uploadDir, "library", storedName).toFile()

    private fun deleteImageFromDisk(storedName: String) {
        try { Paths.get(uploadDir, "library", storedName).toFile().delete() } catch (_: Exception) {}
    }

    private fun LibraryItem.toDto() = LibraryItemDto(
        id = id,
        itemType = itemType,
        name = name,
        imageUrl = imageStoredName?.let { "/api/library-images/$it" },
        yarnMaterial = yarnMaterial,
        yarnBrand = yarnBrand,
        yarnAmountG = yarnAmountG,
        yarnAmountM = yarnAmountM,
        fabricWidthCm = fabricWidthCm,
        fabricLengthCm = fabricLengthCm,
        needleSizeMm = needleSizeMm,
        circularLengthCm = circularLengthCm,
        hookSizeMm = hookSizeMm,
        createdAt = createdAt
    )
}
