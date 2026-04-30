package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.OnDelete
import org.hibernate.annotations.OnDeleteAction

@Entity
@Table(name = "library_item_images")
class LibraryItemImage(
    id: Long = 0,
    var storedName: String = "",
    var originalName: String = "",
    var isMain: Boolean = false,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "library_item_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    var libraryItem: LibraryItem? = null
) : BaseEntity(id)
