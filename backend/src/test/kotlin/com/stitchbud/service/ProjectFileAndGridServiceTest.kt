package com.stitchbud.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.AddMaterialRequest
import com.stitchbud.dto.RegisterProjectFileRequest
import com.stitchbud.dto.UpdatePatternGridRequest
import com.stitchbud.dto.UpdateRowCounterRequest
import com.stitchbud.model.Material
import com.stitchbud.model.PatternGrid
import com.stitchbud.model.Project
import com.stitchbud.model.ProjectCategory
import com.stitchbud.model.ProjectFile
import com.stitchbud.model.ProjectImage
import com.stitchbud.model.RowCounter
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
import org.mockito.kotlin.whenever
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ProjectFileAndGridServiceTest {

    private val projectRepo: ProjectRepository = mock()
    private val materialRepo: MaterialRepository = mock()
    private val projectFileRepo: ProjectFileRepository = mock()
    private val projectImageRepo: ProjectImageRepository = mock()
    private val patternGridRepo: PatternGridRepository = mock()
    private val rowCounterRepo: RowCounterRepository = mock()
    private val storageService: SupabaseStorageService = mock()
    private val libraryService: LibraryService = mock()

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
            objectMapper = jacksonObjectMapper(),
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

        service.updatePatternGrid(PROJECT_ID, 10L, UpdatePatternGridRequest(rows = 1, cols = 1, cellData = "[]"), USER_ID)

        assertEquals(1, grid.rows)
        assertEquals(1, grid.cols)
    }

    @Test
    fun `updatePatternGrid accepts boundary value of 200`() {
        val project = makeProject()
        val grid = PatternGrid(id = 10L, project = project)
        project.patternGrids.add(grid)
        stubFindProject(project)

        service.updatePatternGrid(PROJECT_ID, 10L, UpdatePatternGridRequest(rows = 200, cols = 200, cellData = "{}"), USER_ID)

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

    // ──────── createPatternGrid ────────

    @Test
    fun `createPatternGrid adds a new grid to the project`() {
        val project = makeProject()
        stubFindProject(project)

        assertEquals(1, service.createPatternGrid(PROJECT_ID, USER_ID).patternGrids.size)
    }

    // ──────── deletePatternGrid ────────

    @Test
    fun `deletePatternGrid removes the grid from the project`() {
        val project = makeProject()
        project.patternGrids.add(PatternGrid(id = 42L, project = project))
        stubFindProject(project)

        assertTrue(service.deletePatternGrid(PROJECT_ID, 42L, USER_ID).patternGrids.none { it.id == 42L })
    }

    // ──────── addMaterial ────────

    @Test
    fun `addMaterial adds a material to the project`() {
        val project = makeProject()
        stubFindProject(project)

        val dto = service.addMaterial(PROJECT_ID, AddMaterialRequest(name = "Merino Wool", type = "YARN"), USER_ID)

        assertEquals(1, dto.materials.size)
        assertEquals("Merino Wool", dto.materials.single().name)
        assertEquals("YARN", dto.materials.single().type)
    }

    // ──────── deleteMaterial ────────

    @Test
    fun `deleteMaterial removes the material and its images from the project`() {
        val project = makeProject()
        val material = Material(id = 7L, name = "Yarn", type = "YARN", project = project)
        project.materials.add(material)
        project.images.add(ProjectImage(id = 1L, storedName = "http://img", originalName = "img.jpg", section = "material", materialId = 7L, isMain = true, project = project))
        project.images.add(ProjectImage(id = 2L, storedName = "http://cover", originalName = "cover.jpg", section = "cover", isMain = true, project = project))
        stubFindProject(project)

        val dto = service.deleteMaterial(PROJECT_ID, 7L, USER_ID)

        assertTrue(dto.materials.isEmpty())
        assertEquals(1, dto.coverImages.size)
    }

    // ──────── updateRowCounter ────────

    @Test
    fun `updateRowCounter updates an existing row counter`() {
        val project = makeProject()
        project.rowCounter = RowCounter(id = 1L, stitchesPerRound = 10, totalRounds = 5, checkedStitches = "[]", project = project)
        stubFindProject(project)

        val dto = service.updateRowCounter(PROJECT_ID, UpdateRowCounterRequest(stitchesPerRound = 20, totalRounds = 10, checkedStitches = "[1,2]"), USER_ID)

        assertEquals(20, dto.rowCounter!!.stitchesPerRound)
        assertEquals(10, dto.rowCounter!!.totalRounds)
        assertEquals("[1,2]", dto.rowCounter!!.checkedStitches)
    }

    @Test
    fun `updateRowCounter creates a new row counter when none exists`() {
        val project = makeProject()
        stubFindProject(project)

        val dto = service.updateRowCounter(PROJECT_ID, UpdateRowCounterRequest(stitchesPerRound = 8, totalRounds = 3, checkedStitches = "[]"), USER_ID)

        assertEquals(8, dto.rowCounter!!.stitchesPerRound)
        assertEquals(3, dto.rowCounter!!.totalRounds)
    }

    // ──────── registerFile ────────

    @Test
    fun `registerFile adds file with correct fileType for pdf`() {
        val project = makeProject()
        stubFindProject(project)

        val dto = service.registerFile(PROJECT_ID, RegisterProjectFileRequest(originalName = "pattern.pdf", fileUrl = "http://storage/pattern.pdf", mimeType = "application/pdf"), USER_ID)

        assertEquals("pdf", dto.files.single().fileType)
        assertEquals("pattern.pdf", dto.files.single().originalName)
    }

    @Test
    fun `registerFile adds file with correct fileType for word document`() {
        val project = makeProject()
        stubFindProject(project)

        val dto = service.registerFile(PROJECT_ID, RegisterProjectFileRequest(originalName = "notes.docx", fileUrl = "http://storage/notes.docx", mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), USER_ID)

        assertEquals("word", dto.files.single().fileType)
    }

    @Test
    fun `registerFile adds file with correct fileType for image`() {
        val project = makeProject()
        stubFindProject(project)

        val dto = service.registerFile(PROJECT_ID, RegisterProjectFileRequest(originalName = "photo.jpg", fileUrl = "http://storage/photo.jpg", mimeType = "image/jpeg"), USER_ID)

        assertEquals("image", dto.files.single().fileType)
    }

    @Test
    fun `registerFile adds file with fileType other for unknown mimeType`() {
        val project = makeProject()
        stubFindProject(project)

        val dto = service.registerFile(PROJECT_ID, RegisterProjectFileRequest(originalName = "data.csv", fileUrl = "http://storage/data.csv", mimeType = "text/csv"), USER_ID)

        assertEquals("other", dto.files.single().fileType)
    }

    // ──────── deleteFile ────────

    @Test
    fun `deleteFile throws NotFoundException when file not found`() {
        val project = makeProject()
        stubFindProject(project)

        assertThrows<NotFoundException> { service.deleteFile(PROJECT_ID, 999L, USER_ID) }
    }

    @Test
    fun `deleteFile removes file from project when it exists`() {
        val project = makeProject()
        val pf = ProjectFile(id = 5L, originalName = "notes.pdf", storedName = "http://storage/notes.pdf", mimeType = "application/pdf", fileType = "pdf", project = project)
        project.files.add(pf)
        stubFindProject(project)

        val dto = service.deleteFile(PROJECT_ID, 5L, USER_ID)

        assertTrue(dto.files.none { it.id == 5L })
    }
}
