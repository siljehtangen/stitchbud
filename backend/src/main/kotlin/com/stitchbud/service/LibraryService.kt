package com.stitchbud.service

import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.CreateLibraryItemRequest
import com.stitchbud.dto.LibraryItemImageDto
import com.stitchbud.dto.RegisterLibraryImageRequest
import com.stitchbud.dto.UpdateLibraryItemRequest
import com.stitchbud.dto.LibraryItemDto
import com.stitchbud.model.LibraryItem
import com.stitchbud.model.LibraryItemImage
import com.stitchbud.repository.LibraryItemImageRepository
import com.stitchbud.repository.LibraryItemRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.file.Paths

@Service
@Transactional
class LibraryService(
    private val libraryItemRepository: LibraryItemRepository,
    private val libraryItemImageRepository: LibraryItemImageRepository,
    private val storageService: SupabaseStorageService,
    @Value("\${app.upload-dir:./uploads}") private val uploadDir: String
) {
    companion object {
        private const val MAX_IMAGES = 3
        private val logger = LoggerFactory.getLogger(LibraryService::class.java)
    }

    private fun findItem(id: Long, userId: String): LibraryItem =
        libraryItemRepository.findByIdAndUserId(id, userId) ?: throw NotFoundException("Library item not found")

    fun getAll(userId: String): List<LibraryItemDto> =
        libraryItemRepository.findByUserIdOrderByCreatedAtDesc(userId).map { it.toDto() }

    fun create(req: CreateLibraryItemRequest, userId: String): LibraryItemDto {
        val item = LibraryItem(
            userId = userId,
            itemType = req.itemType,
            name = req.name,
            colors = req.colors,
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

    fun update(id: Long, req: UpdateLibraryItemRequest, userId: String): LibraryItemDto {
        val item = findItem(id, userId).apply {
            req.name?.let { name = it }
            req.colors?.let { colors = it }
            req.yarnMaterial?.let { yarnMaterial = it }
            req.yarnBrand?.let { yarnBrand = it }
            req.yarnAmountG?.let { yarnAmountG = it }
            req.yarnAmountM?.let { yarnAmountM = it }
            req.fabricWidthCm?.let { fabricWidthCm = it }
            req.fabricLengthCm?.let { fabricLengthCm = it }
            req.needleSizeMm?.let { needleSizeMm = it }
            req.circularLengthCm?.let { circularLengthCm = it }
            req.hookSizeMm?.let { hookSizeMm = it }
        }
        return libraryItemRepository.save(item).toDto()
    }

    fun registerLibraryImage(id: Long, req: RegisterLibraryImageRequest, userId: String): LibraryItemDto {
        val item = findItem(id, userId).also { migrateLegacyImageIfNeeded(it) }
        if (item.images.size >= MAX_IMAGES) throw BadRequestException("Maximum $MAX_IMAGES images per library item")
        item.images.add(LibraryItemImage(
            storedName = req.fileUrl,
            originalName = req.originalName,
            isMain = item.images.isEmpty(),
            libraryItem = item
        ))
        return libraryItemRepository.save(item).toDto()
    }

    fun setLibraryImageMain(libraryItemId: Long, imageId: Long, userId: String): LibraryItemDto {
        val item = findItem(libraryItemId, userId).also { migrateLegacyImageIfNeeded(it) }
        val target = item.images.find { it.id == imageId } ?: throw NotFoundException("Image not found")
        item.images.forEach { it.isMain = false }
        target.isMain = true
        return libraryItemRepository.save(item).toDto()
    }

    fun deleteLibraryImage(libraryItemId: Long, imageId: Long, userId: String): LibraryItemDto {
        val item = findItem(libraryItemId, userId).also { migrateLegacyImageIfNeeded(it) }
        val img = item.images.find { it.id == imageId } ?: throw NotFoundException("Image not found")
        val wasMain = img.isMain
        deleteStoredImage(img.storedName)
        item.images.removeIf { it.id == imageId }
        if (wasMain) item.images.firstOrNull()?.isMain = true
        return libraryItemRepository.save(item).toDto()
    }

    fun delete(id: Long, userId: String) {
        findItem(id, userId).also {
            it.images.forEach { img -> deleteStoredImage(img.storedName) }
            it.imageStoredName?.let { name -> deleteImageFromDisk(name) }
        }
        libraryItemRepository.deleteById(id)
    }

    fun deleteAllForUser(userId: String) {
        val items = libraryItemRepository.findByUserId(userId)
        items.flatMap { it.images }.forEach { deleteStoredImage(it.storedName) }
        items.forEach { it.imageStoredName?.let { name -> deleteImageFromDisk(name) } }
        libraryItemImageRepository.deleteAllByLibraryItemUserId(userId)
        libraryItemRepository.deleteAllByUserId(userId)
    }

    fun getImageFile(storedName: String): java.io.File =
        Paths.get(uploadDir, "library", storedName).toFile()

    private fun migrateLegacyImageIfNeeded(item: LibraryItem) {
        if (item.images.isNotEmpty()) return
        val url = item.imageStoredName?.let { "/api/library-images/$it" } ?: return
        item.images.add(
            LibraryItemImage(
                storedName = url,
                originalName = "",
                isMain = true,
                libraryItem = item
            )
        )
    }

    private fun deleteStoredImage(storedName: String) {
        runCatching {
            when {
                storedName.startsWith("http") -> storageService.deleteByUrl(storedName)
                storedName.startsWith("/api/library-images/") ->
                    deleteImageFromDisk(storedName.removePrefix("/api/library-images/"))
            }
        }.onFailure { logger.warn("Failed to delete stored image $storedName: ${it.message}") }
    }

    private fun deleteImageFromDisk(storedName: String) {
        runCatching { Paths.get(uploadDir, "library", storedName).toFile().delete() }
            .onFailure { logger.warn("Failed to delete image from disk $storedName: ${it.message}") }
    }

    private fun LibraryItem.toDto(): LibraryItemDto {
        val imageDtos = images.map {
            LibraryItemImageDto(it.id, it.storedName, it.originalName, it.isMain, id)
        }
        return LibraryItemDto(
            id = id,
            itemType = itemType,
            name = name,
            images = imageDtos,
            colors = colors,
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
}
