package com.stitchbud.controller

import com.stitchbud.dto.*
import com.stitchbud.model.ProjectCategory
import com.stitchbud.service.ProjectService
import com.stitchbud.util.currentUserId
import org.springframework.core.io.FileSystemResource
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/projects")
class ProjectController(private val projectService: ProjectService) {

    @GetMapping
    fun getAll(@RequestParam(required = false) category: String?): List<ProjectDto> =
        category
            ?.let { runCatching { ProjectCategory.valueOf(it.uppercase()) }.getOrElse { throw BadRequestException("Invalid category: $category") } }
            ?.let { projectService.getProjectsByCategory(it, currentUserId()) }
            ?: projectService.getAllProjects(currentUserId())

    @GetMapping("/{id}")
    fun getOne(@PathVariable id: Long) = projectService.getProject(id, currentUserId())

    @PostMapping
    fun create(@RequestBody req: CreateProjectRequest) = projectService.createProject(req, currentUserId())

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: UpdateProjectRequest) =
        projectService.updateProject(id, req, currentUserId())

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Unit> {
        projectService.deleteProject(id, currentUserId())
        return ResponseEntity.noContent().build()
    }

    @DeleteMapping("/account")
    fun deleteAccount(): ResponseEntity<Unit> {
        projectService.deleteAccount(currentUserId())
        return ResponseEntity.noContent().build()
    }

    @DeleteMapping("/account/data")
    fun resetData(): ResponseEntity<Unit> {
        projectService.deleteAllUserData(currentUserId())
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/materials")
    fun addMaterial(@PathVariable id: Long, @RequestBody req: AddMaterialRequest) =
        projectService.addMaterial(id, req, currentUserId())

    @DeleteMapping("/{id}/materials/{materialId}")
    fun deleteMaterial(@PathVariable id: Long, @PathVariable materialId: Long) =
        projectService.deleteMaterial(id, materialId, currentUserId())

    @PutMapping("/{id}/row-counter")
    fun updateRowCounter(@PathVariable id: Long, @RequestBody req: UpdateRowCounterRequest) =
        projectService.updateRowCounter(id, req, currentUserId())

    @PostMapping("/{id}/pattern-grids")
    fun createPatternGrid(@PathVariable id: Long) =
        projectService.createPatternGrid(id, currentUserId())

    @PutMapping("/{id}/pattern-grids/{gridId}")
    fun updatePatternGrid(@PathVariable id: Long, @PathVariable gridId: Long, @RequestBody req: UpdatePatternGridRequest) =
        projectService.updatePatternGrid(id, gridId, req, currentUserId())

    @DeleteMapping("/{id}/pattern-grids/{gridId}")
    fun deletePatternGrid(@PathVariable id: Long, @PathVariable gridId: Long) =
        projectService.deletePatternGrid(id, gridId, currentUserId())

    @PostMapping("/{id}/files/register")
    fun registerFile(@PathVariable id: Long, @RequestBody req: RegisterProjectFileRequest) =
        projectService.registerFile(id, req, currentUserId())

    @DeleteMapping("/{id}/files/{fileId}")
    fun deleteFile(@PathVariable id: Long, @PathVariable fileId: Long) =
        projectService.deleteFile(id, fileId, currentUserId())

    @PostMapping("/{id}/cover-images/register")
    fun registerCoverImage(@PathVariable id: Long, @RequestBody req: RegisterProjectImageRequest) =
        projectService.registerCoverImage(id, req, currentUserId())

    @PutMapping("/{id}/cover-images/{imageId}/main")
    fun setCoverImageMain(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.setCoverImageMain(id, imageId, currentUserId())

    @DeleteMapping("/{id}/cover-images/{imageId}")
    fun deleteCoverImage(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.deleteCoverImage(id, imageId, currentUserId())

    @PostMapping("/{id}/material-images/register")
    fun registerMaterialImage(@PathVariable id: Long, @RequestBody req: RegisterProjectImageRequest) =
        projectService.registerMaterialImage(id, req, currentUserId())

    @PutMapping("/{id}/material-images/{imageId}/main")
    fun setMaterialImageMain(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.setMaterialImageMain(id, imageId, currentUserId())

    @DeleteMapping("/{id}/material-images/{imageId}")
    fun deleteMaterialImage(@PathVariable id: Long, @PathVariable imageId: Long) =
        projectService.deleteMaterialImage(id, imageId, currentUserId())
}

@RestController
@RequestMapping("/api/files")
class FileController(private val projectService: ProjectService) {
    @GetMapping("/{projectId}/{storedName}")
    fun serveFile(
        @PathVariable projectId: Long,
        @PathVariable storedName: String
    ): ResponseEntity<FileSystemResource> {
        val file = projectService.getFilePath(projectId, storedName, currentUserId())
            ?.takeIf { it.exists() }
            ?: return ResponseEntity.notFound().build()
        return serveFileResponse(file)
    }
}
