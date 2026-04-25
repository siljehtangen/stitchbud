package com.stitchbud.controller

import com.stitchbud.dto.CreateLibraryItemRequest
import com.stitchbud.dto.RegisterLibraryImageRequest
import com.stitchbud.dto.UpdateLibraryItemRequest
import com.stitchbud.service.LibraryService
import org.springframework.core.io.FileSystemResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/library")
class LibraryController(private val libraryService: LibraryService) {

    private fun userId() = SecurityContextHolder.getContext().authentication.name

    @GetMapping
    fun getAll() = libraryService.getAll(userId())

    @PostMapping
    fun create(@RequestBody req: CreateLibraryItemRequest) = libraryService.create(req, userId())

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: UpdateLibraryItemRequest) = libraryService.update(id, req, userId())

    @PostMapping("/{id}/images/register")
    fun registerLibraryImage(@PathVariable id: Long, @RequestBody req: RegisterLibraryImageRequest) =
        libraryService.registerLibraryImage(id, req, userId())

    @PutMapping("/{id}/images/{imageId}/main")
    fun setLibraryImageMain(@PathVariable id: Long, @PathVariable imageId: Long) =
        libraryService.setLibraryImageMain(id, imageId, userId())

    @DeleteMapping("/{id}/images/{imageId}")
    fun deleteLibraryImage(@PathVariable id: Long, @PathVariable imageId: Long) =
        libraryService.deleteLibraryImage(id, imageId, userId())

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Unit> {
        libraryService.delete(id, userId())
        return ResponseEntity.noContent().build()
    }
}

@RestController
@RequestMapping("/api/library-images")
class LibraryImageController(private val libraryService: LibraryService) {
    @GetMapping("/{storedName}")
    fun serveImage(@PathVariable storedName: String): ResponseEntity<FileSystemResource> {
        val file = libraryService.getImageFile(storedName)
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
