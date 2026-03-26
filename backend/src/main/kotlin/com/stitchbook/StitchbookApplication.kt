package com.stitchbook

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class StitchbookApplication

fun main(args: Array<String>) {
    runApplication<StitchbookApplication>(*args)
}
