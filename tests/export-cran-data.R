source("scripts/export-cran-data.R")

metadata <- matrix(
  c(
    "termr", "1.0", "TermR title", "A complete package description.", NA,
    "termr", "1.0", "TermR title", "Compatibility variant that must be skipped.", "4.7.0/Recommended"
  ),
  nrow = 2L,
  byrow = TRUE,
  dimnames = list(NULL, c("Package", "Version", "Title", "Description", "Path"))
)

input <- tempfile(fileext = ".rds")
output <- tempfile(fileext = ".dcf")
saveRDS(metadata, input)
count <- export_cran_data(input, output, minimum = 1L)
result <- read.dcf(output)

stopifnot(
  identical(count, 1L),
  nrow(result) == 1L,
  result[1L, "Package"] == "termr",
  result[1L, "Title"] == "TermR title",
  result[1L, "Description"] == "A complete package description."
)
unlink(c(input, output))

cat("CRAN RDS export check passed.\n")
