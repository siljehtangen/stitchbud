package com.stitchbud.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

@Service
class SupabaseStorageService(
    @Value("\${app.supabase-url}") private val supabaseUrl: String,
    @Value("\${app.supabase-service-key}") private val serviceKey: String,
    @Value("\${app.storage-bucket}") private val bucket: String
) {
    private val client = HttpClient.newHttpClient()
    private val logger = LoggerFactory.getLogger(SupabaseStorageService::class.java)

    /**
     * Deletes a file from Supabase Storage asynchronously.
     * Uses sendAsync so the calling thread is not blocked while waiting on the HTTP response.
     * The result is intentionally ignored — storage cleanup failures are non-fatal.
     */
    fun deleteByUrl(url: String) {
        if (!url.startsWith("http")) return
        val path = extractPath(url) ?: return
        try {
            val request = HttpRequest.newBuilder()
                .uri(URI.create("$supabaseUrl/storage/v1/object/$bucket/$path"))
                .header("Authorization", "Bearer $serviceKey")
                .DELETE()
                .build()
            client.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                .whenComplete { res, ex ->
                    when {
                        ex != null -> logger.warn("Storage delete failed for $path: ${ex.message}")
                        res.statusCode() >= 400 -> logger.warn("Storage delete returned ${res.statusCode()} for $path")
                    }
                }
        } catch (e: Exception) {
            logger.warn("Storage delete request could not be built for $path: ${e.message}")
        }
    }

    fun deleteUser(userId: String) {
        try {
            val request = HttpRequest.newBuilder()
                .uri(URI.create("$supabaseUrl/auth/v1/admin/users/$userId"))
                .header("Authorization", "Bearer $serviceKey")
                .header("apikey", serviceKey)
                .DELETE()
                .build()
            val res = client.send(request, HttpResponse.BodyHandlers.discarding())
            if (res.statusCode() >= 400) logger.warn("Supabase user delete returned ${res.statusCode()} for $userId")
        } catch (e: Exception) {
            logger.warn("Failed to delete Supabase user $userId: ${e.message}")
        }
    }

    private fun extractPath(url: String): String? {
        val marker = "/object/public/$bucket/"
        val idx = url.indexOf(marker)
        if (idx == -1) return null
        return url.substring(idx + marker.length)
    }
}
