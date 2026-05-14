package com.stitchbud.controller

import com.stitchbud.dto.*
import com.stitchbud.model.LibraryItemType
import com.stitchbud.service.LibraryService
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import kotlin.test.assertEquals

class LibraryControllerTest {

    private val service: LibraryService = mock()
    private val controller = LibraryController(service)

    companion object {
        const val USER_ID = "user-1"
    }

    @BeforeEach
    fun setUpSecurity() {
        val auth = mock<Authentication>()
        whenever(auth.name).thenReturn(USER_ID)
        SecurityContextHolder.getContext().authentication = auth
    }

    @AfterEach
    fun clearSecurity() = SecurityContextHolder.clearContext()

    private fun makeLibraryItemDto(id: Long = 1L, name: String = "Blue Yarn") = LibraryItemDto(
        id = id,
        itemType = LibraryItemType.YARN,
        name = name,
        createdAt = 0,
    )

    // ──────── getAll ────────

    @Test
    fun `getAll delegates to service with current user id`() {
        whenever(service.getAll(USER_ID)).thenReturn(listOf(makeLibraryItemDto()))

        val result = controller.getAll()

        verify(service).getAll(USER_ID)
        assertEquals(1, result.size)
    }

    @Test
    fun `getAll returns empty list when user has no library items`() {
        whenever(service.getAll(USER_ID)).thenReturn(emptyList())

        val result = controller.getAll()

        assertEquals(0, result.size)
    }

    // ──────── create ────────

    @Test
    fun `create delegates to service and returns created item`() {
        val req = CreateLibraryItemRequest(itemType = LibraryItemType.YARN, name = "Merino")
        whenever(service.create(req, USER_ID)).thenReturn(makeLibraryItemDto(name = "Merino"))

        val result = controller.create(req)

        verify(service).create(req, USER_ID)
        assertEquals("Merino", result.name)
    }

    // ──────── update ────────

    @Test
    fun `update delegates to service with id and userId`() {
        val req = UpdateLibraryItemRequest(name = "Updated Yarn")
        whenever(service.update(1L, req, USER_ID)).thenReturn(makeLibraryItemDto(name = "Updated Yarn"))

        val result = controller.update(1L, req)

        verify(service).update(1L, req, USER_ID)
        assertEquals("Updated Yarn", result.name)
    }

    // ──────── images ────────

    @Test
    fun `registerLibraryImage delegates to service`() {
        val req = RegisterLibraryImageRequest(originalName = "yarn.jpg", fileUrl = "http://example.com/yarn.jpg")
        whenever(service.registerLibraryImage(1L, req, USER_ID)).thenReturn(makeLibraryItemDto())

        controller.registerLibraryImage(1L, req)

        verify(service).registerLibraryImage(1L, req, USER_ID)
    }

    @Test
    fun `setLibraryImageMain delegates to service`() {
        whenever(service.setLibraryImageMain(1L, 2L, USER_ID)).thenReturn(makeLibraryItemDto())

        controller.setLibraryImageMain(1L, 2L)

        verify(service).setLibraryImageMain(1L, 2L, USER_ID)
    }

    @Test
    fun `deleteLibraryImage delegates to service`() {
        whenever(service.deleteLibraryImage(1L, 2L, USER_ID)).thenReturn(makeLibraryItemDto())

        controller.deleteLibraryImage(1L, 2L)

        verify(service).deleteLibraryImage(1L, 2L, USER_ID)
    }

    // ──────── delete ────────

    @Test
    fun `delete delegates to service and returns 204`() {
        val response = controller.delete(1L)

        verify(service).delete(1L, USER_ID)
        assertEquals(HttpStatus.NO_CONTENT, response.statusCode)
    }
}
