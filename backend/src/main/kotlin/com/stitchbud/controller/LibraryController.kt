package com.stitchbud.controller

import com.stitchbud.dto.CreateLibraryItemRequest
import com.stitchbud.service.LibraryService
import org.springframework.core.io.FileSystemResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/library")
@CrossOrigin(origins = ["http://localhost:5173"])
class LibraryController(private val libraryService: LibraryService) {

    @GetMapping
    fun getAll() = libraryService.getAll()

    @PostMapping
    fun create(@RequestBody req: CreateLibraryItemRequest) = libraryService.create(req)

    @PostMapping("/{id}/image", consumes = ["multipart/form-data"])
    fun uploadImage(@PathVariable id: Long, @RequestParam("file") file: MultipartFile) =
        libraryService.uploadImage(id, file)

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Unit> {
        libraryService.delete(id)
        return ResponseEntity.noContent().build()
    }
}

@RestController
@RequestMapping("/api/library-images")
@CrossOrigin(origins = ["http://localhost:5173"])
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
