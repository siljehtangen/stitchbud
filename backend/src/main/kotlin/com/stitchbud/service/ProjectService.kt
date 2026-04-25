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
        projectRepository.findByIdAndUserId(id, userId).orElseThrow { NotFoundException("Project not found") }

    fun getAllProjects(userId: String): List<ProjectDto> =
        projectRepository.findByUserIdOrderByUpdatedAtDesc(userId).map { projectMapper.toDto(it) }

    fun getProjectsByCategory(category: ProjectCategory, userId: String): List<ProjectDto> =
        projectRepository.findByUserIdAndCategory(userId, category).map { projectMapper.toDto(it) }

    fun getProject(id: Long, userId: String): ProjectDto =
        projectMapper.toDto(findProject(id, userId))

    fun createProject(req: CreateProjectRequest, userId: String): ProjectDto {
        val project = Project(userId = userId, name = req.name, description = req.description, category = req.category, tags = req.tags,
            startDate = req.startDate)
        val saved = projectRepository.save(project)
        saved.rowCounter = RowCounter(project = saved)
        saved.patternGrids.add(PatternGrid(project = saved))
        return projectMapper.toDto(projectRepository.save(saved))
    }

    fun updateProject(id: Long, req: UpdateProjectRequest, userId: String): ProjectDto {
        val project = findProject(id, userId)
        req.name?.let { project.name = it }
        req.description?.let { project.description = it }
        req.tags?.let { project.tags = it }
        req.notes?.let { project.notes = it }
        req.recipeText?.let { project.recipeText = it }
        req.pinterestBoardUrls?.let { urls ->
            val sanitized = urls.filter { it.isNotBlank() }.take(3)
            project.pinterestBoardUrls = objectMapper.writeValueAsString(sanitized)
        }
        req.craftDetails?.let { project.craftDetails = it }
        req.startDate?.let { project.startDate = it }
        req.endDate?.let { project.endDate = it }
        if (req.clearEndDate) project.endDate = null
        req.isPublic?.let { project.isPublic = it }
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    private fun cleanupProjectStorage(project: Project) {
        project.images.forEach { img ->
            try { storageService.deleteByUrl(img.storedName) }
            catch (e: Exception) { logger.warn("Failed to delete image ${img.storedName}: ${e.message}") }
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
        val material = Material(
            name = req.name,
            type = req.type,
            itemType = req.itemType,
            color = req.color,
            colorHex = req.colorHex,
            amount = req.amount,
            unit = req.unit,
            project = project
        )
        project.materials.add(material)
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun deleteMaterial(projectId: Long, materialId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.materials.removeIf { it.id == materialId }
        project.images.removeIf { it.section == "material" && it.materialId == materialId }
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun updateRowCounter(projectId: Long, req: UpdateRowCounterRequest, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.rowCounter?.let {
            it.stitchesPerRound = req.stitchesPerRound
            it.totalRounds = req.totalRounds
            it.checkedStitches = req.checkedStitches
        } ?: run {
            project.rowCounter = RowCounter(
                stitchesPerRound = req.stitchesPerRound,
                totalRounds = req.totalRounds,
                checkedStitches = req.checkedStitches,
                project = project
            )
        }
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun createPatternGrid(projectId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.patternGrids.add(PatternGrid(project = project))
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun updatePatternGrid(projectId: Long, gridId: Long, req: UpdatePatternGridRequest, userId: String): ProjectDto {
        if (req.rows < 1 || req.rows > 200 || req.cols < 1 || req.cols > 200)
            throw BadRequestException("Grid dimensions must be between 1 and 200")
        val project = findProject(projectId, userId)
        val grid = project.patternGrids.find { it.id == gridId } ?: throw NotFoundException("Grid not found")
        grid.rows = req.rows
        grid.cols = req.cols
        grid.cellData = req.cellData
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun deletePatternGrid(projectId: Long, gridId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        project.patternGrids.removeIf { it.id == gridId }
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun registerCoverImage(projectId: Long, req: RegisterProjectImageRequest, userId: String): ProjectDto =
        doRegisterImage(findProject(projectId, userId), "cover", null, req.fileUrl, req.originalName)

    fun setCoverImageMain(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doSetImageMain(findProject(projectId, userId), "cover", imageId)

    fun deleteCoverImage(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doDeleteImage(findProject(projectId, userId), "cover", imageId)

    fun registerMaterialImage(projectId: Long, req: RegisterProjectImageRequest, userId: String): ProjectDto {
        val materialId = req.materialId ?: throw BadRequestException("materialId required")
        val project = findProject(projectId, userId)
        project.materials.find { it.id == materialId } ?: throw NotFoundException("Material not found")
        return doRegisterImage(project, "material", materialId, req.fileUrl, req.originalName)
    }

    fun setMaterialImageMain(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doSetImageMain(findProject(projectId, userId), "material", imageId)

    fun deleteMaterialImage(projectId: Long, imageId: Long, userId: String): ProjectDto =
        doDeleteImage(findProject(projectId, userId), "material", imageId)

    private fun doRegisterImage(project: Project, section: String, materialId: Long?, fileUrl: String, originalName: String): ProjectDto {
        val sectionImages = project.images.filter { it.section == section && (materialId == null || it.materialId == materialId) }
        if (sectionImages.size >= MAX_IMAGES) throw BadRequestException("Maximum $MAX_IMAGES $section images allowed")
        project.images.add(ProjectImage(storedName = fileUrl, originalName = originalName, section = section, materialId = materialId, isMain = sectionImages.isEmpty(), project = project))
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    private fun doSetImageMain(project: Project, section: String, imageId: Long): ProjectDto {
        val target = project.images.find { it.id == imageId && it.section == section } ?: throw NotFoundException("Image not found")
        project.images.filter { it.section == section && it.materialId == target.materialId }.forEach { it.isMain = false }
        target.isMain = true
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    private fun doDeleteImage(project: Project, section: String, imageId: Long): ProjectDto {
        val img = project.images.find { it.id == imageId && it.section == section } ?: throw NotFoundException("Image not found")
        val wasMain = img.isMain
        val materialId = img.materialId
        try { storageService.deleteByUrl(img.storedName) }
        catch (e: Exception) { logger.warn("Failed to delete $section image ${img.storedName}: ${e.message}") }
        project.images.removeIf { it.id == imageId }
        if (wasMain) project.images.firstOrNull { it.section == section && it.materialId == materialId }?.isMain = true
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun registerFile(projectId: Long, req: RegisterProjectFileRequest, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        val ext = req.originalName.substringAfterLast('.', "").lowercase()
        val pf = ProjectFile(
            originalName = req.originalName,
            storedName = req.fileUrl,
            mimeType = req.mimeType,
            fileType = detectFileType(req.mimeType, ext),
            project = project
        )
        project.files.add(pf)
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun deleteFile(projectId: Long, fileId: Long, userId: String): ProjectDto {
        val project = findProject(projectId, userId)
        val pf = project.files.find { it.id == fileId } ?: throw NotFoundException("File not found")
        if (!pf.storedName.startsWith("http")) deleteFileFromDisk(projectId, pf.storedName)
        project.files.removeIf { it.id == fileId }
        project.updatedAt = System.currentTimeMillis()
        return projectMapper.toDto(projectRepository.save(project))
    }

    fun getFilePath(projectId: Long, storedName: String, userId: String): java.io.File? {
        projectRepository.findByIdAndUserId(projectId, userId).orElse(null) ?: return null
        return Paths.get(uploadDir, projectId.toString(), storedName).toFile()
    }

    private fun detectFileType(mimeType: String, ext: String): String = when {
        mimeType.startsWith("image/") -> "image"
        mimeType == "application/pdf" || ext == "pdf" -> "pdf"
        mimeType.contains("word") || ext == "docx" || ext == "doc" -> "word"
        else -> "other"
    }

    private fun deleteFileFromDisk(projectId: Long, storedName: String) {
        try { Paths.get(uploadDir, projectId.toString(), storedName).toFile().delete() }
        catch (e: Exception) { logger.warn("Failed to delete file $storedName for project $projectId: ${e.message}") }
    }

}
