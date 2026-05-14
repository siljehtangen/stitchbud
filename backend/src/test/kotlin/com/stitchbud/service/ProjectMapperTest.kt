package com.stitchbud.service

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.stitchbud.model.*
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ProjectMapperTest {

    private val mapper = ProjectMapper(jacksonObjectMapper())

    private fun makeProject(
        id: Long = 1L,
        name: String = "Test",
        category: ProjectCategory = ProjectCategory.KNITTING,
    ) = Project(id = id, name = name, category = category)

    private fun coverImage(id: Long, storedName: String, isMain: Boolean = false, projectId: Long = 1L) =
        ProjectImage(id = id, storedName = storedName, originalName = "img.jpg",
            section = ProjectImage.COVER, isMain = isMain)

    private fun materialImage(id: Long, storedName: String, materialId: Long, isMain: Boolean = false) =
        ProjectImage(id = id, storedName = storedName, originalName = "img.jpg",
            section = ProjectImage.MATERIAL, materialId = materialId, isMain = isMain)

    // ──────── basic mapping ────────

    @Test
    fun `toDto maps scalar fields correctly`() {
        val project = makeProject(id = 7L, name = "Scarf", category = ProjectCategory.CROCHET).apply {
            description = "A nice scarf"
            tags = "warm,winter"
            recipeText = "Cast on 20 sts"
            notes = "Be careful with tension"
            craftDetails = """{"needleSize": "4mm"}"""
            isPublic = true
            startDate = 1000L
            endDate = 2000L
            createdAt = 100L
            updatedAt = 200L
            userId = "user-1"
        }

        val dto = mapper.toDto(project)

        assertEquals(7L, dto.id)
        assertEquals("Scarf", dto.name)
        assertEquals(ProjectCategory.CROCHET, dto.category)
        assertEquals("A nice scarf", dto.description)
        assertEquals("warm,winter", dto.tags)
        assertEquals("Cast on 20 sts", dto.recipeText)
        assertEquals("Be careful with tension", dto.notes)
        assertEquals("""{"needleSize": "4mm"}""", dto.craftDetails)
        assertEquals(true, dto.isPublic)
        assertEquals(1000L, dto.startDate)
        assertEquals(2000L, dto.endDate)
        assertEquals(100L, dto.createdAt)
        assertEquals(200L, dto.updatedAt)
        assertEquals("user-1", dto.userId)
    }

    // ──────── includeNotes ────────

    @Test
    fun `toDto includes notes by default`() {
        val project = makeProject().apply { notes = "Secret technique" }
        val dto = mapper.toDto(project)
        assertEquals("Secret technique", dto.notes)
    }

    @Test
    fun `toDto strips notes when includeNotes is false`() {
        val project = makeProject().apply { notes = "Secret technique" }
        val dto = mapper.toDto(project, includeNotes = false)
        assertEquals("", dto.notes)
    }

    // ──────── pinterestBoardUrls ────────

    @Test
    fun `toDto parses pinterestBoardUrls from JSON array`() {
        val project = makeProject().apply {
            pinterestBoardUrls = """["http://pin1","http://pin2"]"""
        }
        val dto = mapper.toDto(project)
        assertEquals(listOf("http://pin1", "http://pin2"), dto.pinterestBoardUrls)
    }

    @Test
    fun `toDto returns empty list for malformed pinterestBoardUrls JSON`() {
        val project = makeProject().apply { pinterestBoardUrls = "not-json" }
        val dto = mapper.toDto(project)
        assertTrue(dto.pinterestBoardUrls.isEmpty())
    }

    @Test
    fun `toDto returns empty list for empty pinterestBoardUrls string`() {
        val project = makeProject().apply { pinterestBoardUrls = "[]" }
        val dto = mapper.toDto(project)
        assertTrue(dto.pinterestBoardUrls.isEmpty())
    }

    // ──────── cover images ────────

    @Test
    fun `toDto only maps cover section images to coverImages`() {
        val project = makeProject(id = 1L)
        val mat = Material(id = 10L, name = "Wool", type = "yarn").also { project.materials.add(it) }
        project.images.addAll(listOf(
            coverImage(id = 1L, storedName = "cover.jpg"),
            materialImage(id = 2L, storedName = "mat.jpg", materialId = 10L),
        ))

        val dto = mapper.toDto(project)

        assertEquals(1, dto.coverImages.size)
        assertEquals("cover.jpg", dto.coverImages[0].storedName)
        assertEquals(ProjectImage.COVER, dto.coverImages[0].section)
    }

    @Test
    fun `toDto sorts cover images by id ascending`() {
        val project = makeProject(id = 1L)
        project.images.addAll(listOf(
            coverImage(id = 5L, storedName = "c5.jpg"),
            coverImage(id = 2L, storedName = "c2.jpg"),
            coverImage(id = 8L, storedName = "c8.jpg"),
        ))

        val dto = mapper.toDto(project)

        assertEquals(listOf(2L, 5L, 8L), dto.coverImages.map { it.id })
    }

    @Test
    fun `toDto sets projectId on cover image dto`() {
        val project = makeProject(id = 42L)
        project.images.add(coverImage(id = 1L, storedName = "x.jpg"))

        val dto = mapper.toDto(project)

        assertEquals(42L, dto.coverImages[0].projectId)
    }

    // ──────── material images ────────

    @Test
    fun `toDto assigns material images only to the correct material`() {
        val project = makeProject(id = 1L)
        val mat1 = Material(id = 1L, name = "Wool", type = "yarn").also { project.materials.add(it) }
        val mat2 = Material(id = 2L, name = "Silk", type = "yarn").also { project.materials.add(it) }
        project.images.addAll(listOf(
            materialImage(id = 10L, storedName = "wool.jpg", materialId = 1L),
            materialImage(id = 11L, storedName = "silk.jpg", materialId = 2L),
        ))

        val dto = mapper.toDto(project)

        assertEquals(1, dto.materials[0].images.size)
        assertEquals("wool.jpg", dto.materials[0].images[0].storedName)
        assertEquals(1, dto.materials[1].images.size)
        assertEquals("silk.jpg", dto.materials[1].images[0].storedName)
    }

    @Test
    fun `toDto sorts material images by id within each material`() {
        val project = makeProject(id = 1L)
        val mat = Material(id = 1L, name = "Wool", type = "yarn").also { project.materials.add(it) }
        project.images.addAll(listOf(
            materialImage(id = 30L, storedName = "c.jpg", materialId = 1L),
            materialImage(id = 10L, storedName = "a.jpg", materialId = 1L),
            materialImage(id = 20L, storedName = "b.jpg", materialId = 1L),
        ))

        val dto = mapper.toDto(project)

        assertEquals(listOf(10L, 20L, 30L), dto.materials[0].images.map { it.id })
    }

    @Test
    fun `toDto gives material with no images an empty image list`() {
        val project = makeProject(id = 1L)
        project.materials.add(Material(id = 1L, name = "Wool", type = "yarn"))

        val dto = mapper.toDto(project)

        assertTrue(dto.materials[0].images.isEmpty())
    }

    // ──────── row counter ────────

    @Test
    fun `toDto maps rowCounter when present`() {
        val project = makeProject().apply {
            rowCounter = RowCounter(id = 5L, stitchesPerRound = 8, totalRounds = 20,
                checkedStitches = "[1,2]", project = this)
        }

        val dto = mapper.toDto(project)

        assertEquals(5L, dto.rowCounter?.id)
        assertEquals(8, dto.rowCounter?.stitchesPerRound)
        assertEquals(20, dto.rowCounter?.totalRounds)
        assertEquals("[1,2]", dto.rowCounter?.checkedStitches)
    }

    @Test
    fun `toDto maps rowCounter as null when absent`() {
        val project = makeProject()
        val dto = mapper.toDto(project)
        assertNull(dto.rowCounter)
    }

    // ──────── pattern grids ────────

    @Test
    fun `toDto sorts pattern grids by id ascending`() {
        val project = makeProject()
        project.patternGrids.addAll(listOf(
            PatternGrid(id = 3L, project = project),
            PatternGrid(id = 1L, project = project),
            PatternGrid(id = 2L, project = project),
        ))

        val dto = mapper.toDto(project)

        assertEquals(listOf(1L, 2L, 3L), dto.patternGrids.map { it.id })
    }

    // ──────── files ────────

    @Test
    fun `toDto maps files with correct projectId`() {
        val project = makeProject(id = 99L)
        project.files.add(ProjectFile(id = 1L, originalName = "recipe.pdf",
            storedName = "stored.pdf", mimeType = "application/pdf",
            fileType = "pdf", uploadedAt = 12345L, project = project))

        val dto = mapper.toDto(project)

        assertEquals(1, dto.files.size)
        assertEquals("recipe.pdf", dto.files[0].originalName)
        assertEquals(99L, dto.files[0].projectId)
    }
}
