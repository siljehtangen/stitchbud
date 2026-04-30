package com.stitchbud.service

import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.RegisterLibraryImageRequest
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
import org.mockito.kotlin.whenever
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LibraryImageServiceTest {

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

    // ──────── registerLibraryImage ────────

    @Test
    fun `registerLibraryImage throws BadRequest when max 3 images already reached`() {
        val item = makeItem()
        repeat(3) { i ->
            item.images.add(LibraryItemImage(id = i + 1L, storedName = "http://url$i", originalName = "img$i.jpg", isMain = i == 0, libraryItem = item))
        }
        stubFindItem(item)

        assertThrows<BadRequestException> { service.registerLibraryImage(ITEM_ID, RegisterLibraryImageRequest(originalName = "extra.jpg", fileUrl = "http://extra"), USER_ID) }
    }

    @Test
    fun `registerLibraryImage sets first image as main`() {
        val item = makeItem()
        stubFindItem(item)

        val dto = service.registerLibraryImage(ITEM_ID, RegisterLibraryImageRequest(originalName = "first.jpg", fileUrl = "http://first"), USER_ID)

        assertTrue(dto.images.single().isMain)
    }

    @Test
    fun `registerLibraryImage does not set second image as main`() {
        val item = makeItem()
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://existing", originalName = "existing.jpg", isMain = true, libraryItem = item))
        stubFindItem(item)

        val dto = service.registerLibraryImage(ITEM_ID, RegisterLibraryImageRequest(originalName = "second.jpg", fileUrl = "http://second"), USER_ID)

        assertFalse(dto.images.find { it.storedName == "http://second" }!!.isMain)
    }

    @Test
    fun `registerLibraryImage migrates legacy imageStoredName before adding new image`() {
        val item = makeItem().also { it.imageStoredName = "legacy.jpg" }
        stubFindItem(item)

        val dto = service.registerLibraryImage(ITEM_ID, RegisterLibraryImageRequest(originalName = "new.jpg", fileUrl = "http://new"), USER_ID)

        assertEquals(2, dto.images.size)
        assertTrue(dto.images.any { it.storedName == "/api/library-images/legacy.jpg" })
    }

    @Test
    fun `registerLibraryImage does not migrate when images list is already populated`() {
        val item = makeItem().also { it.imageStoredName = "legacy.jpg" }
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://existing", originalName = "existing.jpg", isMain = true, libraryItem = item))
        stubFindItem(item)

        val dto = service.registerLibraryImage(ITEM_ID, RegisterLibraryImageRequest(originalName = "new.jpg", fileUrl = "http://new"), USER_ID)

        assertEquals(2, dto.images.size)
        assertFalse(dto.images.any { it.storedName == "/api/library-images/legacy.jpg" })
    }

    // ──────── setLibraryImageMain ────────

    @Test
    fun `setLibraryImageMain sets target as main and clears all others`() {
        val item = makeItem()
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://a", originalName = "a.jpg", isMain = true, libraryItem = item))
        item.images.add(LibraryItemImage(id = 2L, storedName = "http://b", originalName = "b.jpg", isMain = false, libraryItem = item))
        stubFindItem(item)

        service.setLibraryImageMain(ITEM_ID, 2L, USER_ID)

        assertFalse(item.images.find { it.id == 1L }!!.isMain)
        assertTrue(item.images.find { it.id == 2L }!!.isMain)
    }

    @Test
    fun `setLibraryImageMain throws NotFoundException when image not found`() {
        val item = makeItem()
        stubFindItem(item)

        assertThrows<NotFoundException> { service.setLibraryImageMain(ITEM_ID, 999L, USER_ID) }
    }

    // ──────── deleteLibraryImage ────────

    @Test
    fun `deleteLibraryImage promotes next image as main when the main image is deleted`() {
        val item = makeItem()
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://a", originalName = "a.jpg", isMain = true, libraryItem = item))
        item.images.add(LibraryItemImage(id = 2L, storedName = "http://b", originalName = "b.jpg", isMain = false, libraryItem = item))
        stubFindItem(item)

        service.deleteLibraryImage(ITEM_ID, 1L, USER_ID)

        assertEquals(1, item.images.size)
        assertTrue(item.images.single().isMain)
        assertEquals(2L, item.images.single().id)
    }

    @Test
    fun `deleteLibraryImage does not change main when a non-main image is deleted`() {
        val item = makeItem()
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://a", originalName = "a.jpg", isMain = true, libraryItem = item))
        item.images.add(LibraryItemImage(id = 2L, storedName = "http://b", originalName = "b.jpg", isMain = false, libraryItem = item))
        stubFindItem(item)

        service.deleteLibraryImage(ITEM_ID, 2L, USER_ID)

        assertEquals(1, item.images.size)
        assertTrue(item.images.single().isMain)
        assertEquals(1L, item.images.single().id)
    }

    @Test
    fun `deleteLibraryImage throws NotFoundException when image not found`() {
        val item = makeItem()
        stubFindItem(item)

        assertThrows<NotFoundException> { service.deleteLibraryImage(ITEM_ID, 999L, USER_ID) }
    }
}
