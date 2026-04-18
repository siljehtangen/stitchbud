package com.stitchbud.service

import com.stitchbud.controller.BadRequestException
import com.stitchbud.controller.NotFoundException
import com.stitchbud.dto.CreateLibraryItemRequest
import com.stitchbud.dto.RegisterLibraryImageRequest
import com.stitchbud.dto.UpdateLibraryItemRequest
import com.stitchbud.model.LibraryItem
import com.stitchbud.model.LibraryItemImage
import com.stitchbud.repository.LibraryItemImageRepository
import com.stitchbud.repository.LibraryItemRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LibraryServiceTest {

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
        id = id,
        userId = userId,
        itemType = "YARN",
        name = "Test Yarn"
    )

    /** Stubs findByIdAndUserId and save so the item is returned as-is. */
    private fun stubFindItem(item: LibraryItem) {
        whenever(libraryItemRepo.findByIdAndUserId(item.id, item.userId)).thenReturn(Optional.of(item))
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

        val req = RegisterLibraryImageRequest(originalName = "extra.jpg", fileUrl = "http://extra")
        assertThrows<BadRequestException> { service.registerLibraryImage(ITEM_ID, req, USER_ID) }
    }

    @Test
    fun `registerLibraryImage sets first image as main`() {
        val item = makeItem()
        stubFindItem(item)

        val req = RegisterLibraryImageRequest(originalName = "first.jpg", fileUrl = "http://first")
        val dto = service.registerLibraryImage(ITEM_ID, req, USER_ID)

        assertTrue(dto.images.single().isMain)
    }

    @Test
    fun `registerLibraryImage does not set second image as main`() {
        val item = makeItem()
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://existing", originalName = "existing.jpg", isMain = true, libraryItem = item))
        stubFindItem(item)

        val req = RegisterLibraryImageRequest(originalName = "second.jpg", fileUrl = "http://second")
        val dto = service.registerLibraryImage(ITEM_ID, req, USER_ID)

        val second = dto.images.find { it.storedName == "http://second" }!!
        assertFalse(second.isMain)
    }

    @Test
    fun `registerLibraryImage migrates legacy imageStoredName before adding new image`() {
        val item = makeItem().also { it.imageStoredName = "legacy.jpg" }
        // No images list yet, but legacy field is set
        stubFindItem(item)

        val req = RegisterLibraryImageRequest(originalName = "new.jpg", fileUrl = "http://new")
        val dto = service.registerLibraryImage(ITEM_ID, req, USER_ID)

        // Should have 2 images: the migrated legacy + the new one
        assertEquals(2, dto.images.size)
        assertTrue(dto.images.any { it.storedName == "/api/library-images/legacy.jpg" })
    }

    @Test
    fun `registerLibraryImage does not migrate when images list is already populated`() {
        val item = makeItem().also { it.imageStoredName = "legacy.jpg" }
        item.images.add(LibraryItemImage(id = 1L, storedName = "http://existing", originalName = "existing.jpg", isMain = true, libraryItem = item))
        stubFindItem(item)

        val req = RegisterLibraryImageRequest(originalName = "new.jpg", fileUrl = "http://new")
        val dto = service.registerLibraryImage(ITEM_ID, req, USER_ID)

        // Legacy should NOT be migrated again; only existing + new = 2
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

    // ──────── create ────────

    @Test
    fun `create joins colors list with comma separator`() {
        val req = CreateLibraryItemRequest(itemType = "YARN", name = "Rainbow Yarn", colors = listOf("red", "blue", "green"))
        val saved = LibraryItem(id = 1L, userId = USER_ID, itemType = "YARN", name = "Rainbow Yarn", colors = "red,blue,green")
        whenever(libraryItemRepo.save(any<LibraryItem>())).thenReturn(saved)

        val dto = service.create(req, USER_ID)

        assertEquals(listOf("red", "blue", "green"), dto.colors)
    }

    @Test
    fun `create handles null colors gracefully`() {
        val req = CreateLibraryItemRequest(itemType = "NEEDLE", name = "5mm Needle", colors = null)
        val saved = LibraryItem(id = 2L, userId = USER_ID, itemType = "NEEDLE", name = "5mm Needle", colors = null)
        whenever(libraryItemRepo.save(any<LibraryItem>())).thenReturn(saved)

        val dto = service.create(req, USER_ID)

        assertEquals(emptyList(), dto.colors)
    }

    // ──────── update ────────

    @Test
    fun `update only changes the fields that are provided`() {
        val item = makeItem().also {
            it.yarnMaterial = "wool"
            it.yarnBrand = "Drops"
        }
        stubFindItem(item)

        service.update(ITEM_ID, UpdateLibraryItemRequest(name = "New Name"), USER_ID)

        assertEquals("New Name", item.name)
        assertEquals("wool", item.yarnMaterial)  // untouched
        assertEquals("Drops", item.yarnBrand)    // untouched
    }

    @Test
    fun `update converts colors list to comma-separated string`() {
        val item = makeItem()
        stubFindItem(item)

        service.update(ITEM_ID, UpdateLibraryItemRequest(colors = listOf("pink", "purple")), USER_ID)

        assertEquals("pink,purple", item.colors)
    }

    // ──────── findItem – ownership check ────────

    @Test
    fun `getAll throws NotFoundException when item belongs to different user`() {
        whenever(libraryItemRepo.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> {
            service.update(ITEM_ID, UpdateLibraryItemRequest(name = "Hack"), USER_ID)
        }
    }

    // ──────── delete ────────

    @Test
    fun `delete throws NotFoundException when item does not exist`() {
        whenever(libraryItemRepo.findByIdAndUserId(ITEM_ID, USER_ID)).thenReturn(Optional.empty())

        assertThrows<NotFoundException> { service.delete(ITEM_ID, USER_ID) }
    }

    @Test
    fun `delete calls deleteById when item exists`() {
        val item = makeItem()
        stubFindItem(item)

        service.delete(ITEM_ID, USER_ID)

        verify(libraryItemRepo).deleteById(ITEM_ID)
    }
}
