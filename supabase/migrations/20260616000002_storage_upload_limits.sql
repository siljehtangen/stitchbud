-- Enforce upload size/type at the storage layer. The `accept` attributes in the
-- React UI are client-only hints; without these any authenticated user could
-- upload arbitrarily large files of any type straight to the bucket.
--
-- file_size_limit matches MAX_UPLOAD_BYTES in frontend/src/api/client.ts (25 MB).
-- allowed_mime_types covers images plus the document types used for patterns.
-- octet-stream is included because some browsers report it for .doc/.docx; the
-- size limit still bounds those uploads.

update storage.buckets
set file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = array[
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream'
    ]
where id = 'stitchbud-files';
