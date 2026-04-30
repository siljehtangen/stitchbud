package com.stitchbud.util

import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

@Converter
class StringListConverter : AttributeConverter<List<String>, String> {
    override fun convertToDatabaseColumn(list: List<String>?): String =
        list?.filter { it.isNotEmpty() }?.joinToString(",") ?: ""

    override fun convertToEntityAttribute(column: String?): List<String> =
        column?.split(",")?.filter { it.isNotEmpty() } ?: emptyList()
}
