package com.stitchbud.service

import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.*
import com.stitchbud.model.*
import com.stitchbud.repository.MaterialRepository
import com.stitchbud.repository.PatternGridRepository
import com.stitchbud.repository.ProjectFileRepository
import com.stitchbud.repository.ProjectImageRepository
import com.stitchbud.repository.ProjectRepository
import com.stitchbud.repository.RowCounterRepository
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.file.Paths

@Service
@Transactional
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val materialRepository: MaterialRepository,
    private val projectFileRepository: ProjectFileRepository,
    private val projectImageRepository: ProjectImageRepository,
    private val patternGridRepository: PatternGridRepository,
    private val rowCounterRepository: RowCounterRepository,
    private val storageService: SupabaseStorageService,
    private val libraryService: LibraryService,
    private val projectMapper: ProjectMapper,
    private val objectMapper: ObjectMapper,
    @Value("\${app.upload-dir:./uploads}") private val uploadDir: String
) {
    companion object {
        private const val MAX_IMAGES = 3
        private val logger = LoggerFactory.getLogger(ProjectService::class.java)
    }

    private fun findProject(id: Long, userId: String): Project =
        projectRepository.findByIdAndUserId(id, userId) ?: throw NotFoundException("Project not found")

    private fun touchAndSave(project: Project): ProjectDto {
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun getAllProjects(userId: String): List<ProjectDto> =
        projectRepository.findByUserIdOrderByUpdatedAtDesc(userId).map { projectMapper.toDto(it) }

    fun getProjectsByCategory(category: ProjectCategory, userId: String): List<ProjectDto> =
        projectRepository.findByUserIdAndCategory(userId, category).map { projectMapper.toDto(it) }

    fun getProject(id: Long, userId: String): ProjectDto =
        projectMapper.toDto(findProject(id, userId))

    fun createProject(req: CreateProjectRequest, userId: String): ProjectDto {
        val project = Project(userId = userId, name = req.name, description = req.description, category = req.category, tags = req.tags, startDate = req.startDate)
        val saved = projectRepository.save(project).apply {
            rowCounter = RowCounter(project = this)
            patternGrids.add(PatternGrid(project = this))
        }
        return projectMapper.toDto(projectRepository.save(saved))
    }

    fun updateProject(id: Long, req: UpdateProjectRequest, userId: String): ProjectDto {
        val project = findProject(id, userId).apply {
            req.name?.let { name = it }
            req.description?.let { description = it }
            req.tags?.let { tags = it }
            req.notes?.let { notes = it }
            req.recipeText?.let { recipeText = it }
            req.pinterestBoardUrls?.let { urls ->
                val sanitized = urls.filter { it.isNotBlank() }.take(3)
                pinterestBoardUrls = objectMapper.writeValueAsString(sanitized)
            }
            req.craftDetails?.let { craftDetails = it }
            req.startDate?.let { startDate = it }
            req.endDate?.let { endDate = it }
            if (req.clearEndDate) endDate = null
            req.isPublic?.let { isPublic = it }
        }
        return touchAndSave(project)
    }

    private fun cleanupProjectStorage(project: Project) {
        project.images.forEach { img ->
            runCatching { storageService.deleteByUrl(img.storedName) }
                .onFailure { logger.warn("Failed to delete image ${img.storedName}: ${it.message}") }
        }
        project.files.forEach { file ->
            if (file.storedName.startsWith("http")) storageService.deleteByUrl(file.storedName)
            else deleteFileFromDisk(project.id, file.storedName)
        }
    }

    fun deleteProject(id: Long, userId: String) {
        val project = findProject(id, userId)
        cleanupProjectStorage(project)
        projectRepository.deleteById(id)
    }

    fun deleteAllUserData(userId: String) {
        // Clean up storage files before removing DB records
        val projects = projectRepository.findByUserIdOrderByUpdatedAtDesc(userId)
        projects.forEach { cleanupProjectStorage(it) }

        projectImageRepository.deleteAllByProjectUserId(userId)
        materialRepository.deleteAllByProjectUserId(userId)
        projectFileRepository.deleteAllByProjectUserId(userId)
        patternGridRepository.deleteAllByProjectUserId(userId)
        rowCounterRepository.deleteAllByProjectUserId(userId)
        projectRepository.deleteAllByUserId(userId)

        libraryService.deleteAllForUser(userId)
    }

    fun deleteAccount(userId: String) {
        deleteAllUserData(userId)
        storageService.deleteUser(userId)
    }

    fun addMaterial(projectId: Long, req: AddMaterialRequest, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.materials.add(Material(
            name = req.name, type = req.type, itemType = req.itemType,
            color = req.color, colorHex = req.colorHex, amount = req.amount,
            unit = req.unit, project = project
        ))
        return touchAndSave(project)
    }

    fun deleteMaterial(projectId: Long, materialId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.materials.removeIf { it.id == materialId }
        project.images.removeIf { it.section == ProjectImage.MATERIAL && it.materialId == materialId }
        return touchAndSave(project)
    }

    fun updateRowCounter(projectId: Long, req: UpdateRowCounterRequest, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.rowCounter = project.rowCounter?.apply {
            stitchesPerRound = req.stitchesPerRound
            totalRounds = req.totalRounds
            checkedStitches = req.checkedStitches
        } ?: RowCounter(
            stitchesPerRound = req.stitchesPerRound,
            totalRounds = req.totalRounds,
            checkedStitches = req.checkedStitches,
            project = project
        )
        return touchAndSave(project)
    }

    fun createPatternGrid(projectId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.patternGrids.add(PatternGrid(project = project))
        return touchAndSave(project)
    }

    fun updatePatternGrid(projectId: Long, gridId: Long, req: UpdatePatternGridRequest, userId: String): ProjectDto {
        if (req.rows < 1 || req.rows > 200 || req.cols < 1 || req.cols > 200)
            throw BadRequestException("Grid dimensions must be between 1 and 200")
        val project = findProject(projectId, userId)
        val grid = project.patternGrids.find { it.id == gridId } ?: throw NotFoundException("Grid not found")
        grid.rows = req.rows
        grid.cols = req.cols
        grid.cellData = req.cellData
        return touchAndSave(project)
    }

    fun deletePatternGrid(projectId: Long, gridId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.patternGrids.removeIf { it.id == gridId }
        return touchAndSave(project)
    }

    fun registerCoverImage(projectId: Long, req: RegisterProjectImageRequest, userId: String): ProjectDto =
        doRegisterImage(findProject(projectId, userId), ProjectImage.COVER, null, req.fileUrl, req.originalName)

    fun setCoverImageMain(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doSetImageMain(findProject(projectId, userId), ProjectImage.COVER, imageId)

    fun deleteCoverImage(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doDeleteImage(findProject(projectId, userId), ProjectImage.COVER, imageId)

    fun registerMaterialImage(projectId: Long, req: RegisterProjectImageRequest, userId: String): ProjectDto {
        val materialId = req.materialId ?: throw BadRequestException("materialId required")
        val project = findProject(projectId, userId)
        project.materials.find { it.id == materialId } ?: throw NotFoundException("Material not found")
        return doRegisterImage(project, ProjectImage.MATERIAL, materialId, req.fileUrl, req.originalName)
    }

    fun setMaterialImageMain(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doSetImageMain(findProject(projectId, userId), ProjectImage.MATERIAL, imageId)

    fun deleteMaterialImage(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doDeleteImage(findProject(projectId, userId), ProjectImage.MATERIAL, imageId)

    private fun doRegisterImage(project: Project, section: String, materialId: Long?, fileUrl: String, originalName: String): ProjectDto {
        val sectionImages = project.images.filter { it.section == section && (materialId == null || it.materialId == materialId) }
        if (sectionImages.size >= MAX_IMAGES) throw BadRequestException("Maximum $MAX_IMAGES $section images allowed")
        project.images.add(ProjectImage(storedName = fileUrl, originalName = originalName, section = section, materialId = materialId, isMain = sectionImages.isEmpty(), project = project))
        return touchAndSave(project)
    }

    private fun doSetImageMain(project: Project, section: String, imageId: Long): ProjectDto {
        val target = project.images.find { it.id == imageId && it.section == section } ?: throw NotFoundException("Image not found")
        project.images.filter { it.section == section && it.materialId == target.materialId }.forEach { it.isMain = false }
        target.isMain = true
        return touchAndSave(project)
    }

    private fun doDeleteImage(project: Project, section: String, imageId: Long): ProjectDto {
        val img = project.images.find { it.id == imageId && it.section == section } ?: throw NotFoundException("Image not found")
        val wasMain = img.isMain
        val materialId = img.materialId
        runCatching { storageService.deleteByUrl(img.storedName) }
            .onFailure { logger.warn("Failed to delete $section image ${img.storedName}: ${it.message}") }
        project.images.removeIf { it.id == imageId }
        if (wasMain) project.images.firstOrNull { it.section == section && it.materialId == materialId }?.isMain = true
        return touchAndSave(project)
    }

    fun registerFile(projectId: Long, req: RegisterProjectFileRequest, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.files.add(ProjectFile(
            originalName = req.originalName,
            storedName = req.fileUrl,
            mimeType = req.mimeType,
            fileType = detectFileType(req.mimeType, req.originalName.substringAfterLast('.', "").lowercase()),
            project = project
        ))
        return touchAndSave(project)
    }

    fun deleteFile(projectId: Long, fileId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        val pf = project.files.find { it.id == fileId } ?: throw NotFoundException("File not found")
        if (!pf.storedName.startsWith("http")) deleteFileFromDisk(projectId, pf.storedName)
        project.files.removeIf { it.id == fileId }
        return touchAndSave(project)
    }

    fun getFilePath(projectId: Long, storedName: String, userId: String): java.io.File? =
        projectRepository.findByIdAndUserId(projectId, userId)
            ?.let { Paths.get(uploadDir, projectId.toString(), storedName).toFile() }

    private fun detectFileType(mimeType: String, ext: String): String = when {
        mimeType.startsWith("image/") -> "image"
        mimeType == "application/pdf" || ext == "pdf" -> "pdf"
        mimeType.contains("word") || ext == "docx" || ext == "doc" -> "word"
        else -> "other"
    }

    private fun deleteFileFromDisk(projectId: Long, storedName: String) {
        runCatching { Paths.get(uploadDir, projectId.toString(), storedName).toFile().delete() }
            .onFailure { logger.warn("Failed to delete file $storedName for project $projectId: ${it.message}") }
    }

}
