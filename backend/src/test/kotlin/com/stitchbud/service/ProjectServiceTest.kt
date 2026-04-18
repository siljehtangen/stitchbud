package com.stitchbud.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.RegisterProjectImageRequest
import com.stitchbud.dto.UpdatePatternGridRequest
import com.stitchbud.dto.UpdateProjectRequest
import com.stitchbud.model.Material
import com.stitchbud.model.PatternGrid
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
import org.mockito.kotlin.mock
import org.mockito.kotlin.thenAnswer
import org.mockito.kotlin.whenever
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProjectServiceTest {

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
        id = id,
        userId = userId,
        name = "Test Project",
        category = ProjectCategory.KNITTING
    )

    /** Stubs findByIdAndUserId and save so the project is returned as-is. */
    private fun stubFindProject(project: Project) {
        whenever(projectRepo.findByIdAndUserId(project.id, project.userId)).thenReturn(Optional.of(project))
        whenever(projectRepo.save(any<Project>())).thenAnswer { it.arguments[0] as Project }
    }

    // ──────── updatePatternGrid – dimension validation ────────

    @Test
    fun `updatePatternGrid throws BadRequestException when rows is 0`() {
        val req = UpdatePatternGridRequest(rows = 0, cols = 10, cellData = "[]")
        assertThrows<BadRequestException> { service.updatePatternGrid(PROJECT_ID, 1L, req, USER_ID) }
    }

    @Test
    fun `updatePatternGrid throws BadRequestException when rows exceeds 200`() {
        val req = UpdatePatternGridRequest(rows = 201, cols = 10, cellData = "[]")
        assertThrows<BadRequestException> { service.updatePatternGrid(PROJECT_ID, 1L, req, USER_ID) }
    }

    @Test
    fun `updatePatternGrid throws BadRequestException when cols is 0`() {
        val req = UpdatePatternGridRequest(rows = 10, cols = 0, cellData = "[]")
        assertThrows<BadRequestException> { service.updatePatternGrid(PROJECT_ID, 1L, req, USER_ID) }
    }

    @Test
    fun `updatePatternGrid throws BadRequestException when cols exceeds 200`() {
        val req = UpdatePatternGridRequest(rows = 10, cols = 201, cellData = "[]")
        assertThrows<BadRequestException> { service.updatePatternGrid(PROJECT_ID, 1L, req, USER_ID) }
    }

    @Test
    fun `updatePatternGrid accepts boundary value of 1`() {
        val project = makeProject()
        val grid = PatternGrid(id = 10L, project = project)
        project.patternGrids.add(grid)
        stubFindProject(project)

        val req = UpdatePatternGridRequest(rows = 1, cols = 1, cellData = "[]")
        service.updatePatternGrid(PROJECT_ID, 10L, req, USER_ID)

        assertEquals(1, grid.rows)
        assertEquals(1, grid.cols)
    }

    @Test
    fun `updatePatternGrid accepts boundary value of 200`() {
        val project = makeProject()
        val grid = PatternGrid(id = 10L, project = project)
        project.patternGrids.add(grid)
        stubFindProject(project)

        val req = UpdatePatternGridRequest(rows = 200, cols = 200, cellData = "{}")
        service.updatePatternGrid(PROJECT_ID, 10L, req, USER_ID)

        assertEquals(200, grid.rows)
        assertEquals(200, grid.cols)
        assertEquals("{}", grid.cellData)
    }

    @Test
    fun `updatePatternGrid throws NotFoundException when grid not found on project`() {
        val project = makeProject()
        stubFindProject(project)

        val req = UpdatePatternGridRequest(rows = 10, cols = 10, cellData = "[]")
        assertThrows<NotFoundException> { service.updatePatternGrid(PROJECT_ID, 999L, req, USER_ID) }
    }

    // ──────── registerCoverImage ────────

    @Test
    fun `registerCoverImage throws BadRequest when max 3 images already reached`() {
        val project = makeProject()
        repeat(3) { i ->
            project.images.add(ProjectImage(id = i + 1L, storedName = "http://url$i", originalName = "img$i.jpg", section = "cover", isMain = i == 0, project = project))
        }
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "new.jpg", fileUrl = "http://new")
        assertThrows<BadRequestException> { service.registerCoverImage(PROJECT_ID, req, USER_ID) }
    }

    @Test
    fun `registerCoverImage sets first cover image as main`() {
        val project = makeProject()
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "first.jpg", fileUrl = "http://first")
        val dto = service.registerCoverImage(PROJECT_ID, req, USER_ID)

        assertTrue(dto.coverImages.single().isMain)
    }

    @Test
    fun `registerCoverImage does not set second image as main`() {
        val project = makeProject()
        project.images.add(ProjectImage(id = 1L, storedName = "http://first", originalName = "first.jpg", section = "cover", isMain = true, project = project))
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "second.jpg", fileUrl = "http://second")
        val dto = service.registerCoverImage(PROJECT_ID, req, USER_ID)

        val second = dto.coverImages.find { it.storedName == "http://second" }!!
        assertFalse(second.isMain)
    }

    // ──────── setCoverImageMain ────────

    @Test
    fun `setCoverImageMain sets target as main and clears the previous main`() {
        val project = makeProject()
        project.images.add(ProjectImage(id = 1L, storedName = "http://a", originalName = "a.jpg", section = "cover", isMain = true, project = project))
        project.images.add(ProjectImage(id = 2L, storedName = "http://b", originalName = "b.jpg", section = "cover", isMain = false, project = project))
        stubFindProject(project)

        service.setCoverImageMain(PROJECT_ID, 2L, USER_ID)

        assertFalse(project.images.find { it.id == 1L }!!.isMain)
        assertTrue(project.images.find { it.id == 2L }!!.isMain)
    }

    @Test
    fun `setCoverImageMain throws NotFoundException when image not found`() {
        val project = makeProject()
        stubFindProject(project)

        assertThrows<NotFoundException> { service.setCoverImageMain(PROJECT_ID, 999L, USER_ID) }
    }

    // ──────── deleteCoverImage ────────

    @Test
    fun `deleteCoverImage promotes next cover image as main when main is deleted`() {
        val project = makeProject()
        project.images.add(ProjectImage(id = 1L, storedName = "http://img1", originalName = "a.jpg", section = "cover", isMain = true, project = project))
        project.images.add(ProjectImage(id = 2L, storedName = "http://img2", originalName = "b.jpg", section = "cover", isMain = false, project = project))
        stubFindProject(project)

        service.deleteCoverImage(PROJECT_ID, 1L, USER_ID)

        val remaining = project.images.filter { it.section == "cover" }
        assertEquals(1, remaining.size)
        assertTrue(remaining.single().isMain)
        assertEquals(2L, remaining.single().id)
    }

    @Test
    fun `deleteCoverImage does not change main when a non-main image is deleted`() {
        val project = makeProject()
        project.images.add(ProjectImage(id = 1L, storedName = "http://img1", originalName = "a.jpg", section = "cover", isMain = true, project = project))
        project.images.add(ProjectImage(id = 2L, storedName = "http://img2", originalName = "b.jpg", section = "cover", isMain = false, project = project))
        stubFindProject(project)

        service.deleteCoverImage(PROJECT_ID, 2L, USER_ID)

        val remaining = project.images.filter { it.section == "cover" }
        assertEquals(1, remaining.size)
        assertTrue(remaining.single().isMain)
        assertEquals(1L, remaining.single().id)
    }

    @Test
    fun `deleteCoverImage throws NotFoundException when image not found`() {
        val project = makeProject()
        stubFindProject(project)

        assertThrows<NotFoundException> { service.deleteCoverImage(PROJECT_ID, 999L, USER_ID) }
    }

    // ──────── registerMaterialImage ────────

    @Test
    fun `registerMaterialImage throws BadRequest when materialId is null`() {
        val project = makeProject()
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "img.jpg", fileUrl = "http://img", materialId = null)
        assertThrows<BadRequestException> { service.registerMaterialImage(PROJECT_ID, req, USER_ID) }
    }

    @Test
    fun `registerMaterialImage throws NotFoundException when material does not exist on project`() {
        val project = makeProject()
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "img.jpg", fileUrl = "http://img", materialId = 99L)
        assertThrows<NotFoundException> { service.registerMaterialImage(PROJECT_ID, req, USER_ID) }
    }

    @Test
    fun `registerMaterialImage throws BadRequest when max images reached for that material`() {
        val project = makeProject()
        val material = Material(id = 5L, name = "Yarn", type = "YARN", project = project)
        project.materials.add(material)
        repeat(3) { i ->
            project.images.add(ProjectImage(id = i + 1L, storedName = "http://m$i", originalName = "m$i.jpg", section = "material", materialId = 5L, isMain = i == 0, project = project))
        }
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "extra.jpg", fileUrl = "http://extra", materialId = 5L)
        assertThrows<BadRequestException> { service.registerMaterialImage(PROJECT_ID, req, USER_ID) }
    }

    @Test
    fun `registerMaterialImage sets first image for a material as main`() {
        val project = makeProject()
        val material = Material(id = 5L, name = "Yarn", type = "YARN", project = project)
        project.materials.add(material)
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "first.jpg", fileUrl = "http://first", materialId = 5L)
        val dto = service.registerMaterialImage(PROJECT_ID, req, USER_ID)

        val matImages = dto.materials.find { it.id == 5L }!!.images
        assertTrue(matImages.single().isMain)
    }

    @Test
    fun `registerMaterialImage does not set second material image as main`() {
        val project = makeProject()
        val material = Material(id = 5L, name = "Yarn", type = "YARN", project = project)
        project.materials.add(material)
        project.images.add(ProjectImage(id = 1L, storedName = "http://first", originalName = "first.jpg", section = "material", materialId = 5L, isMain = true, project = project))
        stubFindProject(project)

        val req = RegisterProjectImageRequest(originalName = "second.jpg", fileUrl = "http://second", materialId = 5L)
        val dto = service.registerMaterialImage(PROJECT_ID, req, USER_ID)

        val matImages = dto.materials.find { it.id == 5L }!!.images
        val second = matImages.find { it.storedName == "http://second" }!!
        assertFalse(second.isMain)
    }

    // ──────── setMaterialImageMain ────────

    @Test
    fun `setMaterialImageMain sets target as main and clears others for the same material`() {
        val project = makeProject()
        project.images.add(ProjectImage(id = 1L, storedName = "http://a", originalName = "a.jpg", section = "material", materialId = 5L, isMain = true, project = project))
        project.images.add(ProjectImage(id = 2L, storedName = "http://b", originalName = "b.jpg", section = "material", materialId = 5L, isMain = false, project = project))
        stubFindProject(project)

        service.setMaterialImageMain(PROJECT_ID, 2L, USER_ID)

        assertFalse(project.images.find { it.id == 1L }!!.isMain)
        assertTrue(project.images.find { it.id == 2L }!!.isMain)
    }

    // ──────── deleteMaterialImage ────────

    @Test
    fun `deleteMaterialImage promotes next image as main when the main is deleted`() {
        val project = makeProject()
        project.images.add(ProjectImage(id = 1L, storedName = "http://a", originalName = "a.jpg", section = "material", materialId = 5L, isMain = true, project = project))
        project.images.add(ProjectImage(id = 2L, storedName = "http://b", originalName = "b.jpg", section = "material", materialId = 5L, isMain = false, project = project))
        stubFindProject(project)

        service.deleteMaterialImage(PROJECT_ID, 1L, USER_ID)

        val remaining = project.images.filter { it.section == "material" && it.materialId == 5L }
        assertEquals(1, remaining.size)
        assertTrue(remaining.single().isMain)
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

        // Blanks filtered, max 3 kept
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
}
