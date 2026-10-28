export_cran_data <- function(input, output, minimum = 1000L) {
  metadata <- readRDS(input)
  if (!is.matrix(metadata) || !("Package" %in% colnames(metadata)) || !("Version" %in% colnames(metadata))) {
    stop("Official CRAN package metadata has an unexpected format.")
  }

  # CRAN includes extra R-version-specific compatibility rows. Keep only the
  # unscoped records so every package appears once in the current catalog.
  path <- metadata[, "Path"]
  current <- is.na(path) | !nzchar(path)
  fields <- c(
    "Package", "Version", "Title", "Description", "Author", "Authors@R",
    "Maintainer", "License", "URL", "BugReports", "Depends", "Imports",
    "Suggests", "LinkingTo", "SystemRequirements", "NeedsCompilation",
    "Published", "Date/Publication", "Keywords"
  )
  fields <- intersect(fields, colnames(metadata))
  current_metadata <- metadata[current, fields, drop = FALSE]
  if (nrow(current_metadata) < minimum) stop("CRAN package metadata is unexpectedly small.")
  write.dcf(current_metadata, file = output)
  invisible(nrow(current_metadata))
}

if (sys.nframe() == 0L) {
  args <- commandArgs(trailingOnly = TRUE)
  if (length(args) != 2L) stop("Usage: Rscript export-cran-data.R INPUT.rds OUTPUT.dcf")
  export_cran_data(args[[1L]], args[[2L]])
}
