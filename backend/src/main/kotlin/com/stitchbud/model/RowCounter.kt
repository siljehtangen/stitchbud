package com.stitchbud.model

import jakarta.persistence.*
import org.hibernate.annotations.OnDelete
import org.hibernate.annotations.OnDeleteAction

@Entity
@Table(name = "row_counters")
class RowCounter(
    var stitchesPerRound: Int = 0,
    var totalRounds: Int = 0,
    @Column(columnDefinition = "TEXT")
    var checkedStitches: String = "[]",
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    var project: Project? = null
) : BaseEntity()
