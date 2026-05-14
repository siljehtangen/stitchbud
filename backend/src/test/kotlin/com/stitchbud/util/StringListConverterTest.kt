package com.stitchbud.util

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class StringListConverterTest {

    private val converter = StringListConverter()

    // ──────── convertToDatabaseColumn ────────

    @Test
    fun `convertToDatabaseColumn joins list with commas`() {
        val result = converter.convertToDatabaseColumn(listOf("red", "blue", "green"))
        assertEquals("red,blue,green", result)
    }

    @Test
    fun `convertToDatabaseColumn returns empty string for empty list`() {
        val result = converter.convertToDatabaseColumn(emptyList())
        assertEquals("", result)
    }

    @Test
    fun `convertToDatabaseColumn returns empty string for null`() {
        val result = converter.convertToDatabaseColumn(null)
        assertEquals("", result)
    }

    @Test
    fun `convertToDatabaseColumn filters out blank entries`() {
        val result = converter.convertToDatabaseColumn(listOf("red", "", "blue"))
        assertEquals("red,blue", result)
    }

    @Test
    fun `convertToDatabaseColumn with single item has no commas`() {
        val result = converter.convertToDatabaseColumn(listOf("only"))
        assertEquals("only", result)
    }

    // ──────── convertToEntityAttribute ────────

    @Test
    fun `convertToEntityAttribute splits comma-separated string`() {
        val result = converter.convertToEntityAttribute("red,blue,green")
        assertEquals(listOf("red", "blue", "green"), result)
    }

    @Test
    fun `convertToEntityAttribute returns empty list for empty string`() {
        val result = converter.convertToEntityAttribute("")
        assertTrue(result.isEmpty())
    }

    @Test
    fun `convertToEntityAttribute returns empty list for null`() {
        val result = converter.convertToEntityAttribute(null)
        assertTrue(result.isEmpty())
    }

    @Test
    fun `convertToEntityAttribute filters empty segments from double commas`() {
        val result = converter.convertToEntityAttribute("red,,blue")
        assertEquals(listOf("red", "blue"), result)
    }

    @Test
    fun `convertToEntityAttribute with single value returns single-element list`() {
        val result = converter.convertToEntityAttribute("only")
        assertEquals(listOf("only"), result)
    }

    // ──────── round-trip ────────

    @Test
    fun `round-trip preserves list contents`() {
        val original = listOf("cotton", "merino", "acrylic")
        val dbValue = converter.convertToDatabaseColumn(original)
        val restored = converter.convertToEntityAttribute(dbValue)
        assertEquals(original, restored)
    }
}
