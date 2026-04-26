package com.stitchbud.controller

import org.springframework.core.io.FileSystemResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import java.io.File

fun serveFileResponse(file: File): ResponseEntity<FileSystemResource> {
    val mimeType = try {
        java.nio.file.Files.probeContentType(file.toPath()) ?: "application/octet-stream"
    } catch (_: Exception) { "application/octet-stream" }
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"${file.name}\"")
        .contentType(MediaType.parseMediaType(mimeType))
        .body(FileSystemResource(file))
}
