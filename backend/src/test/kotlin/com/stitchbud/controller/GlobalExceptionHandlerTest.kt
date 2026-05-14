package com.stitchbud.controller

import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import kotlin.test.assertEquals

class GlobalExceptionHandlerTest {

    private val handler = GlobalExceptionHandler()

    @Test
    fun `handleNotFound returns 404 with exception message`() {
        val response = handler.handleNotFound(NotFoundException("Project not found"))
        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
        assertEquals("Project not found", response.body?.message)
    }

    @Test
    fun `handleForbidden returns 403 with exception message`() {
        val response = handler.handleForbidden(ForbiddenException("Access denied"))
        assertEquals(HttpStatus.FORBIDDEN, response.statusCode)
        assertEquals("Access denied", response.body?.message)
    }

    @Test
    fun `handleBadRequest returns 400 with exception message`() {
        val response = handler.handleBadRequest(BadRequestException("Invalid input"))
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        assertEquals("Invalid input", response.body?.message)
    }

    @Test
    fun `handleIllegalArgument returns 400 with exception message`() {
        val response = handler.handleIllegalArgument(IllegalArgumentException("Bad enum value"))
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        assertEquals("Bad enum value", response.body?.message)
    }

    @Test
    fun `handleGeneric returns 500 with generic message`() {
        val response = handler.handleGeneric(RuntimeException("Something exploded"))
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.statusCode)
        assertEquals("An unexpected error occurred", response.body?.message)
    }

    @Test
    fun `handleGeneric returns 500 even when exception message is null`() {
        val response = handler.handleGeneric(RuntimeException())
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.statusCode)
        assertEquals("An unexpected error occurred", response.body?.message)
    }

    @Test
    fun `handleNotFound uses status reason phrase when exception message is null`() {
        val response = handler.handleNotFound(NotFoundException(""))
        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
    }
}
