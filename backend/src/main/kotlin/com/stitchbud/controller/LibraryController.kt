package com.stitchbud.controller

import com.stitchbud.dto.CreateLibraryItemRequest
import com.stitchbud.dto.RegisterLibraryImageRequest
import com.stitchbud.dto.UpdateLibraryItemRequest
import com.stitchbud.service.LibraryService
import com.stitchbud.util.currentUserId
import org.springframework.core.io.FileSystemResource
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/library")
class LibraryController(private val libraryService: LibraryService) {

    @GetMapping
    fun getAll() = libraryService.getAll(currentUserId())

    @PostMapping
    fun create(@RequestBody req: CreateLibraryItemRequest) = libraryService.create(req, currentUserId())

    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody req: UpdateLibraryItemRequest) = libraryService.update(id, req, currentUserId())

    @PostMapping("/{id}/images/register")
    fun registerLibraryImage(@PathVariable id: Long, @RequestBody req: RegisterLibraryImageRequest) =
        libraryService.registerLibraryImage(id, req, currentUserId())

    @PutMapping("/{id}/images/{imageId}/main")
    fun setLibraryImageMain(@PathVariable id: Long, @PathVariable imageId: Long) =
        libraryService.setLibraryImageMain(id, imageId, currentUserId())

    @DeleteMapping("/{id}/images/{imageId}")
    fun deleteLibraryImage(@PathVariable id: Long, @PathVariable imageId: Long) =
        libraryService.deleteLibraryImage(id, imageId, currentUserId())

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Unit> {
        libraryService.delete(id, currentUserId())
        return ResponseEntity.noContent().build()
    }
}

@RestController
@RequestMapping("/api/library-images")
class LibraryImageController(private val libraryService: LibraryService) {
    @GetMapping("/{storedName}")
    fun serveImage(@PathVariable storedName: String): ResponseEntity<FileSystemResource> {
        val file = libraryService.getImageFile(storedName)
        return if (file.exists()) serveFileResponse(file) else ResponseEntity.notFound().build()
    }
}
