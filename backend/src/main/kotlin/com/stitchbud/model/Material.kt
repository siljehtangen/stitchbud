package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.OnDelete
import org.hibernate.annotations.OnDeleteAction

@Entity
@Table(name = "materials")
class Material(
    var name: String,
    var type: String,
    var itemType: String? = null,
    var color: String = "",
    var colorHex: String = "#000000",
    var amount: String = "",
    var unit: String = "g",
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    var project: Project? = null
) : BaseEntity()
