package com.stitchbud.controller

import com.stitchbud.dto.*
import com.stitchbud.model.ProjectCategory
import com.stitchbud.service.ProjectService
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import kotlin.test.assertEquals

class ProjectControllerTest {

    private val service: ProjectService = mock()
    private val controller = ProjectController(service)

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

    private fun makeProjectDto(id: Long = 1L, name: String = "Test") = ProjectDto(
        id = id,
        name = name,
        category = ProjectCategory.KNITTING,
        createdAt = 0,
        updatedAt = 0,
        userId = USER_ID,
    )

    // ──────── getAll ────────

    @Test
    fun `getAll without category delegates to getAllProjects`() {
        whenever(service.getAllProjects(USER_ID)).thenReturn(listOf(makeProjectDto()))

        val result = controller.getAll(null)

        verify(service).getAllProjects(USER_ID)
        assertEquals(1, result.size)
    }

    @Test
    fun `getAll with valid category delegates to getProjectsByCategory`() {
        whenever(service.getProjectsByCategory(ProjectCategory.CROCHET, USER_ID)).thenReturn(emptyList())

        controller.getAll("CROCHET")

        verify(service).getProjectsByCategory(ProjectCategory.CROCHET, USER_ID)
    }

    @Test
    fun `getAll with lowercase category is case-insensitive`() {
        whenever(service.getProjectsByCategory(ProjectCategory.KNITTING, USER_ID)).thenReturn(emptyList())

        controller.getAll("knitting")

        verify(service).getProjectsByCategory(ProjectCategory.KNITTING, USER_ID)
    }

    @Test
    fun `getAll with invalid category throws BadRequestException`() {
        assertThrows<BadRequestException> { controller.getAll("WEAVING") }
    }

    // ──────── getOne ────────

    @Test
    fun `getOne delegates to getProject with correct id and userId`() {
        whenever(service.getProject(42L, USER_ID)).thenReturn(makeProjectDto(id = 42L))

        val result = controller.getOne(42L)

        verify(service).getProject(42L, USER_ID)
        assertEquals(42L, result.id)
    }

    // ──────── create ────────

    @Test
    fun `create delegates to createProject`() {
        val req = CreateProjectRequest(name = "New", startDate = 0L, category = ProjectCategory.KNITTING)
        whenever(service.createProject(req, USER_ID)).thenReturn(makeProjectDto(name = "New"))

        val result = controller.create(req)

        verify(service).createProject(req, USER_ID)
        assertEquals("New", result.name)
    }

    // ──────── update ────────

    @Test
    fun `update delegates to updateProject`() {
        val req = UpdateProjectRequest(name = "Updated")
        whenever(service.updateProject(1L, req, USER_ID)).thenReturn(makeProjectDto(name = "Updated"))

        val result = controller.update(1L, req)

        verify(service).updateProject(1L, req, USER_ID)
        assertEquals("Updated", result.name)
    }

    // ──────── delete ────────

    @Test
    fun `delete delegates to deleteProject and returns 204`() {
        val response = controller.delete(1L)

        verify(service).deleteProject(1L, USER_ID)
        assertEquals(HttpStatus.NO_CONTENT, response.statusCode)
    }

    // ──────── deleteAccount / resetData ────────

    @Test
    fun `deleteAccount delegates to deleteAccount and returns 204`() {
        val response = controller.deleteAccount()

        verify(service).deleteAccount(USER_ID)
        assertEquals(HttpStatus.NO_CONTENT, response.statusCode)
    }

    @Test
    fun `resetData delegates to deleteAllUserData and returns 204`() {
        val response = controller.resetData()

        verify(service).deleteAllUserData(USER_ID)
        assertEquals(HttpStatus.NO_CONTENT, response.statusCode)
    }

    // ──────── materials ────────

    @Test
    fun `addMaterial delegates to service`() {
        val req = AddMaterialRequest(name = "Wool", type = "yarn")
        whenever(service.addMaterial(1L, req, USER_ID)).thenReturn(makeProjectDto())

        controller.addMaterial(1L, req)

        verify(service).addMaterial(1L, req, USER_ID)
    }

    @Test
    fun `deleteMaterial delegates to service`() {
        whenever(service.deleteMaterial(1L, 5L, USER_ID)).thenReturn(makeProjectDto())

        controller.deleteMaterial(1L, 5L)

        verify(service).deleteMaterial(1L, 5L, USER_ID)
    }

    // ──────── row counter ────────

    @Test
    fun `updateRowCounter delegates to service`() {
        val req = UpdateRowCounterRequest(stitchesPerRound = 8, totalRounds = 20, checkedStitches = "[]")
        whenever(service.updateRowCounter(1L, req, USER_ID)).thenReturn(makeProjectDto())

        controller.updateRowCounter(1L, req)

        verify(service).updateRowCounter(1L, req, USER_ID)
    }

    // ──────── pattern grids ────────

    @Test
    fun `createPatternGrid delegates to service`() {
        whenever(service.createPatternGrid(1L, USER_ID)).thenReturn(makeProjectDto())

        controller.createPatternGrid(1L)

        verify(service).createPatternGrid(1L, USER_ID)
    }

    @Test
    fun `updatePatternGrid delegates to service`() {
        val req = UpdatePatternGridRequest(rows = 5, cols = 5, cellData = "[]")
        whenever(service.updatePatternGrid(1L, 2L, req, USER_ID)).thenReturn(makeProjectDto())

        controller.updatePatternGrid(1L, 2L, req)

        verify(service).updatePatternGrid(1L, 2L, req, USER_ID)
    }

    @Test
    fun `deletePatternGrid delegates to service`() {
        whenever(service.deletePatternGrid(1L, 2L, USER_ID)).thenReturn(makeProjectDto())

        controller.deletePatternGrid(1L, 2L)

        verify(service).deletePatternGrid(1L, 2L, USER_ID)
    }

    // ──────── cover images ────────

    @Test
    fun `registerCoverImage delegates to service`() {
        val req = RegisterProjectImageRequest(originalName = "cover.jpg", fileUrl = "http://example.com/cover.jpg")
        whenever(service.registerCoverImage(1L, req, USER_ID)).thenReturn(makeProjectDto())

        controller.registerCoverImage(1L, req)

        verify(service).registerCoverImage(1L, req, USER_ID)
    }

    @Test
    fun `setCoverImageMain delegates to service`() {
        whenever(service.setCoverImageMain(1L, 3L, USER_ID)).thenReturn(makeProjectDto())

        controller.setCoverImageMain(1L, 3L)

        verify(service).setCoverImageMain(1L, 3L, USER_ID)
    }

    @Test
    fun `deleteCoverImage delegates to service`() {
        whenever(service.deleteCoverImage(1L, 3L, USER_ID)).thenReturn(makeProjectDto())

        controller.deleteCoverImage(1L, 3L)

        verify(service).deleteCoverImage(1L, 3L, USER_ID)
    }
}
