package com.stitchbud.repository

import com.stitchbud.model.LibraryItem
import org.springframework.data.jpa.repository.JpaRepository

interface LibraryItemRepository : JpaRepository<LibraryItem, Long> {
    fun findByOrderByCreatedAtDesc(): List<LibraryItem>
}
