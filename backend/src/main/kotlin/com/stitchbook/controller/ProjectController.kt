package com.stitchbook.controller

import com.stitchbook.dto.*
import com.stitchbook.model.ProjectCategory
import com.stitchbook.service.ProjectService
import org.springframework.core.io.FileSystemResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = ["http://localhost:5173"])
class ProjectController(private val projectService: ProjectService) {

    @GetMapping
    fun getAll(@RequestParam(required = false) category: String?): List<ProjectDto> =
        if (category != null) projectService.getProjectsByCategory(ProjectCategory.valueOf(category.uppercase()))
        else projectService.getAllProjects()

    @GetMapping("/{id}")
    fun getOne(@PathVariable id: Long) = projectService.getProject(id)

    @PostMapping
    fun create(@RequestBody req: CreateProjectRequest) = projectService.createProject(req)

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: UpdateProjectRequest) =
        projectService.updateProject(id, req)

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Unit> {
        projectService.deleteProject(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/materials")
    fun addMaterial(@PathVariable id: Long, @RequestBody req: AddMaterialRequest) =
        projectService.addMaterial(id, req)

    @DeleteMapping("/{id}/materials/{materialId}")
    fun deleteMaterial(@PathVariable id: Long, @PathVariable materialId: Long) =
        projectService.deleteMaterial(id, materialId)

    @PutMapping("/{id}/row-counter")
    fun updateRowCounter(@PathVariable id: Long, @RequestBody req: UpdateRowCounterRequest) =
        projectService.updateRowCounter(id, req)

    @PutMapping("/{id}/pattern-grid")
    fun updatePatternGrid(@PathVariable id: Long, @RequestBody req: UpdatePatternGridRequest) =
        projectService.updatePatternGrid(id, req)

    @PostMapping("/{id}/files", consumes = ["multipart/form-data"])
    fun uploadFile(@PathVariable id: Long, @RequestParam("file") file: MultipartFile) =
        projectService.uploadFile(id, file)

    @DeleteMapping("/{id}/files/{fileId}")
    fun deleteFile(@PathVariable id: Long, @PathVariable fileId: Long) =
        projectService.deleteFile(id, fileId)
}

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = ["http://localhost:5173"])
class FileController(private val projectService: ProjectService) {
    @GetMapping("/{projectId}/{storedName}")
    fun serveFile(
        @PathVariable projectId: Long,
        @PathVariable storedName: String
    ): ResponseEntity<FileSystemResource> {
        val file = projectService.getFilePath(projectId, storedName)
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
