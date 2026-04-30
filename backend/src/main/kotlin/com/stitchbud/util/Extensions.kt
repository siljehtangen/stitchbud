package com.stitchbud.util

import org.springframework.security.core.context.SecurityContextHolder

fun <T> java.util.Optional<T>.getOrNull(): T? = orElse(null)

fun currentUserId(): String = SecurityContextHolder.getContext().authentication.name
