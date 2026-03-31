package com.stitchbud.service

import com.stitchbud.dto.*
import com.stitchbud.model.*
import com.stitchbud.repository.MaterialRepository
import com.stitchbud.repository.ProjectRepository
import com.stitchbud.repository.ProjectFileRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.nio.file.Files
import java.nio.file.Paths
import java.util.UUID

@Service
@Transactional
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val materialRepository: MaterialRepository,
    private val projectFileRepository: ProjectFileRepository,
    @Value("\${app.upload-dir:./uploads}") private val uploadDir: String
) {
    fun getAllProjects(userId: String): List<ProjectDto> =
        projectRepository.findByUserIdOrderByUpdatedAtDesc(userId).map { it.toDto() }

    fun getProjectsByCategory(category: ProjectCategory, userId: String): List<ProjectDto> =
        projectRepository.findByUserIdAndCategory(userId, category).map { it.toDto() }

    fun getProject(id: Long, userId: String): ProjectDto =
        projectRepository.findByIdAndUserId(id, userId).orElseThrow { RuntimeException("Project not found") }.toDto()

    fun createProject(req: CreateProjectRequest, userId: String): ProjectDto {
        val project = Project(userId = userId, name = req.name, description = req.description, category = req.category, tags = req.tags,
            startDate = req.startDate)
        val saved = projectRepository.save(project)
        saved.rowCounter = RowCounter(project = saved)
        saved.patternGrids.add(PatternGrid(project = saved))
        return projectRepository.save(saved).toDto()
    }

    fun updateProject(id: Long, req: UpdateProjectRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(id, userId).orElseThrow { RuntimeException("Project not found") }
        req.name?.let { project.name = it }
        req.description?.let { project.description = it }
        req.tags?.let { project.tags = it }
        req.imageUrl?.let { project.imageUrl = it }
        req.notes?.let { project.notes = it }
        req.recipeText?.let { project.recipeText = it }
        req.craftDetails?.let { project.craftDetails = it }
        req.startDate?.let { project.startDate = it }
        req.endDate?.let { project.endDate = it }
        if (req.clearEndDate) project.endDate = null
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deleteProject(id: Long, userId: String) {
        val project = projectRepository.findByIdAndUserId(id, userId).orElseThrow { RuntimeException("Project not found") }
        project.files.forEach { deleteFileFromDisk(project.id, it.storedName) }
        projectRepository.deleteById(id)
    }

    fun deleteAllUserData(userId: String) {
        val projects = projectRepository.findByUserIdOrderByUpdatedAtDesc(userId)
        projects.forEach { project ->
            project.files.forEach { deleteFileFromDisk(project.id, it.storedName) }
        }
        projectRepository.deleteAll(projects)
    }

    fun addMaterial(projectId: Long, req: AddMaterialRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        project.materials.add(
            Material(name = req.name, type = req.type, itemType = req.itemType, color = req.color, colorHex = req.colorHex, amount = req.amount, unit = req.unit, imageUrl = req.imageUrl, project = project)
        )
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deleteMaterial(projectId: Long, materialId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        project.materials.removeIf { it.id == materialId }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun updateRowCounter(projectId: Long, req: UpdateRowCounterRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
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
        return projectRepository.save(project).toDto()
    }

    fun createPatternGrid(projectId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        project.patternGrids.add(PatternGrid(project = project))
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun updatePatternGrid(projectId: Long, gridId: Long, req: UpdatePatternGridRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        val grid = project.patternGrids.find { it.id == gridId } ?: throw RuntimeException("Grid not found")
        grid.rows = req.rows
        grid.cols = req.cols
        grid.cellData = req.cellData
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deletePatternGrid(projectId: Long, gridId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        project.patternGrids.removeIf { it.id == gridId }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun uploadCoverImage(projectId: Long, file: MultipartFile, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        val ext = file.originalFilename?.substringAfterLast('.', "") ?: ""
        val storedName = "cover_${UUID.randomUUID()}${if (ext.isNotEmpty()) ".$ext" else ""}"
        val dir = Paths.get(uploadDir, projectId.toString())
        Files.createDirectories(dir)
        file.transferTo(dir.resolve(storedName).toFile())
        project.imageUrl = "/api/files/$projectId/$storedName"
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun uploadFile(projectId: Long, file: MultipartFile, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        val ext = file.originalFilename?.substringAfterLast('.', "") ?: ""
        val storedName = "${UUID.randomUUID()}${if (ext.isNotEmpty()) ".$ext" else ""}"
        val dir = Paths.get(uploadDir, projectId.toString())
        Files.createDirectories(dir)
        file.transferTo(dir.resolve(storedName).toFile())
        val fileType = when {
            file.contentType?.startsWith("image/") == true -> "image"
            file.contentType == "application/pdf" -> "pdf"
            file.contentType?.contains("word") == true || ext == "docx" || ext == "doc" -> "word"
            else -> "other"
        }
        val pf = ProjectFile(
            originalName = file.originalFilename ?: storedName,
            storedName = storedName,
            mimeType = file.contentType ?: "application/octet-stream",
            fileType = fileType,
            project = project
        )
        project.files.add(pf)
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deleteFile(projectId: Long, fileId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { RuntimeException("Project not found") }
        val pf = project.files.find { it.id == fileId } ?: throw RuntimeException("File not found")
        deleteFileFromDisk(projectId, pf.storedName)
        project.files.removeIf { it.id == fileId }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun getFilePath(projectId: Long, storedName: String): java.io.File =
        Paths.get(uploadDir, projectId.toString(), storedName).toFile()

    private fun deleteFileFromDisk(projectId: Long, storedName: String) {
        try { Paths.get(uploadDir, projectId.toString(), storedName).toFile().delete() } catch (_: Exception) {}
    }

    private fun Project.toDto() = ProjectDto(
        id = id, name = name, description = description, category = category,
        tags = tags, imageUrl = imageUrl, notes = notes, recipeText = recipeText, craftDetails = craftDetails,
        materials = materials.map { MaterialDto(it.id, it.name, it.type, it.itemType, it.color, it.colorHex, it.amount, it.unit, it.imageUrl) },
        files = files.map { ProjectFileDto(it.id, it.originalName, it.storedName, it.mimeType, it.fileType, it.uploadedAt, id) },
        rowCounter = rowCounter?.let { RowCounterDto(it.id, it.stitchesPerRound, it.totalRounds, it.checkedStitches) },
        patternGrids = patternGrids.map { PatternGridDto(it.id, it.rows, it.cols, it.cellData) },
        startDate = startDate, endDate = endDate,
        createdAt = createdAt, updatedAt = updatedAt
    )
}
