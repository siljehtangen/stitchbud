package com.stitchbud.service

import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
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
    private val storageService: SupabaseStorageService,
    private val libraryService: LibraryService,
    @Value("\${app.upload-dir:./uploads}") private val uploadDir: String
) {
    fun getAllProjects(userId: String): List<ProjectDto> =
        projectRepository.findByUserIdOrderByUpdatedAtDesc(userId).map { it.toDto() }

    fun getProjectsByCategory(category: ProjectCategory, userId: String): List<ProjectDto> =
        projectRepository.findByUserIdAndCategory(userId, category).map { it.toDto() }

    fun getProject(id: Long, userId: String): ProjectDto =
        projectRepository.findByIdAndUserId(id, userId).orElseThrow { NotFoundException("Project not found") }.toDto()

    fun createProject(req: CreateProjectRequest, userId: String): ProjectDto {
        val project = Project(userId = userId, name = req.name, description = req.description, category = req.category, tags = req.tags,
            startDate = req.startDate)
        val saved = projectRepository.save(project)
        saved.rowCounter = RowCounter(project = saved)
        saved.patternGrids.add(PatternGrid(project = saved))
        return projectRepository.save(saved).toDto()
    }

    fun updateProject(id: Long, req: UpdateProjectRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(id, userId).orElseThrow { NotFoundException("Project not found") }
        req.name?.let { project.name = it }
        req.description?.let { project.description = it }
        req.tags?.let { project.tags = it }
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
        val project = projectRepository.findByIdAndUserId(id, userId).orElseThrow { NotFoundException("Project not found") }
        project.images.forEach { img -> try { storageService.deleteByUrl(img.storedName) } catch (_: Exception) {} }
        project.files.forEach { file ->
            if (file.storedName.startsWith("http")) storageService.deleteByUrl(file.storedName)
            else deleteFileFromDisk(project.id, file.storedName)
        }
        projectRepository.deleteById(id)
    }

    fun deleteAllUserData(userId: String) {
        val projects = projectRepository.findByUserIdOrderByUpdatedAtDesc(userId)
        projects.forEach { project ->
            project.images.forEach { img -> try { storageService.deleteByUrl(img.storedName) } catch (_: Exception) {} }
            project.files.forEach { file ->
                if (file.storedName.startsWith("http")) storageService.deleteByUrl(file.storedName)
                else deleteFileFromDisk(project.id, file.storedName)
            }
        }
        projectRepository.deleteAll(projects)
        libraryService.deleteAllForUser(userId)
    }

    fun addMaterial(projectId: Long, req: AddMaterialRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
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
        return projectRepository.save(project).toDto()
    }

    fun deleteMaterial(projectId: Long, materialId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        project.materials.removeIf { it.id == materialId }
        project.images.removeIf { it.section == "material" && it.materialId == materialId }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun updateRowCounter(projectId: Long, req: UpdateRowCounterRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
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
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        project.patternGrids.add(PatternGrid(project = project))
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun updatePatternGrid(projectId: Long, gridId: Long, req: UpdatePatternGridRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val grid = project.patternGrids.find { it.id == gridId } ?: throw NotFoundException("Grid not found")
        grid.rows = req.rows
        grid.cols = req.cols
        grid.cellData = req.cellData
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deletePatternGrid(projectId: Long, gridId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        project.patternGrids.removeIf { it.id == gridId }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun registerCoverImage(projectId: Long, req: RegisterProjectImageRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val coverImages = project.images.filter { it.section == "cover" }
        if (coverImages.size >= 3) throw BadRequestException("Maximum 3 cover images allowed")
        val isFirst = coverImages.isEmpty()
        val img = ProjectImage(storedName = req.fileUrl, originalName = req.originalName, section = "cover", materialId = null, isMain = isFirst, project = project)
        project.images.add(img)
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun setCoverImageMain(projectId: Long, imageId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val target = project.images.find { it.id == imageId && it.section == "cover" } ?: throw NotFoundException("Image not found")
        project.images.filter { it.section == "cover" }.forEach { it.isMain = false }
        target.isMain = true
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deleteCoverImage(projectId: Long, imageId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val img = project.images.find { it.id == imageId && it.section == "cover" } ?: throw NotFoundException("Image not found")
        val wasMain = img.isMain
        try { storageService.deleteByUrl(img.storedName) } catch (_: Exception) {}
        project.images.removeIf { it.id == imageId }
        if (wasMain) {
            val next = project.images.firstOrNull { it.section == "cover" }
            next?.isMain = true
        }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun registerMaterialImage(projectId: Long, req: RegisterProjectImageRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val materialId = req.materialId ?: throw BadRequestException("materialId required")
        project.materials.find { it.id == materialId } ?: throw NotFoundException("Material not found")
        val matImages = project.images.filter { it.section == "material" && it.materialId == materialId }
        if (matImages.size >= 3) throw BadRequestException("Maximum 3 images per material")
        val isFirst = matImages.isEmpty()
        val img = ProjectImage(storedName = req.fileUrl, originalName = req.originalName, section = "material", materialId = materialId, isMain = isFirst, project = project)
        project.images.add(img)
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun setMaterialImageMain(projectId: Long, imageId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val target = project.images.find { it.id == imageId && it.section == "material" } ?: throw NotFoundException("Image not found")
        project.images.filter { it.section == "material" && it.materialId == target.materialId }.forEach { it.isMain = false }
        target.isMain = true
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deleteMaterialImage(projectId: Long, imageId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val img = project.images.find { it.id == imageId && it.section == "material" } ?: throw NotFoundException("Image not found")
        val wasMain = img.isMain
        val materialId = img.materialId
        try { storageService.deleteByUrl(img.storedName) } catch (_: Exception) {}
        project.images.removeIf { it.id == imageId }
        if (wasMain && materialId != null) {
            val next = project.images.firstOrNull { it.section == "material" && it.materialId == materialId }
            next?.isMain = true
        }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun uploadCoverImage(projectId: Long, file: MultipartFile, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val coverImages = project.images.filter { it.section == "cover" }
        if (coverImages.size >= 3) throw BadRequestException("Maximum 3 cover images allowed")
        val ext = file.originalFilename?.substringAfterLast('.', "") ?: ""
        val storedName = "cover_${UUID.randomUUID()}${if (ext.isNotEmpty()) ".$ext" else ""}"
        val dir = Paths.get(uploadDir, projectId.toString())
        Files.createDirectories(dir)
        file.transferTo(dir.resolve(storedName).toFile())
        val publicUrl = "/api/files/$projectId/$storedName"
        val isFirst = coverImages.isEmpty()
        project.images.add(
            ProjectImage(
                storedName = publicUrl,
                originalName = file.originalFilename ?: storedName,
                section = "cover",
                materialId = null,
                isMain = isFirst,
                project = project
            )
        )
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun uploadFile(projectId: Long, file: MultipartFile, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
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

    fun registerFile(projectId: Long, req: RegisterProjectFileRequest, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val ext = req.originalName.substringAfterLast('.', "").lowercase()
        val fileType = when {
            req.mimeType.startsWith("image/") -> "image"
            req.mimeType == "application/pdf" || ext == "pdf" -> "pdf"
            req.mimeType.contains("word") || ext == "docx" || ext == "doc" -> "word"
            else -> "other"
        }
        val pf = ProjectFile(
            originalName = req.originalName,
            storedName = req.fileUrl,
            mimeType = req.mimeType,
            fileType = fileType,
            project = project
        )
        project.files.add(pf)
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun deleteFile(projectId: Long, fileId: Long, userId: String): ProjectDto {
        val project = projectRepository.findByIdAndUserId(projectId, userId).orElseThrow { NotFoundException("Project not found") }
        val pf = project.files.find { it.id == fileId } ?: throw NotFoundException("File not found")
        if (!pf.storedName.startsWith("http")) deleteFileFromDisk(projectId, pf.storedName)
        project.files.removeIf { it.id == fileId }
        project.updatedAt = System.currentTimeMillis()
        return projectRepository.save(project).toDto()
    }

    fun getFilePath(projectId: Long, storedName: String): java.io.File =
        Paths.get(uploadDir, projectId.toString(), storedName).toFile()

    private fun deleteFileFromDisk(projectId: Long, storedName: String) {
        try { Paths.get(uploadDir, projectId.toString(), storedName).toFile().delete() } catch (_: Exception) {}
    }

    private fun Project.toDto(): ProjectDto {
        fun toImgDto(it: ProjectImage) =
            ProjectImageDto(it.id, it.storedName, it.originalName, it.section, it.materialId, it.isMain, id)
        val coverRows = images.filter { it.section == "cover" }.sortedBy { it.id }
        return ProjectDto(
            id = id, name = name, description = description, category = category,
            tags = tags, notes = notes, recipeText = recipeText, craftDetails = craftDetails,
            coverImages = coverRows.map(::toImgDto),
            materials = materials.map { m ->
                val matImages = images
                    .filter { it.section == "material" && it.materialId == m.id }
                    .sortedBy { it.id }
                MaterialDto(m.id, m.name, m.type, m.itemType, m.color, m.colorHex, m.amount, m.unit,
                    images = matImages.map(::toImgDto)
                )
            },
            files = files.map { ProjectFileDto(it.id, it.originalName, it.storedName, it.mimeType, it.fileType, it.uploadedAt, id) },
            rowCounter = rowCounter?.let { RowCounterDto(it.id, it.stitchesPerRound, it.totalRounds, it.checkedStitches) },
            patternGrids = patternGrids.map { PatternGridDto(it.id, it.rows, it.cols, it.cellData) },
            startDate = startDate, endDate = endDate,
            createdAt = createdAt, updatedAt = updatedAt
        )
    }
}
