export_cran_data <- function(input, output, minimum = 1000L) {
  # write.dcf formats Unicode through LC_CTYPE before writing. A UTF-8 file
  # connection alone does not prevent literal <U+...> escapes in the C locale.
  previous_ctype <- Sys.getlocale("LC_CTYPE")
  on.exit(suppressWarnings(Sys.setlocale("LC_CTYPE", previous_ctype)), add = TRUE)
  if (!isTRUE(l10n_info()[["UTF-8"]])) {
    for (candidate in c(".UTF-8", "C.UTF-8", "en_US.UTF-8")) {
      suppressWarnings(Sys.setlocale("LC_CTYPE", candidate))
      if (isTRUE(l10n_info()[["UTF-8"]])) break
    }
  }
  if (!isTRUE(l10n_info()[["UTF-8"]])) stop("A UTF-8 LC_CTYPE locale is required to export CRAN metadata without data loss.")
  metadata <- readRDS(input)
  if (!is.matrix(metadata) || !("Package" %in% colnames(metadata)) || !("Version" %in% colnames(metadata))) {
    stop("Official CRAN package metadata has an unexpected format.")
  }
  reverse_fields <- c("Reverse depends", "Reverse imports", "Reverse linking to", "Reverse suggests", "Reverse enhances")
  if (!all(reverse_fields %in% colnames(metadata))) stop("Official CRAN snapshot is missing required reverse dependency columns.")

  # CRAN includes extra R-version-specific compatibility rows. Keep only the
  # unscoped records so every package appears once in the current catalog.
  path <- metadata[, "Path"]
  current <- is.na(path) | !nzchar(path)
  fields <- c(
    "Package", "Version", "Title", "Description", "Author", "Authors@R",
    "Maintainer", "License", "URL", "BugReports", "Depends", "Imports",
    "Suggests", "LinkingTo", "Enhances", "SystemRequirements", "NeedsCompilation",
    "Published", "Date/Publication", "Keywords", "Priority", "Contact", "DOI",
    "OS_type", "Archs", "Additional_repositories", reverse_fields
  )
  fields <- intersect(fields, colnames(metadata))
  current_metadata <- metadata[current, fields, drop = FALSE]
  # NA is CRAN's empty-list representation in these known columns. Preserve an
  # explicit blank DCF field, so Node can distinguish it from missing metadata.
  for (field in reverse_fields) current_metadata[is.na(current_metadata[, field]), field] <- ""
  if (nrow(current_metadata) < minimum) stop("CRAN package metadata is unexpectedly small.")
  connection <- file(output, open = "wt", encoding = "UTF-8")
  on.exit(close(connection), add = TRUE, after = FALSE)
  write.dcf(current_metadata, file = connection)
  invisible(nrow(current_metadata))
}

if (sys.nframe() == 0L) {
  args <- commandArgs(trailingOnly = TRUE)
  if (length(args) != 2L) stop("Usage: Rscript export-cran-data.R INPUT.rds OUTPUT.dcf")
  export_cran_data(args[[1L]], args[[2L]])
}
