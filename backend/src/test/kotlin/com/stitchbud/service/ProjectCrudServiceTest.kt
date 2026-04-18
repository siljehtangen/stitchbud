package com.stitchbud.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.CreateProjectRequest
import com.stitchbud.dto.UpdateProjectRequest
import com.stitchbud.model.Project
import com.stitchbud.model.ProjectCategory
import com.stitchbud.model.ProjectImage
import com.stitchbud.repository.MaterialRepository
import com.stitchbud.repository.PatternGridRepository
import com.stitchbud.repository.ProjectFileRepository
import com.stitchbud.repository.ProjectImageRepository
import com.stitchbud.repository.ProjectRepository
import com.stitchbud.repository.RowCounterRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProjectCrudServiceTest {

    private val projectRepo: ProjectRepository = mock()
    private val materialRepo: MaterialRepository = mock()
    private val projectFileRepo: ProjectFileRepository = mock()
    private val projectImageRepo: ProjectImageRepository = mock()
    private val patternGridRepo: PatternGridRepository = mock()
    private val rowCounterRepo: RowCounterRepository = mock()
    private val storageService: SupabaseStorageService = mock()
    private val libraryService: LibraryService = mock()
    private val objectMapper = jacksonObjectMapper()

    private lateinit var service: ProjectService

    companion object {
        const val USER_ID = "user-1"
        const val PROJECT_ID = 1L
    }

    @BeforeEach
    fun setUp() {
        service = ProjectService(
            projectRepository = projectRepo,
            materialRepository = materialRepo,
            projectFileRepository = projectFileRepo,
            projectImageRepository = projectImageRepo,
            patternGridRepository = patternGridRepo,
            rowCounterRepository = rowCounterRepo,
            storageService = storageService,
            libraryService = libraryService,
            objectMapper = objectMapper,
            uploadDir = "/tmp/test-uploads"
        )
    }

    private fun makeProject(id: Long = PROJECT_ID, userId: String = USER_ID) = Project(
        id = id, userId = userId, name = "Test Project", category = ProjectCategory.KNITTING
    )

    private fun stubFindProject(project: Project) {
        whenever(projectRepo.findByIdAndUserId(project.id, project.userId)).thenReturn(Optional.of(project))
        whenever(projectRepo.save(any<Project>())).doAnswer { it.arguments[0] as Project }
    }

    // ──────── getAllProjects ────────

    @Test
    fun `getAllProjects returns empty list when user has no projects`() {
        whenever(projectRepo.findByUserIdOrderByUpdatedAtDesc(USER_ID)).thenReturn(emptyList())

        assertTrue(service.getAllProjects(USER_ID).isEmpty())
    }

    @Test
    fun `getAllProjects returns mapped DTOs for each project`() {
        val p1 = makeProject(id = 1L)
        val p2 = makeProject(id = 2L).also { it.name = "Second Project" }
        whenever(projectRepo.findByUserIdOrderByUpdatedAtDesc(USER_ID)).thenReturn(listOf(p1, p2))

        val result = service.getAllProjects(USER_ID)

        assertEquals(2, result.size)
        assertEquals("Test Project", result[0].name)
        assertEquals("Second Project", result[1].name)
    }

    // ──────── getProject ────────

    @Test
    fun `getProject throws NotFoundException when project does not belong to user`() {
        whenever(projectRepo.findByIdAndUserId(PROJECT_ID, USER_ID)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> { service.getProject(PROJECT_ID, USER_ID) }
    }

    @Test
    fun `getProject returns dto for a valid project`() {
        val project = makeProject()
        whenever(projectRepo.findByIdAndUserId(PROJECT_ID, USER_ID)).thenReturn(Optional.of(project))

        val dto = service.getProject(PROJECT_ID, USER_ID)

        assertEquals(PROJECT_ID, dto.id)
        assertEquals("Test Project", dto.name)
    }

    // ──────── createProject ────────

    @Test
    fun `createProject initialises a row counter and one pattern grid`() {
        whenever(projectRepo.save(any<Project>())).doAnswer { it.arguments[0] as Project }

        val req = CreateProjectRequest(name = "New Project", startDate = 0L, category = ProjectCategory.KNITTING)
        val dto = service.createProject(req, USER_ID)

        assertNotNull(dto.rowCounter)
        assertEquals(1, dto.patternGrids.size)
    }

    // ──────── updateProject ────────

    @Test
    fun `updateProject clears endDate when clearEndDate is true`() {
        val project = makeProject().also { it.endDate = 99999L }
        stubFindProject(project)

        service.updateProject(PROJECT_ID, UpdateProjectRequest(clearEndDate = true), USER_ID)

        assertNull(project.endDate)
    }

    @Test
    fun `updateProject only updates the fields that are provided`() {
        val project = makeProject().also {
            it.description = "original description"
            it.notes = "original notes"
        }
        stubFindProject(project)

        service.updateProject(PROJECT_ID, UpdateProjectRequest(name = "New Name"), USER_ID)

        assertEquals("New Name", project.name)
        assertEquals("original description", project.description)
        assertEquals("original notes", project.notes)
    }

    @Test
    fun `updateProject sanitizes and limits pinterestBoardUrls to 3 non-blank entries`() {
        val project = makeProject()
        stubFindProject(project)

        val urls = listOf("http://pin1", "http://pin2", "http://pin3", "http://pin4", "")
        service.updateProject(PROJECT_ID, UpdateProjectRequest(pinterestBoardUrls = urls), USER_ID)

        val saved = objectMapper.readValue(project.pinterestBoardUrls, List::class.java)
        assertEquals(3, saved.size)
    }

    @Test
    fun `updateProject sets isPublic flag`() {
        val project = makeProject().also { it.isPublic = false }
        stubFindProject(project)

        service.updateProject(PROJECT_ID, UpdateProjectRequest(isPublic = true), USER_ID)

        assertTrue(project.isPublic)
    }

    // ──────── deleteProject ────────

    @Test
    fun `deleteProject calls deleteById after cleanup`() {
        val project = makeProject()
        stubFindProject(project)

        service.deleteProject(PROJECT_ID, USER_ID)

        verify(projectRepo).deleteById(PROJECT_ID)
    }

    @Test
    fun `deleteProject calls storageService for each image before deleting`() {
        val project = makeProject()
        project.images.add(ProjectImage(id = 1L, storedName = "http://img1", originalName = "a.jpg", section = "cover", isMain = true, project = project))
        stubFindProject(project)

        service.deleteProject(PROJECT_ID, USER_ID)

        verify(storageService).deleteByUrl("http://img1")
        verify(projectRepo).deleteById(PROJECT_ID)
    }

    // ──────── deleteAllUserData ────────

    @Test
    fun `deleteAllUserData removes all project records and delegates to libraryService`() {
        whenever(projectRepo.findByUserIdOrderByUpdatedAtDesc(USER_ID)).thenReturn(emptyList())

        service.deleteAllUserData(USER_ID)

        verify(projectImageRepo).deleteAllByProjectUserId(USER_ID)
        verify(materialRepo).deleteAllByProjectUserId(USER_ID)
        verify(projectFileRepo).deleteAllByProjectUserId(USER_ID)
        verify(patternGridRepo).deleteAllByProjectUserId(USER_ID)
        verify(rowCounterRepo).deleteAllByProjectUserId(USER_ID)
        verify(projectRepo).deleteAllByUserId(USER_ID)
        verify(libraryService).deleteAllForUser(USER_ID)
    }
}
