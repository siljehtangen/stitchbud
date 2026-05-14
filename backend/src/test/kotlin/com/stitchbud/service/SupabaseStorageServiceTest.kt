package com.stitchbud.service

import org.junit.jupiter.api.Test

class SupabaseStorageServiceTest {

    private fun makeService(bucket: String = "stitchbud") = SupabaseStorageService(
        supabaseUrl = "https://fake.supabase.co",
        serviceKey = "fake-service-key",
        bucket = bucket,
    )

    // ──────── deleteByUrl ────────

    @Test
    fun `deleteByUrl with non-http url returns without throwing`() {
        val service = makeService()
        service.deleteByUrl("not-a-url")
    }

    @Test
    fun `deleteByUrl with empty string returns without throwing`() {
        val service = makeService()
        service.deleteByUrl("")
    }

    @Test
    fun `deleteByUrl with relative path returns without throwing`() {
        val service = makeService()
        service.deleteByUrl("images/cover.jpg")
    }

    @Test
    fun `deleteByUrl with http url missing bucket path returns without throwing`() {
        // URL doesn't contain /object/public/<bucket>/ marker — extractPath returns null
        val service = makeService()
        service.deleteByUrl("https://fake.supabase.co/storage/v1/object/public/OTHER-BUCKET/file.jpg")
    }

    @Test
    fun `deleteByUrl with valid url fires async request without throwing`() {
        // The async call will fail at the network level but must not propagate
        val service = makeService()
        service.deleteByUrl("https://fake.supabase.co/storage/v1/object/public/stitchbud/cover/image.jpg")
        // No assertion — the call is fire-and-forget; we only verify no exception is thrown
    }

    // ──────── deleteUser ────────

    @Test
    fun `deleteUser with invalid url does not throw`() {
        // HTTP call will fail at network level; the service swallows errors
        val service = makeService()
        service.deleteUser("some-user-id")
    }
}
