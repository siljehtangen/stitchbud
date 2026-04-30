package com.stitchbud.service

import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.CreateLibraryItemRequest
import com.stitchbud.dto.UpdateLibraryItemRequest
import com.stitchbud.model.LibraryItem
import com.stitchbud.model.LibraryItemImage
import com.stitchbud.model.LibraryItemType
import com.stitchbud.repository.LibraryItemImageRepository
import com.stitchbud.repository.LibraryItemRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class LibraryCrudServiceTest {

    private val libraryItemRepo: LibraryItemRepository = mock()
    private val libraryItemImageRepo: LibraryItemImageRepository = mock()
    private val storageService: SupabaseStorageService = mock()

    private lateinit var service: LibraryService

    companion object {
        const val USER_ID = "user-1"
        const val ITEM_ID = 10L
    }

    @BeforeEach
    fun setUp() {
        service = LibraryService(
            libraryItemRepository = libraryItemRepo,
            libraryItemImageRepository = libraryItemImageRepo,
            storageService = storageService,
            uploadDir = "/tmp/test-uploads"
        )
    }

    private fun makeItem(id: Long = ITEM_ID, userId: String = USER_ID) = LibraryItem(
        id = id, userId = userId, itemType = LibraryItemType.YARN, name = "Test Yarn"
    )

    private fun stubFindItem(item: LibraryItem) {
        whenever(libraryItemRepo.findByIdAndUserId(item.id, item.userId)).thenReturn(item)
        whenever(libraryItemRepo.save(any<LibraryItem>())).doAnswer { it.arguments[0] as LibraryItem }
    }

    // ──────── getAll ────────

    @Test
    fun `getAll returns empty list when user has no items`() {
        whenever(libraryItemRepo.findByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(emptyList())

        assertTrue(service.getAll(USER_ID).isEmpty())
    }

    @Test
    fun `getAll returns mapped DTOs for user items`() {
        val item1 = LibraryItem(id = 1L, userId = USER_ID, itemType = LibraryItemType.YARN, name = "Merino")
        val item2 = LibraryItem(id = 2L, userId = USER_ID, itemType = LibraryItemType.KNITTING_NEEDLE, name = "5mm needle")
        whenever(libraryItemRepo.findByUserIdOrderByCreatedAtDesc(USER_ID)).thenReturn(listOf(item1, item2))

        val result = service.getAll(USER_ID)

        assertEquals(2, result.size)
        assertEquals("Merino", result[0].name)
        assertEquals("5mm needle", result[1].name)
    }

    // ──────── create ────────

    @Test
    fun `create joins colors list with comma separator`() {
        val req = CreateLibraryItemRequest(itemType = LibraryItemType.YARN, name = "Rainbow Yarn", colors = listOf("red", "blue", "green"))
        whenever(libraryItemRepo.save(any<LibraryItem>())).thenReturn(
            LibraryItem(id = 1L, userId = USER_ID, itemType = LibraryItemType.YARN, name = "Rainbow Yarn", colors = listOf("red", "blue", "green"))
        )

        assertEquals(listOf("red", "blue", "green"), service.create(req, USER_ID).colors)
    }

    @Test
    fun `create handles empty colors gracefully`() {
        val req = CreateLibraryItemRequest(itemType = LibraryItemType.KNITTING_NEEDLE, name = "5mm Needle")
        whenever(libraryItemRepo.save(any<LibraryItem>())).thenReturn(
            LibraryItem(id = 2L, userId = USER_ID, itemType = LibraryItemType.KNITTING_NEEDLE, name = "5mm Needle")
        )

        assertEquals(emptyList(), service.create(req, USER_ID).colors)
    }

    // ──────── update ────────

    @Test
    fun `update only changes the fields that are provided`() {
        val item = makeItem().also { it.yarnMaterial = "wool"; it.yarnBrand = "Drops" }
        stubFindItem(item)

        service.update(ITEM_ID, UpdateLibraryItemRequest(name = "New Name"), USER_ID)

        assertEquals("New Name", item.name)
        assertEquals("wool", item.yarnMaterial)
        assertEquals("Drops", item.yarnBrand)
    }

    @Test
    fun `update converts colors list`() {
        val item = makeItem()
        stubFindItem(item)

        service.update(ITEM_ID, UpdateLibraryItemRequest(colors = listOf("pink", "purple")), USER_ID)

        assertEquals(listOf("pink", "purple"), item.colors)
    }

    @Test
    fun `update throws NotFoundException when item belongs to different user`() {
        whenever(libraryItemRepo.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(null)

        assertThrows<NotFoundException> { service.update(ITEM_ID, UpdateLibraryItemRequest(name = "Hack"), USER_ID) }
    }

    // ──────── delete ────────

    @Test
    fun `delete throws NotFoundException when item does not exist`() {
        whenever(libraryItemRepo.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(null)

        assertThrows<NotFoundException> { service.delete(ITEM_ID, USER_ID) }
    }

    @Test
    fun `delete calls deleteById when item exists`() {
        stubFindItem(makeItem())

        service.delete(ITEM_ID, USER_ID)

        verify(libraryItemRepo).deleteById(ITEM_ID)
    }

    @Test
    fun `delete calls storageService for http-stored images before deleting`() {
        val item = makeItem()
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://storage/img.jpg", originalName = "img.jpg", isMain = true, libraryItem = item))
        stubFindItem(item)

        service.delete(ITEM_ID, USER_ID)

        verify(storageService).deleteByUrl("http://storage/img.jpg")
        verify(libraryItemRepo).deleteById(ITEM_ID)
    }

    // ──────── deleteAllForUser ────────

    @Test
    fun `deleteAllForUser calls both repo delete methods`() {
        whenever(libraryItemRepo.findByUserId(USER_ID)).thenReturn(emptyList())

        service.deleteAllForUser(USER_ID)

        verify(libraryItemImageRepo).deleteAllByLibraryItemUserId(USER_ID)
        verify(libraryItemRepo).deleteAllByUserId(USER_ID)
    }

    @Test
    fun `deleteAllForUser calls storageService for each http-stored image`() {
        val item = makeItem()
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://storage/img.jpg", originalName = "img.jpg", isMain = true, libraryItem = item))
        whenever(libraryItemRepo.findByUserId(USER_ID)).thenReturn(listOf(item))

        service.deleteAllForUser(USER_ID)

        verify(storageService).deleteByUrl("http://storage/img.jpg")
    }
}
