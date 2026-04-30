package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.OnDelete
import org.hibernate.annotations.OnDeleteAction

@Entity
@Table(name = "pattern_grids")
class PatternGrid(
    id: Long = 0,
    var rows: Int = 10,
    var cols: Int = 10,
    @Column(columnDefinition = "TEXT")
    var cellData: String = "[]",
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    var project: Project? = null
) : BaseEntity(id)
