args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 2L) {
  stop("Usage: Rscript fetch-cran-data.R LOCAL_PACKAGES_RDS OUTPUT_DCF")
}

script_arg <- grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)
script_path <- sub("^--file=", "", script_arg[[1L]])
source(file.path(dirname(normalizePath(script_path)), "export-cran-data.R"))
export_cran_data(args[[1L]], args[[2L]])
