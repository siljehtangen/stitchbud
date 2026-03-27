package com.stitchbud.model

import jakarta.persistence.*

@Entity
@Table(name = "pattern_grids")
data class PatternGrid(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var rows: Int = 10,
    var cols: Int = 10,
    @Column(columnDefinition = "TEXT")
    var cellData: String = "[]", // JSON array of {row, col, color, symbol}
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    var project: Project? = null
)
