package com.stitchbud.model

import jakarta.persistence.*

@Entity
@Table(name = "row_counters")
data class RowCounter(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    var stitchesPerRound: Int = 0,
    var totalRounds: Int = 0,
    @Column(columnDefinition = "TEXT")
    var checkedStitches: String = "[]",
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    var project: Project? = null
)
