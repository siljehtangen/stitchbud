package com.stitchbud.util

import org.junit.jupiter.api.Test
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ExtensionsTest {

    @Test
    fun `getOrNull returns value when Optional is present`() {
        val optional = Optional.of("hello")
        assertEquals("hello", optional.getOrNull())
    }

    @Test
    fun `getOrNull returns null when Optional is empty`() {
        val optional = Optional.empty<String>()
        assertNull(optional.getOrNull())
    }

    @Test
    fun `getOrNull works for non-string types`() {
        val optional = Optional.of(42L)
        assertEquals(42L, optional.getOrNull())
    }
}
