package com.stitchbud.controller

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {
    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    private fun errorResponse(status: HttpStatus, ex: Exception) =
        ResponseEntity.status(status).body(ErrorResponse(ex.message ?: status.reasonPhrase))

    @ExceptionHandler(NotFoundException::class)
    fun handleNotFound(ex: NotFoundException) = errorResponse(HttpStatus.NOT_FOUND, ex)

    @ExceptionHandler(ForbiddenException::class)
    fun handleForbidden(ex: ForbiddenException) = errorResponse(HttpStatus.FORBIDDEN, ex)

    @ExceptionHandler(BadRequestException::class)
    fun handleBadRequest(ex: BadRequestException) = errorResponse(HttpStatus.BAD_REQUEST, ex)

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(ex: IllegalArgumentException) = errorResponse(HttpStatus.BAD_REQUEST, ex)

    @ExceptionHandler(Exception::class)
    fun handleGeneric(ex: Exception): ResponseEntity<ErrorResponse> {
        logger.error("Unhandled exception: ${ex.message}", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorResponse("An unexpected error occurred"))
    }
}

data class ErrorResponse(val message: String)

class NotFoundException(message: String) : RuntimeException(message)
class ForbiddenException(message: String) : RuntimeException(message)
class BadRequestException(message: String) : RuntimeException(message)
