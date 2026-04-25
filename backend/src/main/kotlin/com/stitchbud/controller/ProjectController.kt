package com.stitchbud.controller

import com.stitchbud.dto.*
import com.stitchbud.model.ProjectCategory
import com.stitchbud.service.ProjectService
import org.springframework.core.io.FileSystemResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/projects")
class ProjectController(private val projectService: ProjectService) {

    private fun userId() = SecurityContextHolder.getContext().authentication.name

    @GetMapping
    fun getAll(@RequestParam(required = false) category: String?): List<ProjectDto> {
        if (category != null) {
            val cat = runCatching { ProjectCategory.valueOf(category.uppercase()) }
                .getOrElse { throw BadRequestException("Invalid category: $category") }
            return projectService.getProjectsByCategory(cat, userId())
        }
        return projectService.getAllProjects(userId())
    }

    @GetMapping("/{id}")
    fun getOne(@PathVariable id: Long) = projectService.getProject(id, userId())

    @PostMapping
    fun create(@RequestBody req: CreateProjectRequest) = projectService.createProject(req, userId())

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: UpdateProjectRequest) =
        projectService.updateProject(id, req, userId())

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Unit> {
        projectService.deleteProject(id, userId())
        return ResponseEntity.noContent().build()
    }

    @DeleteMapping("/account")
    fun deleteAccount(): ResponseEntity<Unit> {
        projectService.deleteAccount(userId())
        return ResponseEntity.noContent().build()
    }

    @DeleteMapping("/account/data")
    fun resetData(): ResponseEntity<Unit> {
        projectService.deleteAllUserData(userId())
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/materials")
    fun addMaterial(@PathVariable id: Long, @RequestBody req: AddMaterialRequest) =
        projectService.addMaterial(id, req, userId())

    @DeleteMapping("/{id}/materials/{materialId}")
    fun deleteMaterial(@PathVariable id: Long, @PathVariable materialId: Long) =
        projectService.deleteMaterial(id, materialId, userId())

    @PutMapping("/{id}/row-counter")
    fun updateRowCounter(@PathVariable id: Long, @RequestBody req: UpdateRowCounterRequest) =
        projectService.updateRowCounter(id, req, userId())

    @PostMapping("/{id}/pattern-grids")
    fun createPatternGrid(@PathVariable id: Long) =
        projectService.createPatternGrid(id, userId())

    @PutMapping("/{id}/pattern-grids/{gridId}")
    fun updatePatternGrid(@PathVariable id: Long, @PathVariable gridId: Long, @RequestBody req: UpdatePatternGridRequest) =
        projectService.updatePatternGrid(id, gridId, req, userId())

    @DeleteMapping("/{id}/pattern-grids/{gridId}")
    fun deletePatternGrid(@PathVariable id: Long, @PathVariable gridId: Long) =
        projectService.deletePatternGrid(id, gridId, userId())

    @PostMapping("/{id}/files/register")
    fun registerFile(@PathVariable id: Long, @RequestBody req: RegisterProjectFileRequest) =
        projectService.registerFile(id, req, userId())

    @DeleteMapping("/{id}/files/{fileId}")
    fun deleteFile(@PathVariable id: Long, @PathVariable fileId: Long) =
        projectService.deleteFile(id, fileId, userId())

    @PostMapping("/{id}/cover-images/register")
    fun registerCoverImage(@PathVariable id: Long, @RequestBody req: RegisterProjectImageRequest) =
        projectService.registerCoverImage(id, req, userId())

    @PutMapping("/{id}/cover-images/{imageId}/main")
    fun setCoverImageMain(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.setCoverImageMain(id, imageId, userId())

    @DeleteMapping("/{id}/cover-images/{imageId}")
    fun deleteCoverImage(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.deleteCoverImage(id, imageId, userId())

    @PostMapping("/{id}/material-images/register")
    fun registerMaterialImage(@PathVariable id: Long, @RequestBody req: RegisterProjectImageRequest) =
        projectService.registerMaterialImage(id, req, userId())

    @PutMapping("/{id}/material-images/{imageId}/main")
    fun setMaterialImageMain(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.setMaterialImageMain(id, imageId, userId())

    @DeleteMapping("/{id}/material-images/{imageId}")
    fun deleteMaterialImage(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.deleteMaterialImage(id, imageId, userId())
}

@RestController
@RequestMapping("/api/files")
class FileController(private val projectService: ProjectService) {
    @GetMapping("/{projectId}/{storedName}")
    fun serveFile(
        @PathVariable projectId: Long,
        @PathVariable storedName: String
    ): ResponseEntity<FileSystemResource> {
        val userId = SecurityContextHolder.getContext().authentication.name
        val file = projectService.getFilePath(projectId, storedName, userId)
            ?: return ResponseEntity.notFound().build()
        if (!file.exists()) return ResponseEntity.notFound().build()
        val mimeType = try {
            java.nio.file.Files.probeContentType(file.toPath()) ?: "application/octet-stream"
        } catch (_: Exception) { "application/octet-stream" }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"${file.name}\"")
            .contentType(MediaType.parseMediaType(mimeType))
            .body(FileSystemResource(file))
    }
}
