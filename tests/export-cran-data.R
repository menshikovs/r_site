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

metadata <- cbind(metadata,
  Author = rep("I\u00f1aki Ucar, Gin\u00e9-V\u00e1zquez, \u017dlu\u0165ou\u010dk\u00fd", 2L),
  "Authors@R" = rep('person("I\u00f1aki", "Ucar", role = "aut")', 2L),
  Enhances = rep("safePkg", 2L), Priority = rep("recommended", 2L),
  Contact = rep("Example team", 2L), DOI = rep("10.32614/CRAN.package.termr", 2L),
  OS_type = rep("unix", 2L), Archs = rep("x64", 2L),
  Additional_repositories = rep("https://example.org/repo", 2L)
)
reverse_fields <- c('Reverse depends','Reverse imports','Reverse linking to','Reverse suggests','Reverse enhances')
for (field in reverse_fields) metadata <- cbind(metadata, setNames(data.frame(rep(NA_character_,2L)),field)) |> as.matrix()
metadata[1L,'Reverse depends'] <- 'safePkg, ForeignPkg'

input <- tempfile(fileext = ".rds")
output <- tempfile(fileext = ".dcf")
saveRDS(metadata, input)
count <- export_cran_data(input, output, minimum = 1L)
result <- read.dcf(output)
output_text <- paste(readLines(output, encoding = "UTF-8"), collapse = "\n")

stopifnot(
  identical(count, 1L),
  nrow(result) == 1L,
  result[1L, "Package"] == "termr",
  result[1L, "Title"] == "TermR title",
  result[1L, "Description"] == "A complete package description.",
  result[1L, "Enhances"] == "safePkg",
  result[1L, "Priority"] == "recommended",
  result[1L, "Contact"] == "Example team",
  result[1L, "DOI"] == "10.32614/CRAN.package.termr",
  result[1L, "OS_type"] == "unix",
  result[1L, "Archs"] == "x64",
  result[1L, "Additional_repositories"] == "https://example.org/repo",
  grepl(enc2utf8("I\u00f1aki Ucar"), output_text, fixed=TRUE, useBytes=TRUE),
  grepl(enc2utf8("\u017dlu\u0165ou\u010dk\u00fd"), output_text, fixed=TRUE, useBytes=TRUE),
  !grepl("<U+", output_text, fixed=TRUE)
)
stopifnot(all(reverse_fields %in% colnames(result)), result[1L,'Reverse depends']=='safePkg, ForeignPkg')
for (field in reverse_fields[-1L]) stopifnot(grepl(paste0(field,':'),output_text,fixed=TRUE))
previous_output <- readBin(output,'raw',n=file.info(output)$size)
saveRDS(metadata[,colnames(metadata)!='Reverse imports',drop=FALSE],input)
failure <- tryCatch({export_cran_data(input,output,minimum=1L);FALSE},error=function(e)grepl('reverse dependency columns',conditionMessage(e),fixed=TRUE))
stopifnot(failure,identical(previous_output,readBin(output,'raw',n=file.info(output)$size)))
unlink(c(input, output))

cat("CRAN RDS export check passed.\n")
